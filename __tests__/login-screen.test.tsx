import { fireEvent, render, waitFor } from '@testing-library/react-native';

import LoginScreen from '../app/login';
import { AppProvider } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { GoogleAuthError, signInWithGoogle } from '@/lib/google-auth';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('@/components/Screen', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Screen: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children) };
});
jest.mock('@/context/AuthContext', () => ({ useAuth: jest.fn(), useOptionalAuth: () => mockedAuth() }));
jest.mock('@/lib/google-auth', () => ({ ...jest.requireActual('@/lib/google-auth'), signInWithGoogle: jest.fn() }));

const mockedAuth = jest.mocked(useAuth);
const mockedSignIn = jest.mocked(signInWithGoogle);

describe('Google login screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuth.mockReturnValue(authState() as never);
  });

  it('prevents parallel authentication after repeated taps', async () => {
    let resolveLogin!: (value: null) => void;
    mockedSignIn.mockReturnValue(new Promise((resolve) => { resolveLogin = resolve; }));
    const screen = render(<AppProvider><LoginScreen /></AppProvider>);
    fireEvent.press(screen.getByText('Continuar com Google'));
    fireEvent.press(screen.getByText('Conectando ao Google…'));
    expect(mockedSignIn).toHaveBeenCalledTimes(1);
    resolveLogin(null);
    await waitFor(() => expect(screen.getByText('Continuar com Google')).toBeTruthy());
  });

  it.each([
    ['cancelled', 'Entrada cancelada'],
    ['offline', 'sem internet'],
    ['not_provisioned', 'ainda não está cadastrada'],
    ['account_blocked', 'está bloqueada'],
    ['temporary_failure', 'temporariamente indisponível'],
  ] as const)('shows a recoverable %s error', async (code, message) => {
    mockedSignIn.mockRejectedValue(new GoogleAuthError(code));
    const screen = render(<AppProvider><LoginScreen /></AppProvider>);
    fireEvent.press(screen.getByText('Continuar com Google'));
    await waitFor(() => expect(screen.getByText(new RegExp(message, 'i'))).toBeTruthy());
    expect(screen.getByText('Tentar novamente')).toBeTruthy();
  });

  it.each([
    ['participant', '/participant/home'],
    ['admin', '/admin/home'],
  ] as const)('routes authenticated %s to its protected area', async (role, destination) => {
    mockedAuth.mockReturnValue(authState({ status: 'authenticated', sessionRole: role, participantOnboardingCompleted: true }) as never);
    render(<AppProvider><LoginScreen /></AppProvider>);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(destination));
  });

  it('shows onboarding only while the participant has not completed it', async () => {
    mockedAuth.mockReturnValue(authState({ status: 'authenticated', sessionRole: 'participant', participantOnboardingCompleted: false }) as never);
    const screen = render(<AppProvider><LoginScreen /></AppProvider>);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/participant/welcome'));
    mockReplace.mockClear();
    mockedAuth.mockReturnValue(authState({ status: 'authenticated', sessionRole: 'participant', participantOnboardingCompleted: true }) as never);
    screen.rerender(<AppProvider><LoginScreen /></AppProvider>);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/participant/home'));
  });
});

function authState(overrides: Record<string, unknown> = {}) {
  return {
    status: 'anonymous', errorCode: null, sessionRole: null, availableRoles: [], currentUser: null,
    participantOnboardingCompleted: false, acceptAuthenticatedAccount: jest.fn(), selectSessionRole: jest.fn(),
    completeParticipantOnboarding: jest.fn(), retrySessionRestore: jest.fn(), signOut: jest.fn(),
    ...overrides,
  };
}
