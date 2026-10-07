// «Эвент горим» on the phone: start/stop an event; the database stamps every new contact (0013).
// Hidden for plans without CRM (no upsell inside the app — store rules).
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { palette } from '@digitalcard/shared/design';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { errorText } from '@/lib/errors';
import { AnimatedNumber, Appear, haptic, Icon, PressScale } from './motion';
import { Button, Card, Txt } from './ui';
import { font } from '@/lib/fonts';
import { syncEventActivity } from '@/lib/liveActivity';

interface MyEvent {
  name: string;
  until: string;
  active: boolean;
  contacts: number;
}

const HOURS = [4, 8, 12, 24] as const;

export function EventMode() {
  const { t } = useI18n();
  const th = useTheme();
  const qc = useQueryClient();
  const { entitlements } = useAuth();
  const enabled = entitlements?.crm_enabled ?? false;
  const ev = useQuery({
    queryKey: ['my-event'],
    enabled,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_event');
      if (error) throw error;
      return (data as unknown as MyEvent | null) ?? null;
    },
  });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [hours, setHours] = useState<number>(8);
  const [error, setError] = useState<string | null>(null);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['my-event'] }), qc.invalidateQueries({ queryKey: ['contacts'] })]);
  const start = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase.rpc('start_event', { p_name: name.trim(), p_hours: hours });
      if (e) throw e;
    },
    onSuccess: () => {
      haptic.success();
      setOpen(false);
      setName('');
      setError(null);
      void refresh();
    },
    onError: (e) => setError(errorText(t, e)),
  });
  const stop = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase.rpc('stop_event');
      if (e) throw e;
    },
    onSuccess: () => void refresh(),
  });

  const current = ev.data;
  // Lock screen / Dynamic Island while the event runs (iOS); ends together with the event.
  const live = current ? `${current.active}|${current.name}|${current.until}|${current.contacts}` : 'none';
  useEffect(() => {
    if (!enabled || ev.isPending) return;
    void syncEventActivity(current ?? null, t('event.met'));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `live` captures every field that matters
  }, [enabled, live]);

  if (!enabled) return null;

  if (current?.active) {
    const d = new Date(current.until);
    const until = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return (
      <Appear>
        <View style={{ borderRadius: 20, padding: 16, backgroundColor: palette.accent[600], gap: 8 }} accessibilityLiveRegion="polite">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Txt size={13} style={{ color: '#FFFFFFCC' }}>
                {t('event.live', { until })}
              </Txt>
              <Txt size={20} weight="700" style={{ color: '#FFFFFF' }}>
                {current.name}
              </Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AnimatedNumber value={current.contacts} style={{ color: '#FFFFFF', fontSize: 28, ...font('700') }} />
              <Txt size={12} style={{ color: '#FFFFFFCC' }}>
                {t('event.met')}
              </Txt>
            </View>
          </View>
          <PressScale accessibilityRole="button" accessibilityLabel={t('event.stop')} onPress={() => stop.mutate()}>
            <View style={{ alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Txt weight="700" size={14} style={{ color: palette.accent[600] }}>
                {t('event.stop')}
              </Txt>
            </View>
          </PressScale>
        </View>
      </Appear>
    );
  }

  return (
    <Appear>
      <Card>
        <PressScale accessibilityRole="button" accessibilityLabel={t('event.title')} accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: th.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="calendar" color={th.accent} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt weight="700">{t('event.title')}</Txt>
              <Txt muted size={13}>
                {current ? t('event.last', { name: current.name, n: current.contacts }) : t('event.short')}
              </Txt>
            </View>
            <Icon name="chevronRight" color={th.muted} size={18} />
          </View>
        </PressScale>
        {open ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            <TextInput
              accessibilityLabel={t('event.name')}
              placeholder={t('event.placeholder')}
              placeholderTextColor={th.muted}
              value={name}
              onChangeText={setName}
              maxLength={80}
              style={{ minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: th.border, paddingHorizontal: 12, color: th.text, backgroundColor: th.card, fontSize: 16 }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {HOURS.map((h) => (
                <View key={h} style={{ flex: 1 }}>
                  <PressScale accessibilityRole="radio" accessibilityState={{ selected: hours === h }} accessibilityLabel={t('event.hours', { n: h })} onPress={() => setHours(h)}>
                    <View
                      style={{
                        minHeight: 40,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: hours === h ? th.primary : th.border,
                        backgroundColor: hours === h ? th.primarySoft : 'transparent',
                      }}
                    >
                      <Txt size={14} weight="600" style={{ color: hours === h ? th.primary : th.text }}>
                        {t('event.hours', { n: h })}
                      </Txt>
                    </View>
                  </PressScale>
                </View>
              ))}
            </View>
            <Button title={t('event.start')} disabled={!name.trim()} loading={start.isPending} onPress={() => start.mutate()} />
            {error ? (
              <Txt size={13} style={{ color: th.danger }}>
                {error}
              </Txt>
            ) : null}
          </View>
        ) : null}
      </Card>
    </Appear>
  );
}
