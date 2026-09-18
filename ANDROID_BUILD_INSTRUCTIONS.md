# 📱 Files (Google Files Clone) - Android APK Build Guide

इस प्रोजेक्ट को पूरी तरह से **Capacitor Android Native Mobile App** में बदल दिया गया है, जिसमें असली डिवाइस के **Internal Storage, SD Card, Pictures, Downloads और Documents** को पढ़ने और मैनेज करने की क्षमता जोड़ी जा चुकी है।

---

## 🔥 तरीका 1: GitHub Actions से बिना किसी कंप्यूटर के सीधे APK डाउनलोड करना (सबसे आसान)

चूँकि हमने `.github/workflows/main.yml` फ़ाइल पूरी तरह तैयार कर दी है:

1. ऊपर दाईं ओर **Settings (⚙️)** मेन्यू से **"Export to GitHub"** चुनें।
2. अपना GitHub अकाउंट कनेक्ट करके इस प्रोजेक्ट को अपनी GitHub रिपॉजिटरी में पुश करें।
3. अपनी GitHub रिपॉजिटरी में जाएँ और ऊपर **"Actions"** टैब पर क्लिक करें।
4. वहाँ **"Build Android APK"** अपने-आप चलना शुरू हो जाएगा (1-2 मिनट लगेंगे)।
5. प्रोसेस पूरा होते ही नीचे **Artifacts** में **`GoogleFiles-Android-App-APK`** का डाउनलोड लिंक मिलेगा।
6. उस पर क्लिक करें — आपकी असली **`.apk` फ़ाइल डाउनलोड हो जाएगी**, जिसे आप सीधे अपने Android मोबाइल में इनस्टॉल कर सकते हैं!

---

## तरीका 2: Android Studio से 1-क्लिक में APK बनाना (कंप्यूटर पर)

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
