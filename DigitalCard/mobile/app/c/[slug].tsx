// A scanned / deep-linked card (https://<domain>/c/<slug> opens here when the app is installed).
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { displayName } from '@digitalcard/shared/format';
import { fetchPublicCard, toCardData } from '@/lib/cards';
import { publicCardUrl } from '@/lib/env';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/track';
import { openAppSettings, saveToPhone } from '@/lib/phoneContacts';
import { errorText } from '@/lib/errors';
import { Button, Card, Loading, Notice, Screen, Txt } from '@/components/ui';

export default function ScannedCard() {
  const { slug = '', src } = useLocalSearchParams<{ slug: string; src?: string }>();
  const { t } = useI18n();
  const { session, refresh } = useAuth();
  const [msg, setMsg] = useState<{ tone: 'success' | 'error' | 'info'; text: string; settings?: boolean } | null>(null);
  const q = useQuery({ queryKey: ['public-card', slug], queryFn: () => fetchPublicCard(slug.toLowerCase()) });

  useEffect(() => {
    if (q.data) void trackEvent(slug, src === 'qr' ? 'qr_open' : 'view');
  }, [q.data, slug, src]);

  if (q.isLoading) return <Loading />;
  if (!q.data) {
    return (
      <Screen>
        <Notice tone="error" text={t('m.notFound')} />
      </Screen>
    );
  }
  const card = toCardData(q.data);
  const name = displayName(card);
  const tel = card.phone?.replace(/[^0-9+]/g, '');

  const save = async () => {
    const r = await saveToPhone(card, publicCardUrl(card.slug));
    if (r === 'denied') setMsg({ tone: 'error', text: t('m.contactsDenied'), settings: true });
    if (r === 'saved') {
      setMsg({ tone: 'success', text: t('m.saved') });
      void trackEvent(slug, 'contact_save');
    }
  };

  const addToMine = async () => {
    const { error } = await supabase.from('contacts').insert({
      owner_id: session!.user.id,
      card_id: q.data!.id,
      name: name.slice(0, 120),
      title: card.title,
      company: card.company,
      phone: card.phone,
      email: card.email,
      website: card.website,
      source: 'qr',
    });
    setMsg(error ? { tone: 'error', text: errorText(t, error) } : { tone: 'success', text: t('m.addedToMine') });
    if (!error) refresh();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: name }} />
      <Card>
        <Txt size={24} weight="700">
          {name}
        </Txt>
        {card.title ? <Txt>{card.title}</Txt> : null}
        {card.company ? <Txt muted>{card.company}</Txt> : null}
        {card.phone ? <Txt selectable>{card.phone}</Txt> : null}
        {card.email ? <Txt selectable>{card.email}</Txt> : null}
      </Card>
      {msg ? <Notice tone={msg.tone} text={msg.text} /> : null}
      {msg?.settings ? <Button title={t('m.openSettings')} variant="secondary" onPress={() => void openAppSettings()} /> : null}
      <Button title={t('card.saveToPhone')} onPress={() => void save()} />
      {session ? <Button title={t('card.addToMyContacts')} variant="secondary" onPress={() => void addToMine()} /> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {tel ? (
          <View style={{ flex: 1 }}>
            <Button title={t('card.call')} variant="secondary" onPress={() => void Linking.openURL(`tel:${tel}`)} />
          </View>
        ) : null}
        {card.email ? (
          <View style={{ flex: 1 }}>
            <Button title={t('card.sendEmail')} variant="secondary" onPress={() => void Linking.openURL(`mailto:${card.email}`)} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
