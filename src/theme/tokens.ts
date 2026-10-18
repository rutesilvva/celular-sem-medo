import { Platform } from 'react-native';

export const colors = {
  background: '#F3EFEA',
  surface: '#FFFDFB',
  screen: '#F7F2EE',
  card: '#FFFDFB',
  primary: '#5A3D82',
  primaryDark: '#432A5E',
  primarySoft: '#F1E7FF',
  primaryMuted: '#DCCAF4',
  border: '#D9CFDF',
  text: '#221C2B',
  textMuted: '#675F70',
  placeholder: '#8F899B',
  iconMuted: '#766E7E',
  success: '#2E9E69',
  successText: '#1A7348',
  successSoft: '#E3F6EB',
  warning: '#C99A3C',
  warningSoft: '#F6EBC8',
  danger: '#C84A5B',
  dangerSoft: '#FDE7EC',
  blue: '#5A8FD6',
  blueSoft: '#E4F0FF',
  teal: '#5AA7AF',
  yellow: '#F1D36A',
  transparent: 'transparent',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  round: 999,
} as const;

export const type = {
  family: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif',
    default: 'system-ui',
  }),
  title: 30,
  heading: 24,
  subheading: 20,
  body: 17,
  // Textos auxiliares também precisam permanecer legíveis sem depender
  // da preferência de texto ampliado.
  small: 16,
  caption: 16,
} as const;

export const shadow = Platform.select({
  ios: {
    shadowColor: '#3B2352',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  android: { elevation: 4 },
  default: {},
});
