import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useContacts, ubToday } from '@/lib/cards';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { LargeTitle, Loading, Notice, Txt } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { font } from '@/lib/fonts';
import { Appear, Icon, PressScale } from '@/components/motion';
import { useAuth } from '@/lib/auth';

type Filter = 'all' | 'today' | 'overdue' | 'new';

export default function ContactsTab() {
  const { t } = useI18n();
  const th = useTheme();
  const router = useRouter();
  const q = useContacts();
  const { entitlements } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const today = ubToday();

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (q.data?.rows ?? []).filter((c) => {
      if (needle && ![c.name, c.company, c.phone, c.email, c.note, ...(c.tags ?? [])].some((f) => f?.toLowerCase().includes(needle))) return false;
      if (filter === 'today') return c.follow_up_at === today;
      if (filter === 'overdue') return !!c.follow_up_at && c.follow_up_at < today && c.status !== 'closed';
      if (filter === 'new') return c.status === 'new';
      return true;
    });
  }, [q.data, search, filter, today]);
  const crm = !!entitlements?.crm_enabled;

  if (q.isLoading) return <Loading />;

  const header = (
    <View style={{ gap: 12, paddingBottom: 8 }}>
      <LargeTitle
        title={t('contacts.title')}
        subtitle={
          entitlements?.contact_limit != null ? t('m.contactCount', { count: entitlements.contact_count, limit: entitlements.contact_limit }) : t('m.peopleCount', { n: q.data?.rows.length ?? 0 })
        }
        right={
          <PressScale accessibilityRole="button" accessibilityLabel={t('m.newContact')} onPress={() => router.push('/contact/new')}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: th.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="userPlus" color={th.onPrimary} size={20} />
            </View>
          </PressScale>
        }
      />
      {q.data?.offline ? <Notice text={t('m.offline')} /> : null}
      {q.error && !q.data ? <Notice tone="error" text={t('errors.generic')} /> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          minHeight: 48,
          borderRadius: 16,
          paddingHorizontal: 14,
          backgroundColor: th.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: th.border,
        }}
      >
        <Icon name="search" color={th.muted} size={18} />
        <TextInput
          accessibilityLabel={t('common.search')}
          placeholder={t('m.searchPeople')}
          placeholderTextColor={th.muted}
          value={search}
          onChangeText={setSearch}
          style={{ flex: 1, minHeight: 48, color: th.text, fontSize: 16, ...font('400') }}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {crm
          ? (['all', 'today', 'overdue', 'new'] as const).map((f) => (
              <PressScale key={f} accessibilityRole="tab" accessibilityState={{ selected: filter === f }} onPress={() => setFilter(f)}>
                <View
                  style={{
                    paddingHorizontal: 14,
                    minHeight: 36,
                    justifyContent: 'center',
                    borderRadius: 18,
                    backgroundColor: filter === f ? th.text : th.card,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: th.border,
                  }}
                >
                  <Txt size={13} weight="600" style={{ color: filter === f ? th.bg : th.text }}>
                    {t(`m.filter.${f}`)}
                  </Txt>
                </View>
              </PressScale>
            ))
          : null}
        <PressScale accessibilityRole="button" accessibilityLabel={t('m.scanShort')} onPress={() => router.push({ pathname: '/contact/[id]', params: { id: 'new', scan: '1' } })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 36, borderRadius: 18, backgroundColor: th.primarySoft }}>
            <Icon name="sparkles" color={th.accent} size={15} />
            <Txt size={13} weight="600" style={{ color: th.accent }}>
              {t('m.scanShort')}
            </Txt>
          </View>
        </PressScale>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: th.bg }}>
      <FlatList
        data={rows}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => void q.refetch()} tintColor={th.primary} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 48 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: th.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="users" color={th.primary} size={28} />
            </View>
            <Txt muted style={{ textAlign: 'center' }}>
              {t('m.empty')}
            </Txt>
          </View>
        }
        renderItem={({ item: c, index }) => (
          <Appear index={Math.min(index, 10)}>
            <PressScale accessibilityRole="button" accessibilityLabel={c.name} onPress={() => router.push(`/contact/${c.id}`)}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: th.card, borderWidth: StyleSheet.hairlineWidth, borderColor: th.border }}
              >
                <Avatar name={c.name} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt weight="600" numberOfLines={1}>
                    {c.name}
                  </Txt>
                  {c.company || c.title ? (
                    <Txt muted size={13} numberOfLines={1}>
                      {[c.company, c.title].filter(Boolean).join(' · ')}
                    </Txt>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {crm && c.status ? (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: th.cardMuted }}>
                      <Txt size={11} muted weight="500">
                        {t(`contacts.status.${c.status}`)}
                      </Txt>
                    </View>
                  ) : null}
                  {c.follow_up_at ? (
                    <Txt size={12} weight="600" style={{ color: c.follow_up_at <= today ? th.danger : th.muted }}>
                      {c.follow_up_at.slice(5).replace('-', '.')}
                    </Txt>
                  ) : null}
                </View>
              </View>
            </PressScale>
          </Appear>
        )}
      />
    </SafeAreaView>
  );
}
