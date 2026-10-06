// «Эвент горим»: while on, every new contact is stamped with the event in the database (0013).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/I18nProvider';
import { useErrorText } from '@/lib/useErrorText';
import { Icon } from '@/components/icons';
import { AnimatedNumber } from '@/components/motion';

export interface MyEvent {
  name: string;
  started_at: string;
  until: string;
  active: boolean;
  contacts: number;
}

export function useMyEvent(enabled: boolean) {
  return useQuery({
    queryKey: ['my-event'],
    enabled,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_event');
      if (error) throw error;
      return (data as unknown as MyEvent | null) ?? null;
    },
  });
}

const HOURS = [4, 8, 12, 24, 48] as const;

export function EventMode({ crmEnabled }: { crmEnabled: boolean }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const qc = useQueryClient();
  const ev = useMyEvent(crmEnabled);
  const [name, setName] = useState('');
  const [hours, setHours] = useState<number>(8);
  const [error, setError] = useState<string | null>(null);
  const refresh = () =>
    Promise.all([qc.invalidateQueries({ queryKey: ['my-event'] }), qc.invalidateQueries({ queryKey: ['contacts'] })]);
  const start = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase.rpc('start_event', { p_name: name.trim(), p_hours: hours });
      if (e) throw e;
    },
    onSuccess: () => {
      setError(null);
      setName('');
      void refresh();
    },
    onError: (e) => setError(errorText(e)),
  });
  const stop = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase.rpc('stop_event');
      if (e) throw e;
    },
    onSuccess: () => void refresh(),
    onError: (e) => setError(errorText(e)),
  });

  if (!crmEnabled) {
    return (
      <section className="card flex flex-wrap items-center justify-between gap-3" data-testid="event-locked">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-violet-50 p-2.5 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
            <Icon name="calendar" width={22} height={22} />
          </span>
          <div>
            <p className="font-semibold">{t('event.title')}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('event.lockedBody')}</p>
          </div>
        </div>
        <Link to="/app/billing" className="btn-secondary btn-sm">
          <Icon name="lock" width={14} height={14} /> {t('event.unlock')}
        </Link>
      </section>
    );
  }

  const current = ev.data;
  if (current?.active) {
    const d = new Date(current.until);
    const until = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return (
      <section
        className="card animate-fade-up relative overflow-hidden bg-gradient-to-r from-violet-600 to-brand-600 text-white"
        data-testid="event-active"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-300 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-400" />
            </span>
            <div>
              <p className="text-sm text-white/80">{t('event.live', { until })}</p>
              <p className="text-xl font-bold">{current.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-3xl font-bold">
                <AnimatedNumber value={current.contacts} />
              </p>
              <p className="text-xs text-white/80">{t('event.met')}</p>
            </div>
            <button
              type="button"
              className="btn bg-white text-violet-700 hover:bg-violet-50"
              disabled={stop.isPending}
              onClick={() => stop.mutate()}
            >
              {t('event.stop')}
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm text-white/85">{t('event.liveHint')}</p>
        {error && <p className="mt-2 text-sm text-red-100">{error}</p>}
      </section>
    );
  }

  return (
    <section className="card space-y-3" data-testid="event-start">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-violet-50 p-2.5 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
          <Icon name="calendar" width={22} height={22} />
        </span>
        <div>
          <p className="font-semibold">{t('event.title')}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('event.body')}</p>
        </div>
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) start.mutate();
        }}
      >
        <input
          className="input min-w-[12rem] flex-1"
          placeholder={t('event.placeholder')}
          aria-label={t('event.name')}
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="input w-auto"
          aria-label={t('event.duration')}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {t('event.hours', { n: h })}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary" disabled={!name.trim() || start.isPending}>
          {t('event.start')}
        </button>
      </form>
      {current && !current.active && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('event.last', { name: current.name, n: current.contacts })}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
