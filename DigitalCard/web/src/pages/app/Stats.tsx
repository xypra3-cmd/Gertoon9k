import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartColors, motion } from '@digitalcard/shared/design';
import { displayName } from '@digitalcard/shared';
import { useAuth } from '@/lib/auth';
import { useCardStats, useMyCards, type CardStatsRow } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { addDays, formatDate, rangeStart, ubToday, type StatsRange } from '@/lib/dates';
import { env, publicCardUrl } from '@/lib/env';
import { useI18n } from '@/i18n/I18nProvider';
import { Spinner, Stat, Tabs } from '@/components/ui';
import { useReducedMotion } from '@/components/motion';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid rgba(148,163,184,.25)',
  boxShadow: '0 12px 32px -12px rgba(16,24,40,.25)',
  fontSize: 12,
};

export function sumStats(rows: CardStatsRow[]): CardStatsRow {
  const z: CardStatsRow = {
    card_id: 'all',
    total_opens: 0,
    views: 0,
    qr_opens: 0,
    unique_visitors: 0,
    link_clicks: 0,
    contact_saves: 0,
    exchanges: 0,
    followups: 0,
    top_link_kind: null,
    top_link_clicks: 0,
  };
  for (const r of rows) {
    z.total_opens += Number(r.total_opens);
    z.views += Number(r.views);
    z.qr_opens += Number(r.qr_opens);
    z.unique_visitors += Number(r.unique_visitors);
    z.link_clicks += Number(r.link_clicks);
    z.contact_saves += Number(r.contact_saves);
    z.exchanges += Number(r.exchanges);
    z.followups += Number(r.followups);
    if (Number(r.top_link_clicks) > z.top_link_clicks) {
      z.top_link_clicks = Number(r.top_link_clicks);
      z.top_link_kind = r.top_link_kind;
    }
  }
  return z;
}

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—');

