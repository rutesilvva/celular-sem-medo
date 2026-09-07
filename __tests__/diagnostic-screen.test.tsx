import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import ParticipantDiagnosticScreen from '../app/participant/diagnostic';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { readDiagnosticDraft, writeDiagnosticDraft } from '@/lib/diagnostic-draft';
import { loadDiagnosticResilient } from '@/lib/learning-path-cache';

const mockRouter = { back: jest.fn(), canGoBack: jest.fn(() => true), dismissAll: jest.fn(), push: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/components/Screen', () => {
  const React = require('react'); const { View } = require('react-native');
  return { Screen: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children) };
});
jest.mock('@/context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('@/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/useMissionData', () => ({ useMissionCatalog: () => ({ data: [{ category: 'Segurança digital' }] }) }));
jest.mock('@/lib/diagnostic-draft', () => ({ clearDiagnosticDraft: jest.fn(), readDiagnosticDraft: jest.fn(), writeDiagnosticDraft: jest.fn() }));
jest.mock('@/lib/learning-path-cache', () => ({ loadDiagnosticResilient: jest.fn(), saveDiagnosticResilient: jest.fn() }));

describe('participant diagnostic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation();
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation();
    jest.mocked(useAuth).mockReturnValue({ currentUser: { id: 'student-a' } } as never);
    jest.mocked(useApp).mockReturnValue({
      preferences: { largerText: true, highContrast: false, autoAudio: false, voiceResponse: false, audioRate: 1, reduceMotion: false, hapticFeedback: false, repeatInstructions: false },
      setPreference: jest.fn(), showNotice: jest.fn(),
    } as never);
    jest.mocked(readDiagnosticDraft).mockResolvedValue(null);
    jest.mocked(loadDiagnosticResilient).mockResolvedValue({ value: null, draft: null, offline: false, pending: false });
  });

  it('shows progress, restores focus and uses accessible single selection', async () => {
    const screen = render(<ParticipantDiagnosticScreen />);
    await screen.findByText('Como você se sente usando o celular?');
    expect(screen.getByText('Pergunta 1 de 7')).toBeTruthy();
    expect(screen.getByLabelText('Estou começando').props.accessibilityRole).toBe('radio');
    fireEvent.press(screen.getByLabelText('Estou começando'));
    fireEvent.press(screen.getByText('Continuar'));
    fireEvent.press(screen.getByLabelText('Ler'));
    fireEvent.press(screen.getByLabelText('Ouvir'));
    expect(screen.getByLabelText('Ler').props.accessibilityState.checked).toBe(false);
    expect(screen.getByLabelText('Ouvir').props.accessibilityState.checked).toBe(true);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Pergunta 2 de 7');
  });

  it('supports multiple choices, the exclusive none option and large text', async () => {
    const screen = render(<ParticipantDiagnosticScreen />);
    const heading = await screen.findByText('Como você se sente usando o celular?');
    expect(StyleSheet.flatten(heading.props.style).fontSize).toBeGreaterThan(22);
    fireEvent.press(screen.getByLabelText('Estou começando'));
    fireEvent.press(screen.getByText('Continuar'));
    fireEvent.press(screen.getByLabelText('Praticar'));
    fireEvent.press(screen.getByText('Continuar'));
    fireEvent.press(screen.getByLabelText('Conversar pelo WhatsApp'));
    fireEvent.press(screen.getByLabelText('Tirar e enviar fotos'));
    expect(screen.getByLabelText('Conversar pelo WhatsApp').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('Tirar e enviar fotos').props.accessibilityState.checked).toBe(true);
    fireEvent.press(screen.getByLabelText('Ainda não faço essas ações sozinho'));
    expect(screen.getByLabelText('Conversar pelo WhatsApp').props.accessibilityState.checked).toBe(false);
    expect(screen.getByLabelText('Ainda não faço essas ações sozinho').props.accessibilityState.checked).toBe(true);
    await waitFor(() => expect(writeDiagnosticDraft).toHaveBeenCalled());
  });
});
