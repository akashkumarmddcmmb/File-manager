# 📱 Files (Google Files Clone) - Android APK Build Guide

इस प्रोजेक्ट को पूरी तरह से **Capacitor Android Native Project** में बदल दिया गया है। 
इसके अंदर पूरा `android/` फोल्डर, Gradle फाइल्स, AndroidManifest (Storage Permissions के साथ) और Compiled Assets तैयार हैं।

---

## तरीका 1: Android Studio से 1-क्लिक में APK बनाना (अनुशंसित)

1. **ZIP डाउनलोड करें:**
   - ऊपर दाईं ओर **Settings (⚙️)** मेन्यू पर क्लिक करके **"Export as ZIP"** चुनें और फ़ाइल को अपने कंप्यूटर पर Extract (Unzip) करें।

2. **Android Studio खोलें:**
   - Android Studio ओपन करें और **"Open an Existing Project"** पर क्लिक करें।
   - Unzip किए गए प्रोजेक्ट के अंदर मौजूद **`android`** फ़ोल्डर को चुनें और `OK` दबाएँ।

3. **APK Build करें:**
   - Gradle Sync पूरा होने के बाद ऊपर मेन्यू में जाएँ:
   - **`Build`** ➔ **`Build Bundle(s) / APK(s)`** ➔ **`Build APK(s)`** पर क्लिक करें।
   - 1-2 मिनट में नीचे दाईं ओर **"locate"** का लिंक आएगा। उस पर क्लिक करते ही आपकी **`app-debug.apk`** फ़ाइल मिल जाएगी!
   - इस APK को किसी भी Android फ़ोन में भेजकर सीधे Install कर लें।

---

## तरीका 2: कमांड लाइन (Terminal) से सीधे APK बनाना

अगर आपके कंप्यूटर में Android SDK या Gradle इंस्टॉल है:
```bash
# प्रोजेक्ट फ़ोल्डर में जाएँ
cd android

# Windows में:
gradlew.bat assembleDebug

# Mac/Linux में:
./gradlew assembleDebug
```
APK फ़ाइल यहाँ बन जाएगी:  
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## शामिल किए गए नेटिव कॉन्फ़िगरेशन:
- **Package Name:** `com.google.android.apps.nbu.files.clone`
- **App Name:** `Files`
- **Android Permissions:** 
  - `READ_EXTERNAL_STORAGE`
  - `WRITE_EXTERNAL_STORAGE`
  - `MANAGE_EXTERNAL_STORAGE`
  - `INTERNET`
- **Native Sync:** Web assets को पहले से `android/app/src/main/assets/public/` में sync कर दिया गया है।