export function Funnel({ s }: { s: CardStatsRow }) {
  const { t } = useI18n();
  const steps = [
    { label: t('stats.totalOpens'), value: s.total_opens, prev: null as number | null },
    { label: t('stats.contactSaves'), value: s.contact_saves, prev: s.total_opens },
    { label: t('stats.exchanges'), value: s.exchanges, prev: s.total_opens },
    { label: t('stats.followups'), value: s.followups, prev: s.exchanges },
  ];
  const max = Math.max(1, s.total_opens);
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <ol className="space-y-3" data-testid="funnel">
      {steps.map((st, i) => (
        <li key={st.label}>
          <div className="flex justify-between text-sm">
            <span>{st.label}</span>
            <span className="tabular-nums">
              {st.value} {st.prev !== null && <span className="text-slate-500">({pct(st.value, st.prev)})</span>}
            </span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-3 rounded-full bg-linear-to-r from-brand-500 to-accent-500"
              style={{
                width: grown ? `${Math.max(2, (st.value / max) * 100)}%` : '0%',
                transition: `width ${motion.duration.chart}ms cubic-bezier(0.22,1,0.36,1) ${i * 120}ms`,
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function Stats() {
  const { t, locale } = useI18n();
  const { entitlements } = useAuth();
  const cards = useMyCards();
  const [params, setParams] = useSearchParams();
  const [range, setRange] = useState<StatsRange>('30d');
  const selected = params.get('card') ?? 'all';
  const reduced = useReducedMotion();
  const anim = {
    isAnimationActive: !reduced,
    animationDuration: motion.duration.chart,
    animationEasing: 'ease-out' as const,
  };

  const allIds = useMemo(() => (cards.data ?? []).map((c) => c.id), [cards.data]);
  const ids = selected === 'all' ? allIds : [selected];
  const from = rangeStart(range);
  const stats = useCardStats(ids, from);
  const total = useMemo(() => sumStats(stats.data ?? []), [stats.data]);

  const since30 = addDays(ubToday(), -29);
  const daily = useQuery({
    queryKey: ['daily', ids.join(','), since30],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_daily_stats')
        .select('*')
        .in('card_id', ids)
        .gte('day', since30);
      if (error) throw error;
      return data;
    },
  });
  const linkStats = useQuery({
    queryKey: ['links', ids.join(','), from],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_link_stats', { p_card_ids: ids, p_from: from ?? undefined });
      if (error) throw error;
      return data ?? [];
    },
  });
  const viewers = useQuery({
    queryKey: ['viewers', selected, from],
    enabled: selected !== 'all',
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_named_viewers', {
        p_card_id: selected,
        p_from: from ?? undefined,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const chart = useMemo(() => {
    const byDay = new Map<string, { day: string; opens: number; qr: number }>();
    for (let i = 0; i < 30; i++) {
      const d = addDays(since30, i);
      byDay.set(d, { day: d.slice(5), opens: 0, qr: 0 });
    }
    for (const r of daily.data ?? []) {
      const e = byDay.get(r.day!);
      if (e) {
        e.opens += Number(r.views ?? 0) + Number(r.qr_opens ?? 0);
        e.qr += Number(r.qr_opens ?? 0);
      }
    }
    return [...byDay.values()];
  }, [daily.data, since30]);

  const linksChart = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of linkStats.data ?? []) m.set(r.link_kind, (m.get(r.link_kind) ?? 0) + Number(r.clicks));
    return [...m.entries()].map(([kind, clicks]) => ({ kind, clicks })).sort((a, b) => b.clicks - a.clicks);
  }, [linkStats.data]);

  if (cards.isLoading || !entitlements) return <Spinner />;
  const funnelAllowed = entitlements.crm_enabled;
  const selectedCard = cards.data?.find((c) => c.id === selected);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('nav.stats')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input w-auto!"
            aria-label={t('dash.myCards')}
            value={selected}
            onChange={(e) => setParams(e.target.value === 'all' ? {} : { card: e.target.value })}
          >
            <option value="all">{t('statsx.allCards')}</option>
            {(cards.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {displayName({
                  firstName: c.first_name,
                  lastName: c.last_name,
                  nameFormat: c.name_format as 'initial' | 'full',
                })}{' '}
                — /{c.slug}
              </option>
            ))}
          </select>
          {env.demoMode && selectedCard && (
            <a
              className="btn-secondary btn-sm"
              href={publicCardUrl(selectedCard.slug)}
              target="_blank"
              rel="noreferrer"
            >
              {t('statsx.demoGuest')}
            </a>
          )}
        </div>
      </div>
      <Tabs
        value={range}
        onChange={setRange}
        label={t('nav.stats')}
        items={(['today', '7d', '30d', 'all'] as const).map((r) => ({ id: r, label: t(`stats.range.${r}`) }))}
      />
      {stats.isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6" data-testid="kpis">
          <Stat label={t('stats.totalOpens')} value={total.total_opens} />
          <Stat label={t('stats.qrOpens')} value={total.qr_opens} />
          <Stat label={t('stats.uniqueVisitors')} value={total.unique_visitors} />
          <Stat label={t('stats.linkClicks')} value={total.link_clicks} />
          <Stat label={t('stats.contactSaves')} value={total.contact_saves} />
          <Stat label={t('stats.topLink')} value={linksChart[0]?.clicks ?? '—'} sub={linksChart[0]?.kind} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card animate-fade-up" aria-labelledby="c30">
          <h2 id="c30" className="mb-3 font-semibold">
            {t('statsx.chart30')}
          </h2>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={chart} margin={{ left: -20, right: 8 }}>
                <defs>
                  <linearGradient id="gOpens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors[0]} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={chartColors[0]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gQr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors[2]} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartColors[2]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#94a3b833" />
                <XAxis dataKey="day" fontSize={11} interval={4} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area
                  {...anim}
                  type="monotone"
                  dataKey="opens"
                  name={t('stats.totalOpens')}
                  stroke={chartColors[0]}
                  strokeWidth={2.5}
                  fill="url(#gOpens)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                />
                <Area
                  {...anim}
                  animationBegin={150}
                  type="monotone"
                  dataKey="qr"
                  name={t('stats.qrOpens')}
                  stroke={chartColors[2]}
                  strokeWidth={2.5}
                  fill="url(#gQr)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card animate-fade-up [animation-delay:90ms]" aria-labelledby="pl">
          <h2 id="pl" className="mb-3 font-semibold">
            {t('statsx.perLink')}
          </h2>
          {linksChart.length === 0 ? (
            <p className="text-sm text-slate-500">{t('statsx.noData')}</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={linksChart} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#94a3b833" />
                  <XAxis dataKey="kind" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#94a3b81a' }} />
                  <Bar {...anim} dataKey="clicks" name={t('stats.linkClicks')} radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {linksChart.map((l, i) => (
                      <Cell key={l.kind} fill={chartColors[i % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section className="card animate-fade-up [animation-delay:180ms]" aria-labelledby="fn">
        <h2 id="fn" className="mb-3 font-semibold">
          {t('stats.funnel')}
        </h2>
        {funnelAllowed ? <Funnel s={total} /> : <p className="text-sm text-slate-500">{t('statsx.funnelLocked')}</p>}
      </section>

      {selected !== 'all' && (
        <section className="card" aria-labelledby="nv">
          <h2 id="nv" className="mb-3 font-semibold">
            {t('statsx.namedViewers')}
          </h2>
          {(viewers.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">{t('statsx.noData')}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {viewers.data!.map((v) => (
                <li key={v.viewer_user_id} className="flex justify-between">
                  <span>{v.full_name}</span>
                  <span className="text-slate-500">
                    {Number(v.opens)} · {formatDate(v.last_seen, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
