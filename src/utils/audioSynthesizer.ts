/**
 * Audio Synthesizer & Fallback Audio Generator
 * Generates rich, relaxing musical audio tracks (WAV Blobs) on the fly.
 * Ensures the HTML <audio> element always has a real, playable sound stream,
 * allowing Android/iOS Lock Screen MediaSession & background playback to stay
 * 100% active and responsive even when offline or when external links fail.
 */

// Cache generated melodic blobs by name/id to avoid redundant calculations
const blobUrlCache = new Map<string, string>();

/**
 * Generates a clean, serene 30-second loopable musical WAV Blob URL
 * using standard PCM synthesis (zero dependencies, works 100% offline).
 */
export function generateMelodyWavBlob(seedName: string = 'music'): string {
  if (blobUrlCache.has(seedName)) {
    return blobUrlCache.get(seedName)!;
  }

  const sampleRate = 22050; // 22.05 kHz for fast generation and crisp sound
  const durationSeconds = 30; // 30 seconds loop
  const totalSamples = sampleRate * durationSeconds;
  const numChannels = 2; // Stereo
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalSamples * blockAlign;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // 1. RIFF Chunk Descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // 2. "fmt " Sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // 3. "data" Sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Hash seed to determine scale & chord frequencies
  let hash = 0;
  for (let i = 0; i < seedName.length; i++) {
    hash = (hash << 5) - hash + seedName.charCodeAt(i);
    hash |= 0;
  }
  const baseFreqs = [220, 261.63, 293.66, 329.63, 392.0, 440, 523.25]; // Pentatonic A minor / C major
  const rootIdx = Math.abs(hash) % 4;
  const f1 = baseFreqs[rootIdx];
  const f2 = baseFreqs[(rootIdx + 2) % baseFreqs.length];
  const f3 = baseFreqs[(rootIdx + 4) % baseFreqs.length];

  // Synthesize musical ambient chords with gentle envelope
  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    
    // Beat pulsation (approx 75 BPM -> 0.8s per beat)
    const beat = (t % 0.8) / 0.8;
    const beatEnv = Math.exp(-beat * 4); // Soft drum/thump decay

    // Chord envelope (swells every 4 seconds)
    const chordCycle = (t % 4) / 4;
    const chordEnv = Math.sin(chordCycle * Math.PI) * 0.4 + 0.1;

    // Arpeggio note selector
    const arpStep = Math.floor(t * 3) % 3;
    const currentNote = arpStep === 0 ? f1 : arpStep === 1 ? f2 : f3;
    const arpPhase = (t * 3) % 1;
    const arpEnv = Math.exp(-arpPhase * 3.5);

    // Warm harmonics
    const tone1 = Math.sin(2 * Math.PI * f1 * t) * 0.25;
    const tone2 = Math.sin(2 * Math.PI * f2 * t) * 0.2;
    const tone3 = Math.sin(2 * Math.PI * f3 * 0.5 * t) * 0.3; // Warm bass
    const arpTone = Math.sin(2 * Math.PI * currentNote * 2 * t) * 0.35 * arpEnv;
    const kick = Math.sin(2 * Math.PI * 65 * Math.exp(-beat * 8) * t) * 0.4 * beatEnv;

    let sampleL = (tone1 + tone2 + tone3 + arpTone + kick) * chordEnv * 0.8;
    let sampleR = (tone1 * 0.8 + tone2 * 1.2 + tone3 + arpTone * 0.9 + kick) * chordEnv * 0.8;

    // Subtle limiter to prevent clipping
    sampleL = Math.max(-0.95, Math.min(0.95, sampleL));
    sampleR = Math.max(-0.95, Math.min(0.95, sampleR));

    // Convert float to 16-bit signed integer
    const intSampleL = Math.floor(sampleL * 32767);
    const intSampleR = Math.floor(sampleR * 32767);

    view.setInt16(offset, intSampleL, true);
    view.setInt16(offset + 2, intSampleR, true);
    offset += 4;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  const blobUrl = URL.createObjectURL(blob);
  blobUrlCache.set(seedName, blobUrl);
  return blobUrl;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Generates an SVG Data-URI cover art for lock screen notification
 * if the song has no existing thumbnail.
 */
export function generateDefaultCoverArt(title: string): string {
  const cleanTitle = title.replace(/\.[^/.]+$/, '').slice(0, 24);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#142c23" />
        <stop offset="50%" stop-color="#1b4332" />
        <stop offset="100%" stop-color="#081c15" />
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#48bb78" />
        <stop offset="100%" stop-color="#38a169" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="40" fill="url(#bg)" />
    <circle cx="256" cy="220" r="110" fill="rgba(72,187,120,0.15)" stroke="url(#accent)" stroke-width="4" />
    <path d="M230 150 v140 a35 35 0 1 1 -25 -33 v-87 l80 -20 v87 a35 35 0 1 1 -25 -33 v-90 z" fill="#48bb78" />
    <text x="256" y="390" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="28" fill="#ffffff">
      ${escapeXml(cleanTitle)}
    </text>
    <text x="256" y="425" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="20" fill="#a0aec0">
      Files by Google
    </text>
  </svg>`.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
