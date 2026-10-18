import { fireEvent, render } from '@testing-library/react-native';

import { ConfidencePicker } from './ConfidencePicker';
import { Button, Header } from './ui';

jest.mock('@/context/AppContext', () => ({
  useApp: () => ({
    audioStatus: 'idle',
    playInstruction: jest.fn(),
    preferences: { hapticFeedback: false, highContrast: true, largerText: true, reduceMotion: true },
  }),
}));

describe('controles acessíveis para participantes', () => {
  it('mostra descrições de confiança e preserva a escala numérica enviada', () => {
    const onChange = jest.fn();
    const screen = render(<ConfidencePicker label="Como você se sente?" value={null} onChange={onChange} />);

    expect(screen.getByText('Preciso de ajuda')).toBeTruthy();
    expect(screen.getByText('Consigo sozinho')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Consigo com ajuda'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('explica visualmente por que um botão principal está indisponível', () => {
    const screen = render(<Button label="Continuar" disabled disabledReason="Escolha uma das respostas acima." onPress={jest.fn()} />);

    expect(screen.getByText('Escolha uma das respostas acima.')).toBeTruthy();
    expect(screen.getByLabelText('Continuar').props.accessibilityHint).toBe('Escolha uma das respostas acima.');
  });

  it('explica como solicitar a leitura em áudio sem reproduzir automaticamente', () => {
    const screen = render(<Header title="Missão segura" audio />);

    expect(screen.getByText('Quer ouvir esta tela?')).toBeTruthy();
    expect(screen.getByText('Toque no símbolo de som para alguém ler a instrução.')).toBeTruthy();
    expect(screen.getByLabelText('Ouvir: Missão segura')).toBeTruthy();
  });
});
