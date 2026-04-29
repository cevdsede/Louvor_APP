import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.valenteshub.app',
  appName: 'Valentes Hub',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
