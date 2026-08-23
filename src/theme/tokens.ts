import { Platform } from 'react-native';

export const colors = {
  background: '#FAF8FC',
  surface: '#FFFFFF',
  primary: '#4B2396',
  primaryDark: '#371775',
  primarySoft: '#F2E9FF',
  primaryMuted: '#DCCAF7',
  border: '#9B90A7',
  text: '#1D1B24',
  textMuted: '#626274',
  placeholder: '#747282',
  iconMuted: '#6F7080',
  success: '#147743',
  successText: '#147743',
  successSoft: '#E7F8ED',
  warning: '#8A6000',
  warningSoft: '#FFF4DA',
  danger: '#C52A3D',
  dangerSoft: '#FDEBED',
  blue: '#28518D',
  blueSoft: '#EAF2FF',
  teal: '#159B6A',
  yellow: '#FFC84A',
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
  xl: 24,
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
  small: 14,
  caption: 12,
} as const;

export const shadow = Platform.select({
  ios: {
    shadowColor: '#3B2352',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  android: { elevation: 2 },
  default: {},
});
