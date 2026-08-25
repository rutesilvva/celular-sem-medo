module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/dist/'],
  collectCoverageFrom: [
    'src/context/AppContext.tsx',
    'src/context/AuthContext.tsx',
    'src/features/auth/authorization.ts',
    'src/features/mission-engine/executor.ts',
    'src/lib/env.ts',
    'src/lib/google-auth.ts',
  ],
  coverageThreshold: {
    global: { branches: 70, functions: 70, lines: 70, statements: 70 },
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|expo-router|@expo/vector-icons|react-navigation|@react-navigation/.*|react-native-svg)',
  ],
};
