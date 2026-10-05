import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useContacts, ubToday } from '@/lib/cards';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { Button, Loading, Notice, Txt } from '@/components/ui';
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

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      <View style={{ padding: 16, gap: 8 }}>
        {q.data?.offline ? <Notice text={t('m.offline')} /> : null}
        {q.error && !q.data ? <Notice tone="error" text={t('errors.generic')} /> : null}
        <TextInput
          accessibilityLabel={t('common.search')}
          placeholder={t('common.search')}
          placeholderTextColor={th.muted}
          value={search}
          onChangeText={setSearch}
          style={{ minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: th.border, paddingHorizontal: 12, color: th.text, backgroundColor: th.card, fontSize: 16 }}
        />
        {crm ? (
          <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {(['all', 'today', 'overdue', 'new'] as const).map((f) => (
              <PressScale
                key={f}
                accessibilityRole="tab"
                accessibilityState={{ selected: filter === f }}
                onPress={() => setFilter(f)}
                style={{
                  paddingHorizontal: 12,
                  minHeight: 36,
                  justifyContent: 'center',
                  borderRadius: 18,
                  backgroundColor: filter === f ? th.primary : th.card,
                  borderWidth: 1,
                  borderColor: filter === f ? th.primary : th.border,
                }}
              >
                <Txt size={13} weight="600" style={{ color: filter === f ? th.onPrimary : th.text }}>
                  {t(`m.filter.${f}`)}
                </Txt>
              </PressScale>
            ))}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button title={t('m.add')} accessibilityLabel={t('m.newContact')} icon={<Icon name="userPlus" color={th.onPrimary} size={18} />} onPress={() => router.push('/contact/new')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title={t('m.scanShort')}
              variant="ai"
              icon={<Icon name="camera" color={th.accent} size={18} />}
              onPress={() => router.push({ pathname: '/contact/[id]', params: { id: 'new', scan: '1' } })}
            />
          </View>
        </View>
        {entitlements?.contact_limit != null ? (
          <Txt muted size={12}>
            {t('m.contactCount', { count: entitlements.contact_count, limit: entitlements.contact_limit })}
          </Txt>
        ) : null}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => void q.refetch()} />}
        ListEmptyComponent={
          <Txt muted style={{ textAlign: 'center', padding: 24 }}>
            {t('m.empty')}
          </Txt>
        }
        renderItem={({ item: c, index }) => (
          <Appear index={Math.min(index, 10)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={c.name}
              onPress={() => router.push(`/contact/${c.id}`)}
              style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: th.border, backgroundColor: pressed ? th.card : th.bg })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: th.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt size={14} weight="700" style={{ color: th.primary }}>
                    {Array.from(c.name.trim())[0]?.toUpperCase() ?? '?'}
                  </Txt>
                </View>
                <Txt weight="600" style={{ flex: 1 }}>
                  {c.name}
                </Txt>
                {crm && c.status ? (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: th.cardMuted }}>
                    <Txt size={11} muted>
                      {t(`contacts.status.${c.status}`)}
                    </Txt>
                  </View>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Txt muted size={14} style={{ flex: 1 }}>
                  {[c.company, c.title].filter(Boolean).join(' · ')}
                </Txt>
                {c.follow_up_at ? (
                  <Txt size={13} style={{ color: c.follow_up_at <= today ? th.danger : th.muted }}>
                    {c.follow_up_at.replace(/-/g, '.')}
                  </Txt>
                ) : null}
              </View>
            </Pressable>
          </Appear>
        )}
      />
    </View>
  );
}
