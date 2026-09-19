import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.google.android.apps.nbu.files.clone',
  appName: 'Files by Akash Kumar',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#ffffff'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_name',
      iconColor: '#1A73E8',
      sound: 'beep.wav',
    },
  },
};

export default config;
