// «Ойртуулж солилцох» — swap cards by tapping phones together (bump) or with a 6-digit code.
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { initials } from '@digitalcard/shared/format';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { useMyCards } from '@/lib/cards';
import { errorText } from '@/lib/errors';
import { accelerometerAvailable, currentCell, listenForBump, nearby, waitForMatch, type NearbyResult } from '@/lib/nearby';
import { Button, Card, Field, Loading, Notice, Screen, Txt } from '@/components/ui';
import { Appear, haptic, Icon, PressScale } from '@/components/motion';

type Mode = 'bump' | 'code';
type Phase = 'starting' | 'listening' | 'searching' | 'done' | 'noLocation';
type Matched = Extract<NearbyResult, { status: 'matched' }>;

function Ring({ progress, delay, color }: { progress: SharedValue<number>; delay: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const p = (progress.value + delay) % 1;
    return { opacity: 0.55 * (1 - p), transform: [{ scale: 0.6 + p * 1.2 }] };
  });
  return <Animated.View style={[{ position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 3, borderColor: color }, style]} />;
}

function Radar({ active, onPress, label }: { active: boolean; onPress: () => void; label: string }) {
  const th = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    if (active && !reduced) progress.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false));
    else progress.set(0);
  }, [active, reduced, progress]);
  return (
    <View style={{ height: 240, alignItems: 'center', justifyContent: 'center' }}>
      {active && !reduced ? [0, 0.33, 0.66].map((d) => <Ring key={d} progress={progress} delay={d} color={th.primary} />) : null}
      <PressScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: th.primary, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Icon name="nearby" color={th.onPrimary} size={40} />
          <Txt size={13} weight="700" style={{ color: th.onPrimary }}>
            {label}
          </Txt>
        </View>
      </PressScale>
    </View>
  );
}

function MatchedCard({ result, onAgain }: { result: Matched; onAgain: () => void }) {
  const { t } = useI18n();
  const th = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const [undone, setUndone] = useState(false);
  const p = result.partner;
  const name = p ? [p.last_name, p.first_name].filter(Boolean).join(' ') : '';
  const message = undone
    ? t('nearby.undone')
    : result.saved
      ? result.duplicate
        ? t('nearby.alreadySaved')
        : t('nearby.saved')
      : result.reason === 'contact_limit_reached'
        ? t('nearby.limit')
        : t('nearby.notSaved');
  return (
    <Appear>
      <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: th.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={30} weight="700" style={{ color: th.onPrimary }}>
            {p ? initials(p.first_name, p.last_name) : '?'}
          </Txt>
        </View>
        <Txt size={22} weight="700" style={{ textAlign: 'center' }}>
          {name}
        </Txt>
        {p?.title || p?.company ? (
          <Txt muted style={{ textAlign: 'center' }}>
            {[p.title, p.company].filter(Boolean).join(' · ')}
          </Txt>
        ) : null}
        <Notice text={message} tone={result.saved && !undone ? 'success' : 'info'} />
        <View style={{ alignSelf: 'stretch', gap: 8 }}>
          {p ? <Button title={t('nearby.openCard')} icon={<Icon name="link" color={th.onPrimary} size={18} />} onPress={() => router.push(`/c/${p.slug}`)} /> : null}
          {result.saved && result.contact_id && !undone ? (
            <Button title={t('nearby.openContact')} variant="secondary" icon={<Icon name="users" color={th.text} size={18} />} onPress={() => router.push(`/contact/${result.contact_id}`)} />
          ) : null}
          {result.saved && result.contact_id && !result.duplicate && !undone ? (
            <Button
              title={t('nearby.wrongPerson')}
              variant="ghost"
              onPress={async () => {
                await nearby.undo(result.contact_id!).catch(() => undefined);
                await qc.invalidateQueries({ queryKey: ['contacts'] });
                setUndone(true);
              }}
            />
          ) : null}
          <Button title={t('nearby.again')} variant="ghost" icon={<Icon name="refresh" color={th.primary} size={18} />} onPress={onAgain} />
        </View>
      </Card>
    </Appear>
  );
}

