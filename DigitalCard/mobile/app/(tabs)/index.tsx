import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Brightness from 'expo-brightness';
import * as Clipboard from 'expo-clipboard';
import { displayName } from '@digitalcard/shared/format';
import { buildCompactVCard } from '@digitalcard/shared/vcard';
import { useAuth } from '@/lib/auth';
import { fromCardRow, rangeStartIso, ubToday, useContacts, useMyCards } from '@/lib/cards';
import { supabase } from '@/lib/supabase';
import { font } from '@/lib/fonts';
import { palette } from '@digitalcard/shared/design';
import type { IconName } from '@digitalcard/shared/icons';
import { publicCardUrl } from '@/lib/env';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { Button, Card, Loading, Notice, Screen, Txt } from '@/components/ui';
import { GettingStarted } from '@/components/GettingStarted';
import { WalletBack, WalletFront } from '@/components/WalletCard';
import { FlipCard } from '@/components/FlipCard';
import { EventMode } from '@/components/EventMode';
import { AnimatedNumber, Appear, haptic, Icon, PressScale } from '@/components/motion';
import { Avatar } from '@/components/Avatar';

/** Raise screen brightness only while the QR side is visible; restore otherwise (helps scanners in daylight). */
function useQrBrightness(showingQr: boolean) {
  useFocusEffect(
    useCallback(() => {
      if (!showingQr) return;
      let previous: number | null = null;
      let active = true;
      (async () => {
        try {
          if (!(await Brightness.isAvailableAsync())) return;
          previous = await Brightness.getBrightnessAsync();
          if (active) await Brightness.setBrightnessAsync(1);
        } catch {
          /* not supported (simulator) */
        }
      })();
      return () => {
        active = false;
        if (Platform.OS === 'android') void Brightness.restoreSystemBrightnessAsync().catch(() => undefined);
        else if (previous !== null) void Brightness.setBrightnessAsync(previous).catch(() => undefined);
      };
    }, [showingQr]),
  );
}

function TodayFollowups() {
  const { t } = useI18n();
  const th = useTheme();
  const router = useRouter();
  const contacts = useContacts();
  const today = ubToday();
  const due = useMemo(() => (contacts.data?.rows ?? []).filter((c) => c.follow_up_at && c.follow_up_at <= today && c.status !== 'closed').slice(0, 5), [contacts.data, today]);
  if (due.length === 0) return null;
  return (
    <Appear index={2}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="calendar" color={th.primary} size={18} />
          <Txt weight="700">{t('m.todayFollowups', { n: due.length })}</Txt>
        </View>
        {due.map((c) => (
          <PressScale key={c.id} accessibilityRole="button" accessibilityLabel={c.name} onPress={() => router.push(`/contact/${c.id}`)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: th.border }}>
              <View style={{ flex: 1 }}>
                <Txt weight="600">{c.name}</Txt>
                {c.company ? (
                  <Txt muted size={13}>
                    {c.company}
                  </Txt>
                ) : null}
              </View>
              <Txt size={13} style={{ color: c.follow_up_at! < today ? th.danger : th.primary }}>
                {c.follow_up_at! < today ? t('contacts.overdue') : t('m.today')}
              </Txt>
            </View>
          </PressScale>
        ))}
      </Card>
    </Appear>
  );
}

/** Last-7-days glance for the selected card (same RPC as the Stats tab). */
function useWeekGlance(cardId: string | undefined) {
  return useQuery({
    queryKey: ['home-glance', cardId],
    enabled: !!cardId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_card_stats', { p_card_ids: [cardId!], p_from: rangeStartIso(7) ?? undefined });
      if (error) throw error;
      const r = data?.[0];
      return { opens: Number(r?.total_opens ?? 0), qr: Number(r?.qr_opens ?? 0), saves: Number(r?.contact_saves ?? 0) };
    },
  });
}

function QuickAction({ icon, label, onPress, tone, disabled }: { icon: IconName; label: string; onPress: () => void; tone: string; disabled?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <PressScale accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}>
        <View style={{ alignItems: 'center', gap: 8, opacity: disabled ? 0.4 : 1 }}>
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: tone,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: tone,
              shadowOpacity: 0.35,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 5 },
              elevation: 4,
            }}
          >
            <Icon name={icon} color="#FFFFFF" size={24} />
          </View>
          <Txt size={12} weight="600" numberOfLines={1}>
            {label}
          </Txt>
        </View>
      </PressScale>
    </View>
  );
}

