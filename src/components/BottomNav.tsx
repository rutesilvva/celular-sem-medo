import Ionicons from '@expo/vector-icons/Ionicons';
import { Href, useRouter } from 'expo-router';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];
type ParticipantKey = 'home' | 'missions' | 'progress' | 'profile';
type AdminKey = 'home' | 'users' | 'classes' | 'participants' | 'missions' | 'reports' | 'profile';

type NavItem = { key: string; label: string; icon: IconName; activeIcon: IconName; href: Href };

const participantItems: NavItem[] = [
  { key: 'home', label: 'Início', icon: 'home-outline', activeIcon: 'home', href: '/participant/home' },
  { key: 'missions', label: 'Missões', icon: 'flag-outline', activeIcon: 'flag', href: '/participant/missions' },
  { key: 'progress', label: 'Progresso', icon: 'bar-chart-outline', activeIcon: 'bar-chart', href: '/participant/progress' },
  { key: 'profile', label: 'Perfil', icon: 'person-outline', activeIcon: 'person', href: '/participant/profile' },
];

const adminItems: NavItem[] = [
  { key: 'home', label: 'Visão geral', icon: 'grid-outline', activeIcon: 'grid', href: '/admin/home' },
  { key: 'participants', label: 'Alunos', icon: 'people-outline', activeIcon: 'people', href: '/admin/participants' },
  { key: 'missions', label: 'Missões', icon: 'flag-outline', activeIcon: 'flag', href: '/admin/missions' },
  { key: 'reports', label: 'Relatórios', icon: 'bar-chart-outline', activeIcon: 'bar-chart', href: '/admin/reports' },
  { key: 'profile', label: 'Perfil', icon: 'person-outline', activeIcon: 'person', href: '/admin/profile' },
];

export function ParticipantNav({ active }: { active: ParticipantKey }) {
  return <BottomNav items={participantItems} active={active} />;
}

export function AdminNav({ active }: { active: AdminKey }) {
  return <BottomNav items={adminItems} active={active} compact />;
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
            hitSlop={10}
            onPress={() => openTab(item.href)}
            style={({ pressed }) => [styles.item, selected && styles.itemSelected, pressed && styles.pressed]}
          >
            <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
              <Ionicons name={selected ? item.activeIcon : item.icon} size={compact ? 24 : 26} color={selected ? colors.primary : colors.iconMuted} />
            </View>
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
  item: { alignItems: 'center', borderRadius: 18, flex: 1, gap: 5, justifyContent: 'center', minHeight: 72, minWidth: 0 },
  itemSelected: { backgroundColor: colors.primarySoft },
  iconWrap: { alignItems: 'center', borderRadius: 14, height: 36, justifyContent: 'center', width: 36 },
  iconWrapSelected: { backgroundColor: '#E9DFFF' },
  pressed: { opacity: 0.7 },
  compactLabel: { textAlign: 'center' },
});
