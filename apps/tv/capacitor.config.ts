import type { CapacitorConfig } from '@capacitor/cli';

const remoteUrl = process.env.TV_WEB_URL;

const config: CapacitorConfig = {
  appId: 'cl.nodo360.tv',
  appName: 'Nodo360 TV',
  webDir: '../web/dist',
  backgroundColor: '#07090d',
  android: {
    allowMixedContent: false,
    backgroundColor: '#07090d',
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