function Stat({ value, label, onPress }: { value: number; label: string; onPress: () => void }) {
  const th = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <PressScale accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress}>
        <View style={{ padding: 14, borderRadius: 18, backgroundColor: th.card, borderWidth: StyleSheet.hairlineWidth, borderColor: th.border, gap: 2 }}>
          <AnimatedNumber value={value} style={{ color: th.text, fontSize: 24, ...font('800') }} />
          <Txt muted size={12} weight="500" numberOfLines={2}>
            {label}
          </Txt>
        </View>
      </PressScale>
    </View>
  );
}

export default function MyCard() {
  const { t } = useI18n();
  const th = useTheme();
  const router = useRouter();
  const { entitlements, profile } = useAuth();
  const cards = useMyCards();
  const contacts = useContacts();
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [qrMode, setQrMode] = useState<'link' | 'vcard'>('link');
  const [showingQr, setShowingQr] = useState(false);
  const [flipKeys, setFlipKeys] = useState<Record<string, number>>({});
  const { width: screenW } = useWindowDimensions();
  // Clock values are read once when the screen mounts (render must stay pure).
  const [openedAt] = useState(() => ({ hour: new Date().getHours(), weekAgo: new Date(Date.now() - 7 * 864e5).toISOString() }));
  useQrBrightness(showingQr);

  const all = cards.data ?? [];
  const published = all.filter((c) => c.is_published);
  const card = published[Math.min(index, Math.max(published.length - 1, 0))];
  const glance = useWeekGlance(card?.id);
  const newPeople = (contacts.data?.rows ?? []).filter((c) => c.created_at >= openedAt.weekAgo).length;
  const firstName = card?.first_name || (profile?.full_name ?? '').trim().split(/\s+/)[0] || '';
  const greeting = t(openedAt.hour < 12 ? 'm.home.morning' : openedAt.hour < 18 ? 'm.home.day' : 'm.home.evening');

  if (cards.isLoading) return <Loading />;

  if (!card) {
    const draft = all[0];
    return (
      <Screen title={t('tabs.card')}>
        <Appear>
          <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 28 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: th.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="sparkles" color={th.primary} size={30} />
            </View>
            <Txt size={22} weight="700" style={{ textAlign: 'center' }}>
              {draft ? t('m.publishTitle') : t('welcome.heroTitle')}
            </Txt>
            <Txt muted style={{ textAlign: 'center' }}>
              {draft ? t('m.publishBody') : t('welcome.heroBody')}
            </Txt>
            <View style={{ alignSelf: 'stretch' }}>
              <Button title={draft ? t('m.editCard') : t('welcome.heroCta')} onPress={() => router.push(draft ? `/edit/${draft.id}` : '/welcome')} />
            </View>
          </Card>
        </Appear>
        <GettingStarted />
      </Screen>
    );
  }

  const url = publicCardUrl(card.slug);
  const editable = entitlements?.editable_card_ids.includes(card.id) ?? false;
  const share = () => void Share.share({ message: url, url });
  const flipCurrent = () => setFlipKeys((k) => ({ ...k, [card.id]: (k[card.id] ?? 0) + 1 }));

  return (
    <Screen
      title={firstName || t('tabs.card')}
      subtitle={greeting}
      right={
        <PressScale accessibilityRole="button" accessibilityLabel={t('tabs.settings')} onPress={() => router.push('/settings')}>
          <Avatar name={displayName({ firstName: card.first_name, lastName: card.last_name, nameFormat: 'full' })} size={46} />
        </PressScale>
      }
    >
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -16, marginBottom: -18 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 28 }}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / screenW);
          if (i !== index) {
            haptic.tap();
            setIndex(i);
            setShowingQr(false);
          }
        }}
      >
        {published.map((c) => {
          const d = fromCardRow(c, c.card_links ?? []);
          const u = publicCardUrl(c.slug);
          return (
            <View key={c.id} style={{ width: screenW, paddingHorizontal: 16 }}>
              <FlipCard
                label={t('m.flipHint')}
                flipKey={flipKeys[c.id] ?? 0}
                onFlip={(side) => setShowingQr(side === 'back')}
                front={<WalletFront data={d} />}
                back={
                  <WalletBack data={d} qrValue={qrMode === 'link' ? publicCardUrl(c.slug, 'qr') : buildCompactVCard({ ...d, publicUrl: u })} ecl={qrMode === 'link' ? 'M' : 'L'}>
                    <View accessibilityRole="tablist" style={{ alignSelf: 'flex-start', flexDirection: 'row', backgroundColor: '#F1F3F7', borderRadius: 10, padding: 3, marginTop: 4 }}>
                      {(['link', 'vcard'] as const).map((m) => (
                        <Pressable
                          key={m}
                          accessibilityRole="tab"
                          accessibilityState={{ selected: qrMode === m }}
                          accessibilityLabel={t(`m.qr.${m}`)}
                          onPress={() => {
                            haptic.tap();
                            setQrMode(m);
                          }}
                          style={{ paddingHorizontal: 9, minHeight: 30, justifyContent: 'center', borderRadius: 8, backgroundColor: qrMode === m ? '#FFFFFF' : 'transparent' }}
                        >
                          <Txt size={11} weight="700" style={{ color: qrMode === m ? '#0B1220' : '#6B7486' }}>
                            {t(`m.qr.${m}Short`)}
                          </Txt>
                        </Pressable>
                      ))}
                    </View>
                    <Txt size={11} style={{ color: '#6B7486' }}>
                      {qrMode === 'link' ? t('m.qr.linkHint') : t('m.qr.vcardShortHint')}
                    </Txt>
                  </WalletBack>
                }
              />
            </View>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: -2 }}>
        {published.length > 1
          ? published.map((c, i) => <View key={c.id} style={{ width: i === index ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === index ? th.primary : th.border }} />)
          : null}
        <Txt muted size={12}>
          {showingQr ? t('m.flipBack') : published.length > 1 ? t('m.swipeHint') : t('m.flipHint')}
        </Txt>
      </View>

      <Appear index={1}>
        <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
          <QuickAction icon="qr" label={showingQr ? t('m.home.card') : t('m.home.qr')} tone={palette.brand[600]} onPress={flipCurrent} />
          <QuickAction icon="share" label={t('common.share')} tone={palette.success[500]} onPress={share} />
          <QuickAction icon="nearby" label={t('m.home.nearby')} tone={palette.accent[500]} onPress={() => router.push('/nearby')} />
          <QuickAction icon="pen" label={t('m.home.edit')} tone={palette.warning[500]} disabled={!editable} onPress={() => router.push(`/edit/${card.id}`)} />
        </View>
      </Appear>

      <Appear index={2}>
        <PressScale
          accessibilityRole="button"
          accessibilityLabel={copied ? t('common.copied') : t('common.copyLink')}
          onPress={async () => {
            await Clipboard.setStringAsync(url);
            haptic.success();
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 48, borderRadius: 16, backgroundColor: th.cardMuted }}>
            <Icon name="link" color={th.muted} size={16} />
            <Txt size={14} weight="500" numberOfLines={1} style={{ flex: 1 }}>
              {url.replace(/^https?:\/\//, '')}
            </Txt>
            <Icon name={copied ? 'check' : 'copy'} color={copied ? th.success : th.primary} size={18} />
          </View>
        </PressScale>
      </Appear>

      <Appear index={3}>
        <Txt weight="700" size={18} style={{ marginTop: 4 }}>
          {t('m.home.week')}
        </Txt>
      </Appear>
      <Appear index={3}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stat value={glance.data?.opens ?? 0} label={t('m.home.opens')} onPress={() => router.push('/stats')} />
          <Stat value={glance.data?.qr ?? 0} label={t('m.home.qrScans')} onPress={() => router.push('/stats')} />
          <Stat value={newPeople} label={t('m.home.newPeople')} onPress={() => router.push('/contacts')} />
        </View>
      </Appear>

      {!editable ? <Notice text={t('m.noEditRights')} /> : null}
      <EventMode />
      <TodayFollowups />
      <GettingStarted />
    </Screen>
  );
}
