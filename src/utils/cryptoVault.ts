/**
 * Cryptographic utility for Safe Folder Vault using Web Crypto API (SubtleCrypto).
 * Provides AES-GCM 256-bit encryption and PBKDF2/SHA-256 key derivation.
 */

const SALT_STORAGE_KEY = 'akash_files_vault_salt';
const HASH_STORAGE_KEY = 'akash_files_vault_pin_hash';

/**
 * Get or generate device-unique cryptographic salt
 */
export function getOrCreateVaultSalt(): Uint8Array {
  const existing = localStorage.getItem(SALT_STORAGE_KEY);
  if (existing) {
    const arr = existing.split(',').map(Number);
    return new Uint8Array(arr);
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(SALT_STORAGE_KEY, Array.from(salt).join(','));
  return salt;
}

/**
 * Compute salted SHA-256 hash for PIN verification
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = getOrCreateVaultSalt();
  const enc = new TextEncoder();
  const pinData = enc.encode(pin);
  const combined = new Uint8Array(salt.length + pinData.length);
  combined.set(salt, 0);
  combined.set(pinData, salt.length);

  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if a PIN is configured
 */
export function hasVaultPin(): boolean {
  return !!localStorage.getItem(HASH_STORAGE_KEY);
}

/**
 * Save new Safe Folder PIN (stored only as salted SHA-256 hash)
 */
export async function saveVaultPin(pin: string): Promise<void> {
  const hash = await hashPin(pin);
  localStorage.setItem(HASH_STORAGE_KEY, hash);
  // Clean up any legacy unencrypted PIN
  localStorage.removeItem('safe_folder_pin');
}

/**
 * Verify user-entered PIN against stored salted hash
 */
export async function verifyVaultPin(enteredPin: string): Promise<boolean> {
  const storedHash = localStorage.getItem(HASH_STORAGE_KEY);
  if (!storedHash) {
    // Check legacy plain pin migration
    const legacyPin = localStorage.getItem('safe_folder_pin');
    if (legacyPin) {
      if (enteredPin === legacyPin) {
        // Automatically upgrade to encrypted hash
        await saveVaultPin(enteredPin);
        return true;
      }
      return false;
    }
    // Default initial PIN fallback if never configured
    return enteredPin === '1234';
  }

  const enteredHash = await hashPin(enteredPin);
  return enteredHash === storedHash;
}

/**
 * Derive an AES-GCM CryptoKey from the PIN using PBKDF2
 */
async function deriveAesKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt plain text / base64 string using AES-GCM
 */
export async function encryptVaultData(
  plainText: string,
  pin: string
): Promise<{ iv: string; data: string }> {
  const salt = getOrCreateVaultSalt();
  const key = await deriveAesKey(pin, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainText)
  );

  const ivString = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const dataString = Array.from(new Uint8Array(encryptedBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return { iv: ivString, data: dataString };
}

/**
 * Decrypt cipher text with PIN
 */
export async function decryptVaultData(
  encrypted: { iv: string; data: string },
  pin: string
): Promise<string | null> {
  try {
    const salt = getOrCreateVaultSalt();
    const key = await deriveAesKey(pin, salt);

    const ivMatches = encrypted.iv.match(/.{1,2}/g);
    const dataMatches = encrypted.data.match(/.{1,2}/g);
    if (!ivMatches || !dataMatches) return null;

    const iv = new Uint8Array(ivMatches.map(byte => parseInt(byte, 16)));
    const data = new Uint8Array(dataMatches.map(byte => parseInt(byte, 16)));

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.warn('Decryption failed, incorrect PIN or corrupted data:', err);
    return null;
  }
}
