import { useMemo, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Svg, { Rect } from 'react-native-svg';
import { rangeStartIso, ubToday, useMyCards } from '@/lib/cards';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { Card, Loading, Screen, Txt } from '@/components/ui';

type Range = 'today' | '7d' | '30d' | 'all';
const DAYS: Record<Range, number | null> = { today: 1, '7d': 7, '30d': 30, all: null };

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const th = useTheme();
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={onPress} style={{ paddingHorizontal: 12, minHeight: 40, justifyContent: 'center', borderRadius: 20, backgroundColor: on ? th.primary : th.card, borderWidth: 1, borderColor: th.border }}>
      <Txt size={14} style={{ color: on ? th.onPrimary : th.text }}>
        {label}
      </Txt>
    </Pressable>
  );
}

export default function Stats() {
  const { t } = useI18n();
  const th = useTheme();
  const { width } = useWindowDimensions();
  const cards = useMyCards(); // own cards only (org employees never see colleagues)
  const ids = useMemo(() => (cards.data ?? []).map((c) => c.id), [cards.data]);
  const [range, setRange] = useState<Range>('7d');
  const [chartDays, setChartDays] = useState<7 | 30>(7);

  const stats = useQuery({
    queryKey: ['m-stats', ids.join(','), range],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_card_stats', { p_card_ids: ids, p_from: rangeStartIso(DAYS[range]) ?? undefined });
      if (error) throw error;
      // Total opens = view + qr_open (computed server-side for every range from the same events)
      return (data ?? []).reduce(
        (s, r) => ({ total: s.total + Number(r.total_opens), qr: s.qr + Number(r.qr_opens), unique: s.unique + Number(r.unique_visitors), links: s.links + Number(r.link_clicks), saves: s.saves + Number(r.contact_saves) }),
        { total: 0, qr: 0, unique: 0, links: 0, saves: 0 },
      );
    },
  });

  const daily = useQuery({
    queryKey: ['m-daily', ids.join(','), chartDays],
    enabled: ids.length > 0,
    queryFn: async () => {
      const since = new Date(Date.parse(`${ubToday()}T00:00:00Z`) - (chartDays - 1) * 864e5).toISOString().slice(0, 10);
      const { data, error } = await supabase.from('card_daily_stats').select('day, views, qr_opens').in('card_id', ids).gte('day', since);
      if (error) throw error;
      const byDay = new Map<string, number>();
      for (let i = 0; i < chartDays; i++) byDay.set(new Date(Date.parse(`${since}T00:00:00Z`) + i * 864e5).toISOString().slice(0, 10), 0);
      for (const r of data ?? []) byDay.set(r.day!, (byDay.get(r.day!) ?? 0) + Number(r.views ?? 0) + Number(r.qr_opens ?? 0));
      return [...byDay.entries()];
    },
  });

  if (cards.isLoading) return <Loading />;
  const s = stats.data;
  const max = Math.max(1, ...(daily.data ?? []).map(([, v]) => v));
  const chartW = width - 64;
  const barW = chartW / chartDays;

  const tile = (label: string, value: number | undefined) => (
    <Card style={{ flexBasis: '47%', flexGrow: 1 }}>
      <Txt muted size={13}>
        {label}
      </Txt>
      <Txt size={24} weight="700">
        {value ?? '—'}
      </Txt>
    </Card>
  );

  return (
    <Screen>
      <Txt muted size={13}>
        {t('m.onlyOwn')}
      </Txt>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['today', '7d', '30d', 'all'] as const).map((r) => (
          <Chip key={r} label={t(`stats.range.${r}`)} on={range === r} onPress={() => setRange(r)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {tile(t('stats.totalOpens'), s?.total)}
        {tile(t('stats.qrOpens'), s?.qr)}
        {tile(t('stats.uniqueVisitors'), s?.unique)}
        {tile(t('stats.linkClicks'), s?.links)}
        {tile(t('stats.contactSaves'), s?.saves)}
      </View>
      <Card>
        <Txt weight="600">{t('m.chart')}</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label={t('m.range7')} on={chartDays === 7} onPress={() => setChartDays(7)} />
          <Chip label={t('m.range30')} on={chartDays === 30} onPress={() => setChartDays(30)} />
        </View>
        <Svg width={chartW} height={140} accessibilityLabel={t('m.chart')}>
          {(daily.data ?? []).map(([day, v], i) => {
            const h = (v / max) * 130;
            return <Rect key={day} x={i * barW + 1} y={140 - h} width={Math.max(2, barW - 2)} height={h} rx={2} fill={th.primary} />;
          })}
        </Svg>
      </Card>
    </Screen>
  );
}
