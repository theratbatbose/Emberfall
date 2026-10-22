import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.theratbatbose.emberfall',
  appName: 'Emberfall',
  webDir: 'dist',
  backgroundColor: '#0c0908',
  android: {
    backgroundColor: '#0c0908',
  },
  plugins: {
    SystemBars: {
      // Light status-bar icons on our near-black UI; content goes edge-to-edge and
      // uses env(safe-area-inset-*) for padding.
      style: 'DARK',
      initialViewportFitValueHint: 'cover',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_ember',
      iconColor: '#ff7a1a',
    },
  },
};

export default config;