export default function Nearby() {
  const { t } = useI18n();
  const th = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const cards = useMyCards();
  const card = (cards.data ?? []).find((c) => c.is_published);
  const [mode, setMode] = useState<Mode>('bump');
  const [phase, setPhase] = useState<Phase>('starting');
  const [hint, setHint] = useState<string | null>(null);
  const [matched, setMatched] = useState<Matched | null>(null);
  const [myCode, setMyCode] = useState<{ code: string; until: number } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const cell = useRef<string | null>(null);
  const abort = useRef({ aborted: false });
  const searching = useRef(false);

  const finish = useCallback(
    async (r: NearbyResult) => {
      searching.current = false;
      if (r.status === 'matched') {
        haptic.success();
        setMatched(r);
        setMyCode(null);
        setPhase('done');
        await qc.invalidateQueries({ queryKey: ['contacts'] });
        return;
      }
      haptic.error();
      const key = {
        expired: 'nearby.noPartner',
        waiting: 'nearby.noPartner',
        ambiguous: 'nearby.ambiguous',
        rate_limited: 'nearby.rateLimited',
        not_found: 'nearby.codeNotFound',
        own_code: 'nearby.ownCode',
        invalid: 'nearby.noPartner',
        card_unavailable: 'nearby.noCard',
      }[r.status];
      setHint(t(key));
      setPhase((p) => (p === 'searching' ? 'listening' : p));
    },
    [qc, t],
  );

  const doBump = useCallback(async () => {
    if (!card || !cell.current || searching.current) return;
    searching.current = true;
    haptic.tap();
    setHint(null);
    setPhase('searching');
    try {
      const first = await nearby.bump(card.id, cell.current);
      await finish(first.status === 'waiting' ? await waitForMatch(first.pulse_id, abort.current) : first);
    } catch (e) {
      searching.current = false;
      setHint(errorText(t, e));
      setPhase('listening');
    }
  }, [card, finish, t]);

  // Location (coarse) once per visit; without it, offer the code instead.
  useEffect(() => {
    if (!card || mode !== 'bump' || phase !== 'starting') return;
    let alive = true;
    currentCell()
      .then((c) => {
        if (!alive) return;
        cell.current = c;
        setPhase(c ? 'listening' : 'noLocation');
      })
      .catch(() => alive && setPhase('noLocation'));
    return () => {
      alive = false;
    };
  }, [card, mode, phase]);

  // Accelerometer only while this screen is focused and listening.
  useFocusEffect(
    useCallback(() => {
      if (mode !== 'bump' || phase !== 'listening') return;
      let stop: (() => void) | null = null;
      let alive = true;
      void accelerometerAvailable().then((ok) => {
        if (ok && alive) stop = listenForBump(() => void doBump());
      });
      return () => {
        alive = false;
        stop?.();
      };
    }, [mode, phase, doBump]),
  );

  useEffect(() => {
    const signal = abort.current;
    return () => {
      signal.aborted = true;
    };
  }, []);

  useEffect(() => {
    if (!myCode) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.round((myCode.until - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [myCode]);

  if (cards.isLoading) return <Loading />;
  if (!card) {
    return (
      <Screen>
        <Notice text={t('nearby.noCard')} />
        <Button title={t('welcome.heroCta')} onPress={() => router.replace('/welcome')} />
      </Screen>
    );
  }

  const again = () => {
    setMatched(null);
    setHint(null);
    setTyped('');
    setPhase(cell.current ? 'listening' : 'starting');
  };

  const showCode = async () => {
    setBusy(true);
    setHint(null);
    try {
      const r = await nearby.createCode(card.id);
      if (r.status !== 'waiting' || !r.code) return void (await finish(r));
      setMyCode({ code: r.code, until: Date.now() + (r.expires_in ?? 120) * 1000 });
      setBusy(false);
      await finish(await waitForMatch(r.pulse_id, abort.current, 1500));
    } catch (e) {
      setHint(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const claim = async () => {
    setBusy(true);
    setHint(null);
    try {
      await finish(await nearby.claimCode(typed, card.id));
    } catch (e) {
      setHint(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: th.cardMuted, borderRadius: 14, padding: 4 }}>
        {(['bump', 'code'] as const).map((m) => (
          <View key={m} style={{ flex: 1 }}>
            <PressScale
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
              accessibilityLabel={t(`nearby.tab.${m}`)}
              onPress={() => {
                setMode(m);
                setHint(null);
                setMatched(null);
              }}
            >
              <View style={{ minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === m ? th.card : 'transparent' }}>
                <Txt weight="600" size={14} style={{ color: mode === m ? th.text : th.muted }}>
                  {t(`nearby.tab.${m}`)}
                </Txt>
              </View>
            </PressScale>
          </View>
        ))}
      </View>

      {matched ? (
        <MatchedCard result={matched} onAgain={again} />
      ) : mode === 'bump' ? (
        <>
          {phase === 'noLocation' ? (
            <>
              <Notice text={t('nearby.locationNeeded')} />
              <Button title={t('nearby.tab.code')} icon={<Icon name="hash" color={th.onPrimary} size={18} />} onPress={() => setMode('code')} />
            </>
          ) : (
            <Appear>
              <Card style={{ alignItems: 'center', gap: 6 }}>
                <Radar active={phase === 'listening' || phase === 'searching'} onPress={() => void doBump()} label={phase === 'searching' ? t('nearby.searching') : t('nearby.now')} />
                <Txt size={18} weight="700" style={{ textAlign: 'center' }}>
                  {phase === 'searching' ? t('nearby.searching') : t('nearby.bumpTitle')}
                </Txt>
                <Txt muted style={{ textAlign: 'center' }}>
                  {t('nearby.bumpBody')}
                </Txt>
              </Card>
            </Appear>
          )}
        </>
      ) : (
        <Appear>
          <Card style={{ gap: 12 }}>
            {myCode ? (
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Txt muted>{t('nearby.showThisCode')}</Txt>
                <View accessible accessibilityLabel={myCode.code.split('').join(' ')}>
                  <Txt size={44} weight="700" style={{ letterSpacing: 8, fontVariant: ['tabular-nums'] }} selectable>
                    {myCode.code}
                  </Txt>
                </View>
                <Txt muted size={13}>
                  {t('nearby.expiresIn', { s: secondsLeft })}
                </Txt>
              </View>
            ) : (
              <Button title={t('nearby.makeCode')} loading={busy && !typed} icon={<Icon name="hash" color={th.onPrimary} size={18} />} onPress={() => void showCode()} />
            )}
            <View style={{ height: 1, backgroundColor: th.border }} />
            <Field
              label={t('nearby.enterCode')}
              value={typed}
              onChangeText={(v) => setTyped(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              textContentType="oneTimeCode"
            />
            <Button title={t('nearby.exchange')} variant="secondary" disabled={typed.length !== 6} loading={busy && !!typed} onPress={() => void claim()} />
          </Card>
        </Appear>
      )}
      {hint ? <Notice text={hint} tone="error" /> : null}
      <Txt muted size={12} style={{ textAlign: 'center' }}>
        {t('nearby.privacy')}
      </Txt>
    </Screen>
  );
}
