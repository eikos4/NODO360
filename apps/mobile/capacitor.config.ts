import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cl.nodo360.mobile',
  appName: 'Nodo360',
  webDir: 'dist',
  backgroundColor: '#071019',
  android: { allowMixedContent: false },
  plugins: {
    CapacitorHttp: { enabled: true },
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
