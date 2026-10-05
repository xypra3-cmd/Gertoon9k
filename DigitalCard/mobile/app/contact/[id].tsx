import { useState } from 'react';
import { Alert, Linking, Share, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { buildVCard, vcardFileName } from '@digitalcard/shared/vcard';
import { contactSchema } from '@digitalcard/shared/validation';
import type { Contact } from '@digitalcard/shared/types';
import { useAuth } from '@/lib/auth';
import { useContacts, ubToday } from '@/lib/cards';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { errorText } from '@/lib/errors';
import { Button, Card, Field, Loading, Notice, Screen, Txt } from '@/components/ui';
import { Appear, haptic, Icon } from '@/components/motion';
import { photographCard, runAi, type AiResults } from '@/lib/ai';
import { useTheme } from '@/lib/theme';

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export default function ContactScreen() {
  const { id = 'new', scan } = useLocalSearchParams<{
    id: string;
    scan?: string;
  }>();
  const contacts = useContacts();
  const existing = contacts.data?.rows.find((c) => c.id === id) ?? null;
  if (id !== 'new' && !existing) return <Loading />;
  // key → the form re-initialises from the loaded contact without setState-in-effect
  return <ContactForm key={existing?.id ?? 'new'} id={id} existing={existing} startScan={scan === '1'} />;
}

function ContactForm({ id, existing, startScan }: { id: string; existing: Contact | null; startScan: boolean }) {
  const isNew = id === 'new';
  const { t, locale } = useI18n();
  const th = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { session, entitlements, refresh } = useAuth();
  const crm = !!entitlements?.crm_enabled;
  const [v, setV] = useState<Record<string, string>>(
    (): Record<string, string> =>
      existing
        ? {
            name: existing.name,
            company: existing.company ?? '',
            title: existing.title ?? '',
            phone: existing.phone ?? '',
            email: existing.email ?? '',
            note: existing.note ?? '',
            follow_up_at: existing.follow_up_at ?? '',
          }
        : {},
  );
  const [msg, setMsg] = useState<{
    tone: 'error' | 'success';
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const [ai, setAi] = useState<'' | 'scan' | 'note' | 'followup'>('');
  const [noteAi, setNoteAi] = useState<AiResults['note'] | null>(null);
  const [draft, setDraft] = useState<AiResults['followup'] | null>(null);
  const [scanStarted, setScanStarted] = useState(false);

  const set = (k: string) => (text: string) => setV((o) => ({ ...o, [k]: text }));

  const aiFail = (e: unknown) => {
    haptic.error();
    setMsg({ tone: 'error', text: errorText(t, e) });
  };

  const scanCard = async () => {
    setMsg(null);
    const photo = await photographCard();
    if (!photo) return;
    setAi('scan');
    try {
      const r = await runAi('scan', { image_base64: photo.data, media_type: photo.mediaType }, locale);
      setV((o) => ({
        ...o,
        name: [r.last_name, r.first_name].filter(Boolean).join(' ') || o.name || '',
        title: r.title || o.title || '',
        company: r.company || o.company || '',
        phone: r.phone || o.phone || '',
        email: r.email || o.email || '',
      }));
      haptic.success();
      setMsg({ tone: 'success', text: t('ai.scanReady') });
      refresh();
    } catch (e) {
      aiFail(e);
    } finally {
      setAi('');
    }
  };
  if (isNew && startScan && !scanStarted) {
    setScanStarted(true);
    setTimeout(() => void scanCard(), 300);
  }

  const summarize = async () => {
    setAi('note');
    try {
      setNoteAi(await runAi('note', { note: v.note ?? '', name: v.name ?? '', company: v.company ?? '' }, locale));
      haptic.success();
      refresh();
    } catch (e) {
      aiFail(e);
    } finally {
      setAi('');
    }
  };

  const applyNote = () => {
    if (!noteAi) return;
    const days = Math.min(60, Math.max(1, Math.round(noteAi.follow_up_days || 3)));
    setV((o) => ({
      ...o,
      follow_up_at: addDays(ubToday(), days),
      note: `${o.note ?? ''}\n— ${noteAi.summary}\n→ ${noteAi.next_step}`.trim(),
    }));
    setNoteAi(null);
  };

  const draftFollowup = async () => {
    setAi('followup');
    try {
      setDraft(
        await runAi(
          'followup',
          {
            name: v.name ?? '',
            company: v.company ?? '',
            note: v.note ?? '',
            channel: v.email ? 'email' : 'sms',
          },
          locale,
        ),
      );
      haptic.success();
      refresh();
    } catch (e) {
      aiFail(e);
    } finally {
      setAi('');
    }
  };
  const done = () => {
    void qc.invalidateQueries({ queryKey: ['contacts'] });
    refresh();
  };

  const save = async () => {
    setMsg(null);
    const parsed = contactSchema.safeParse({
      ...v,
      follow_up_at: v.follow_up_at || null,
      note: v.note ?? '',
    });
    if (!parsed.success)
      return setMsg({
        tone: 'error',
        text: t(parsed.error.issues[0]!.message),
      });
    const d = parsed.data;
    const row = {
      name: d.name,
      company: d.company ?? null,
      title: d.title ?? null,
      phone: d.phone ?? null,
      email: d.email ?? null,
      ...(crm ? { note: d.note ?? null, follow_up_at: d.follow_up_at ?? null } : {}),
    };
    setBusy(true);
    const res = isNew ? await supabase.from('contacts').insert({ ...row, owner_id: session!.user.id, source: 'manual' }) : await supabase.from('contacts').update(row).eq('id', id);
    setBusy(false);
    if (res.error) return setMsg({ tone: 'error', text: errorText(t, res.error) });
    done();
    if (isNew) router.back();
    else setMsg({ tone: 'success', text: t('m.saved') });
  };

  const markContacted = async () => {
    const { error } = await supabase
      .from('contacts')
      .update({
        last_contacted_at: new Date().toISOString(),
        follow_up_at: null,
      })
      .eq('id', id);
    if (error) return setMsg({ tone: 'error', text: errorText(t, error) });
    setV((o) => ({ ...o, follow_up_at: '' }));
    done();
  };

  const remove = () =>
    Alert.alert(t('common.delete'), existing?.name ?? '', [
      { text: t('m.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('contacts').delete().eq('id', id);
          if (error) return setMsg({ tone: 'error', text: errorText(t, error) });
          done();
          router.back();
        },
      },
    ]);

  const shareVcf = async (c: Contact) => {
    const vcf = buildVCard({
      firstName: c.name,
      lastName: null,
      nameFormat: 'full',
      title: c.title,
      company: c.company,
      phone: c.phone,
      email: c.email,
      website: c.website?.startsWith('https://') ? c.website : null,
      address: null,
      bio: null,
      links: [],
    });
    const file = new File(Paths.cache, vcardFileName(c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'contact'));
    if (file.exists) file.delete();
    file.create();
    file.write(vcf);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/vcard',
      dialogTitle: c.name,
      UTI: 'public.vcard',
    });
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? t('m.newContact') : (existing?.name ?? '') }} />
      {existing?.exchange_message ? <Notice text={existing.exchange_message} /> : null}
      {isNew ? (
        <Button
          title={ai === 'scan' ? t('ai.scanning') : t('ai.scanCard')}
          variant="ai"
          loading={ai === 'scan'}
          icon={<Icon name="camera" color={th.accent} size={18} />}
          onPress={() => void scanCard()}
        />
      ) : null}
      <Field label={`${t('exchange.name')} *`} value={v.name ?? ''} onChangeText={set('name')} />
      <Field label={t('card.company')} value={v.company ?? ''} onChangeText={set('company')} />
      <Field label={t('card.title')} value={v.title ?? ''} onChangeText={set('title')} />
      <Field label={t('card.phone')} value={v.phone ?? ''} onChangeText={set('phone')} keyboardType="phone-pad" />
      <Field label={t('card.email')} value={v.email ?? ''} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
      {crm ? (
        <>
          <Field label={t('contacts.note')} value={v.note ?? ''} onChangeText={set('note')} multiline style={{ minHeight: 96 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button
                title={t('ai.summarize')}
                variant="ai"
                disabled={!!ai || !(v.note ?? '').trim()}
                loading={ai === 'note'}
                icon={<Icon name="sparkles" color={th.accent} size={16} />}
                onPress={() => void summarize()}
              />
            </View>
            {!isNew ? (
              <View style={{ flex: 1 }}>
                <Button
                  title={t('ai.draftFollowup')}
                  variant="ai"
                  disabled={!!ai}
                  loading={ai === 'followup'}
                  icon={<Icon name="send" color={th.accent} size={16} />}
                  onPress={() => void draftFollowup()}
                />
              </View>
            ) : null}
          </View>
          {noteAi ? (
            <Appear>
              <Card style={{ borderColor: `${th.accent}55` }}>
                <Txt size={14}>
                  <Txt size={14} weight="700">
                    {t('ai.summary')}:{' '}
                  </Txt>
                  {noteAi.summary}
                </Txt>
                <Txt size={14}>
                  <Txt size={14} weight="700">
                    {t('ai.nextStep')}:{' '}
                  </Txt>
                  {noteAi.next_step} · {t('ai.inDays', { n: noteAi.follow_up_days })}
                </Txt>
                <Txt muted size={13}>
                  {noteAi.tags.map((x) => `#${x}`).join(' ')}
                </Txt>
                <Button title={t('ai.apply')} onPress={applyNote} />
              </Card>
            </Appear>
          ) : null}
          {draft ? (
            <Appear>
              <Card style={{ borderColor: `${th.accent}55` }}>
                {draft.subject ? <Txt weight="700">{draft.subject}</Txt> : null}
                <Txt size={14} selectable>
                  {draft.message}
                </Txt>
                <Button title={t('common.share')} onPress={() => void Share.share({ message: draft.message })} />
                {v.email ? (
                  <Button
                    title={t('ai.openMail')}
                    variant="secondary"
                    onPress={() => void Linking.openURL(`mailto:${v.email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.message)}`)}
                  />
                ) : null}
              </Card>
            </Appear>
          ) : null}
          <Field label={`${t('contacts.followUp')} (YYYY-MM-DD)`} value={v.follow_up_at ?? ''} onChangeText={set('follow_up_at')} placeholder={ubToday()} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[3, 7, 14].map((n) => (
              <View key={n} style={{ flex: 1 }}>
                <Button title={`+${n}`} variant="secondary" accessibilityLabel={`${t('contacts.followUp')} +${n}`} onPress={() => setV((o) => ({ ...o, follow_up_at: addDays(ubToday(), n) }))} />
              </View>
            ))}
          </View>
        </>
      ) : null}
      {msg ? <Notice tone={msg.tone} text={msg.text} /> : null}
      <Button title={t('common.save')} onPress={() => void save()} loading={busy} />
      {!isNew && existing ? (
        <>
          {crm ? <Button title={t('contacts.contacted')} variant="secondary" onPress={() => void markContacted()} /> : null}
          <Button title={t('m.shareVcf')} variant="secondary" onPress={() => void shareVcf(existing)} />
          <Button title={t('common.delete')} variant="danger" onPress={remove} />
          <Txt muted size={12}>
            {t(`contacts.source.${existing.source}`)}
          </Txt>
        </>
      ) : null}
    </Screen>
  );
}
