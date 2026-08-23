import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, LogoMark } from '@/components/ui';
import { spacing } from '@/theme/tokens';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <LogoMark compact />
      <View style={styles.copy}>
        <AppText variant="heading" weight="800" style={styles.center}>Tela não encontrada</AppText>
        <AppText style={styles.center}>Vamos voltar para um caminho conhecido.</AppText>
      </View>
      <Button label="Voltar ao início" onPress={() => router.replace('/login')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  copy: { gap: spacing.sm },
  center: { textAlign: 'center' },
});
