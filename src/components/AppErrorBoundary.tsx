import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { captureTechnicalError } from '@/lib/observability';

type State = { failed: boolean };

export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State { return { failed: true }; }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    captureTechnicalError('app.unhandled_error', error);
  }

  private retry = () => this.setState({ failed: false });

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View accessibilityRole="alert" style={styles.screen}>
        <Text style={styles.icon}>🛟</Text>
        <Text accessibilityRole="header" style={styles.title}>O aplicativo encontrou um problema</Text>
        <Text style={styles.copy}>Seus dados salvos continuam protegidos. Tente abrir esta tela novamente.</Text>
        <Pressable accessibilityRole="button" accessibilityHint="Tenta carregar novamente o aplicativo" onPress={this.retry} style={styles.button}>
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', backgroundColor: '#FAF8FC', flex: 1, gap: 18, justifyContent: 'center', padding: 28 },
  icon: { fontSize: 52 },
  title: { color: '#251A33', fontSize: 25, fontWeight: '800', textAlign: 'center' },
  copy: { color: '#5E536A', fontSize: 18, lineHeight: 27, textAlign: 'center' },
  button: { alignItems: 'center', backgroundColor: '#6D2CA4', borderRadius: 16, justifyContent: 'center', minHeight: 52, paddingHorizontal: 24 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
});
