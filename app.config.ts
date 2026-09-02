import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Celular Sem Medo',
  slug: 'celular-sem-medo',
  version: '0.1.0',
  icon: './assets/icon.png',
  orientation: 'portrait',
  scheme: 'celularsemmedo',
  userInterfaceStyle: 'light',
  runtimeVersion: { policy: 'appVersion' },
  ios: { supportsTablet: false, bundleIdentifier: 'br.com.celularsemmedo.app' },
  android: {
    package: 'br.com.celularsemmedo.app',
    adaptiveIcon: { foregroundImage: './assets/icon.png', backgroundColor: '#FFFFFF' },
    predictiveBackGestureEnabled: false,
  },
  web: { bundler: 'metro', favicon: './assets/icon.png', output: 'static' },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-status-bar',
    'expo-sharing',
    ['expo-audio', { microphonePermission: 'Permita o microfone apenas quando você escolher responder por voz em um treinamento.' }],
    ['expo-web-browser', { experimentalLauncherActivity: false }],
    ['expo-secure-store', { configureAndroidBackup: true }],
    ['expo-splash-screen', { image: './assets/logo-celular-sem-medo.png', resizeMode: 'contain', backgroundColor: '#FAF8FC' }],
  ],
  experiments: { typedRoutes: true },
  updates: { checkAutomatically: 'ON_LOAD', fallbackToCacheTimeout: 0 },
});
