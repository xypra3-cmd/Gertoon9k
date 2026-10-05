// First-run wizard (same flow as the web): about you → design (live preview) → publish. ~60 seconds.
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import { generateSlug } from '@digitalcard/shared/format';
import { TEMPLATES, type TemplateId } from '@digitalcard/shared/templates';
import { useAuth } from '@/lib/auth';
import { fromCardRow } from '@/lib/cards';
import { publicCardUrl } from '@/lib/env';
import { useI18n } from '@/lib/i18n';
import { errorText } from '@/lib/errors';
import { runAi } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Button, Card, Field, Notice, Screen, Txt } from '@/components/ui';
import { CardView } from '@/components/CardView';
import { Appear, haptic, Icon } from '@/components/motion';

type Step = 0 | 1 | 2;

export default function Welcome() {
  const { t, locale } = useI18n();
  const th = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { session, profile, refresh } = useAuth();
  const full = profile?.full_name?.trim() ?? '';
  const parts = full.split(/\s+/).filter(Boolean);
  const [step, setStep] = useState<Step>(0);
  const [lastName, setLastName] = useState(parts.length > 1 ? parts[0]! : '');
  const [firstName, setFirstName] = useState(parts.length > 1 ? parts.slice(1).join(' ') : (parts[0] ?? ''));
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [template, setTemplate] = useState<TemplateId>('modern');
  const [scheme, setScheme] = useState<'a' | 'b'>('a');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; slug: string } | null>(null);
  const [slug] = useState(() => generateSlug(full || session?.user.email?.split('@')[0] || 'card'));

  const preview = useMemo(
    () =>
      fromCardRow({
        slug,
        template_id: template,
        color_scheme: scheme,
        first_name: firstName || t('welcome.sampleFirst'),
        last_name: lastName || null,
        name_format: 'full',
        title: title || t('welcome.sampleTitle'),
        company: company || null,
        phone: phone || null,
        email: session?.user.email ?? null,
        website: null,
        address: null,
        bio: bio || null,
        slogan: null,
        avatar_path: null,
        logo_path: null,
      }),
    [slug, template, scheme, firstName, lastName, title, company, phone, bio, session, t],
  );

  const go = (s: Step) => {
    haptic.tap();
    setError(null);
    setStep(s);
  };

  const aiBio = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await runAi('bio', { name: `${lastName} ${firstName}`.trim(), title, company, keywords: bio }, locale);
      setBio(r.bio.slice(0, 500));
      haptic.success();
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('cards')
      .insert({
        owner_id: session!.user.id,
        slug,
        template_id: template,
        color_scheme: scheme,
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        name_format: 'full',
        title: title.trim() || null,
        company: company.trim() || null,
        phone: phone.trim() || null,
        email: session!.user.email ?? null,
        bio: bio.trim() || null,
        is_published: true,
      })
      .select('id, slug')
      .single();
    setBusy(false);
    if (err) {
      haptic.error();
      return setError(errorText(t, err));
    }
    await supabase.from('profiles').update({ onboarded_at: new Date().toISOString() }).eq('id', session!.user.id);
    haptic.success();
    setCreated(data);
    void qc.invalidateQueries({ queryKey: ['cards'] });
    void qc.invalidateQueries({ queryKey: ['growth'] });
    refresh();
  };

  if (created) {
    const url = publicCardUrl(created.slug);
    return (
      <Screen>
        <Stack.Screen options={{ title: t('welcome.doneTitle') }} />
        <Appear>
          <Card style={{ alignItems: 'center', gap: 12 }}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: th.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="trophy" color="#FFFFFF" size={28} />
            </View>
            <Txt size={22} weight="700">
              {t('welcome.doneTitle')}
            </Txt>
            <Txt muted style={{ textAlign: 'center' }}>
              {t('welcome.doneBody')}
            </Txt>
            <View style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 18 }}>
              <QRCode value={publicCardUrl(created.slug, 'qr')} size={200} ecl="M" />
            </View>
            <Txt muted size={13} selectable>
              {url}
            </Txt>
          </Card>
        </Appear>
        <Button title={t('common.share')} icon={<Icon name="share" color={th.onPrimary} size={18} />} onPress={() => void Share.share({ message: url, url })} />
        <Button title={t('welcome.addPhoto')} variant="secondary" onPress={() => router.replace(`/edit/${created.id}`)} />
        <Button title={t('welcome.toHome')} variant="ghost" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const steps = [t('welcome.step1'), t('welcome.step2'), t('welcome.step3')];

  return (
    <Screen>
      <Stack.Screen options={{ title: t('welcome.title') }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {steps.map((label, i) => (
          <View key={label} style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: i <= step ? th.primary : th.border }} />
            <Txt size={12} weight={i === step ? '700' : '400'} muted={i !== step}>
              {`${i + 1}. ${label}`}
            </Txt>
          </View>
        ))}
      </View>
      {error ? <Notice tone="error" text={error} /> : null}

      {step === 0 ? (
        <Appear key="s0">
          <View style={{ gap: 12 }}>
            <Field label={t('card.lastName')} value={lastName} onChangeText={setLastName} autoComplete="family-name" />
            <Field label={`${t('card.firstName')} *`} value={firstName} onChangeText={setFirstName} autoComplete="given-name" />
            <Field label={t('card.title')} value={title} onChangeText={setTitle} />
            <Field label={t('card.company')} value={company} onChangeText={setCompany} />
            <Field label={t('card.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
            <Field label={t('card.bio')} value={bio} onChangeText={setBio} multiline maxLength={500} hint={t('welcome.bioHint')} style={{ minHeight: 80 }} />
            <Button
              title={busy ? t('ai.working') : t('ai.writeBio')}
              variant="ai"
              loading={busy}
              disabled={!firstName.trim()}
              icon={<Icon name="sparkles" color={th.accent} size={16} />}
              onPress={() => void aiBio()}
            />
            <Button title={t('welcome.next')} disabled={!firstName.trim()} onPress={() => go(1)} />
          </View>
        </Appear>
      ) : null}

      {step === 1 ? (
        <Appear key="s1">
          <View style={{ gap: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
              {TEMPLATES.map((tpl) => {
                const on = tpl.id === template;
                return (
                  <Pressable
                    key={tpl.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={tpl.name[locale]}
                    onPress={() => {
                      haptic.tap();
                      setTemplate(tpl.id);
                    }}
                    style={{ width: 104, gap: 6, padding: 8, borderRadius: 14, borderWidth: 2, borderColor: on ? th.primary : th.border, backgroundColor: th.card }}
                  >
                    <View style={{ flexDirection: 'row', height: 36, borderRadius: 8, overflow: 'hidden' }}>
                      <View style={{ flex: 1, backgroundColor: tpl.colors.a.bg }} />
                      <View style={{ width: 10, backgroundColor: tpl.colors.a.accent }} />
                      <View style={{ flex: 1, backgroundColor: tpl.colors.b.bg }} />
                      <View style={{ width: 10, backgroundColor: tpl.colors.b.accent }} />
                    </View>
                    <Txt size={13} weight={on ? '700' : '400'}>
                      {tpl.name[locale]}
                    </Txt>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['a', 'b'] as const).map((s) => (
                <View key={s} style={{ flex: 1 }}>
                  <Button title={t('welcome.scheme', { n: s === 'a' ? 1 : 2 })} variant={scheme === s ? 'primary' : 'secondary'} onPress={() => setScheme(s)} />
                </View>
              ))}
            </View>
            <Appear key={`${template}-${scheme}`}>
              <CardView data={preview} interactive={false} />
            </Appear>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button title={t('welcome.back')} variant="secondary" onPress={() => go(0)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title={t('welcome.next')} onPress={() => go(2)} />
              </View>
            </View>
          </View>
        </Appear>
      ) : null}

      {step === 2 ? (
        <Appear key="s2">
          <View style={{ gap: 12 }}>
            <Card>
              <Txt size={18} weight="700">
                {t('welcome.readyTitle')}
              </Txt>
              {(['ready1', 'ready2', 'ready3'] as const).map((k) => (
                <View key={k} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Icon name="check" color={th.success} size={18} />
                  <Txt size={15} style={{ flex: 1 }}>
                    {t(`welcome.${k}`)}
                  </Txt>
                </View>
              ))}
              <Txt muted size={13} selectable>
                {publicCardUrl(slug)}
              </Txt>
            </Card>
            <CardView data={preview} interactive={false} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button title={t('welcome.back')} variant="secondary" onPress={() => go(1)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title={t('welcome.publish')} loading={busy} disabled={!firstName.trim()} onPress={() => void publish()} />
              </View>
            </View>
          </View>
        </Appear>
      ) : null}
    </Screen>
  );
}
