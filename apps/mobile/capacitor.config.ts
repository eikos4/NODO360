import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cl.nodo360.mobile',
  appName: 'Nodo360',
  webDir: 'dist',
  backgroundColor: '#f8fafc',
  android: {
    allowMixedContent: false,
    backgroundColor: '#f8fafc',
  },
  plugins: {
    CapacitorHttp: { enabled: true },
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
