import Ionicons from '@expo/vector-icons/Ionicons';
import { Href, useRouter } from 'expo-router';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];
type ParticipantKey = 'home' | 'missions' | 'progress' | 'profile';
type MonitorKey = 'home' | 'participants' | 'missions' | 'reports' | 'profile';

type NavItem = { key: string; label: string; icon: IconName; activeIcon: IconName; href: Href };

const participantItems: NavItem[] = [
  { key: 'home', label: 'Início', icon: 'home-outline', activeIcon: 'home', href: '/participant/home' },
  { key: 'missions', label: 'Missões', icon: 'flag-outline', activeIcon: 'flag', href: '/participant/missions' },
  { key: 'progress', label: 'Progresso', icon: 'bar-chart-outline', activeIcon: 'bar-chart', href: '/participant/progress' },
  { key: 'profile', label: 'Perfil', icon: 'person-outline', activeIcon: 'person', href: '/participant/profile' },
];

const monitorItems: NavItem[] = [
  { key: 'home', label: 'Visão geral', icon: 'home-outline', activeIcon: 'home', href: '/monitor/home' },
  { key: 'participants', label: 'Participantes', icon: 'people-outline', activeIcon: 'people', href: '/monitor/participants' },
  { key: 'missions', label: 'Missões', icon: 'flag-outline', activeIcon: 'flag', href: '/monitor/missions' },
  { key: 'reports', label: 'Relatórios', icon: 'bar-chart-outline', activeIcon: 'bar-chart', href: '/monitor/reports' },
  { key: 'profile', label: 'Perfil', icon: 'person-outline', activeIcon: 'person', href: '/monitor/profile' },
];

export function ParticipantNav({ active }: { active: ParticipantKey }) {
  return <BottomNav items={participantItems} active={active} />;
}

export function MonitorNav({ active }: { active: MonitorKey }) {
  return <BottomNav items={monitorItems} active={active} compact />;
}

function BottomNav({ items, active, compact = false }: { items: NavItem[]; active: string; compact?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const openTab = (href: Href) => {
    router.dismissAll();
    router.replace(href);
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.nav, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
    >
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            key={item.key}
            onPress={() => openTab(item.href)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <Ionicons name={selected ? item.activeIcon : item.icon} size={compact ? 22 : 24} color={selected ? colors.primary : colors.iconMuted} />
            <AppText
              variant="caption"
              weight={selected ? '800' : '500'}
              color={selected ? colors.primary : colors.iconMuted}
              style={compact && styles.compactLabel}
            >
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  item: { alignItems: 'center', flex: 1, gap: 3, justifyContent: 'center', minHeight: 62, minWidth: 0 },
  pressed: { opacity: 0.62 },
  compactLabel: { textAlign: 'center' },
});
