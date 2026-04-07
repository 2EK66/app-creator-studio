import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mirec.app', // L'ID est maintenant correct (pas de tirets)
  appName: 'MIREC',
  webDir: 'dist',
  server: {
    // On retire l'URL pour que Capacitor utilise les fichiers locaux du dossier 'dist'
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
