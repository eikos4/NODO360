import type { CapacitorConfig } from '@capacitor/cli';

const remoteUrl = process.env.CARRO_WEB_URL;

const config: CapacitorConfig = {
  appId: 'cl.nodo360.carro',
  appName: 'Nodo360 Carro',
  webDir: '../web/dist',
  backgroundColor: '#06090e',
  android: {
    allowMixedContent: false,
    backgroundColor: '#06090e',
  },
  ...(remoteUrl
    ? {
        server: {
          url: remoteUrl,
          androidScheme: 'https',
          allowNavigation: [
            'nodo360-web.onrender.com',
            'nodo360-api.onrender.com',
            'nodo360.net',
            'www.nodo360.net',
          ],
        },
      }
    : {
        server: {
          androidScheme: 'https',
        },
      }),
};

export default config;
