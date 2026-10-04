import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useContacts, ubToday } from '@/lib/cards';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { Button, Loading, Notice, Txt } from '@/components/ui';

export default function ContactsTab() {
  const { t } = useI18n();
  const th = useTheme();
  const router = useRouter();
  const q = useContacts();
  const [search, setSearch] = useState('');
  const today = ubToday();

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (q.data?.rows ?? []).filter((c) => !needle || [c.name, c.company, c.phone, c.email].some((f) => f?.toLowerCase().includes(needle)));
  }, [q.data, search]);

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
        <Button title={`+ ${t('m.newContact')}`} onPress={() => router.push('/contact/new')} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => void q.refetch()} />}
        ListEmptyComponent={<Txt muted style={{ textAlign: 'center', padding: 24 }}>{t('m.empty')}</Txt>}
        renderItem={({ item: c }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.name}
            onPress={() => router.push(`/contact/${c.id}`)}
            style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: th.border, backgroundColor: pressed ? th.card : th.bg })}
          >
            <Txt weight="600">{c.name}</Txt>
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
        )}
      />
    </View>
  );
}
