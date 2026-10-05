// Card editing on mobile: fields only (templates are chosen on the web and simply not shown here).
// Org employees can only change the fields their organization allows. The DB enforces all of it.
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { cardSchema, IMAGE_UPLOAD, linkSchema, LINK_KINDS } from '@digitalcard/shared/validation';
import type { TablesUpdate } from '@digitalcard/shared/types';
import { useAuth } from '@/lib/auth';
import { useMyCards } from '@/lib/cards';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { errorText } from '@/lib/errors';
import { useTheme } from '@/lib/theme';
import { Button, Card, Field, Loading, Notice, Screen, Txt } from '@/components/ui';
import { haptic, Icon } from '@/components/motion';
import { runAi } from '@/lib/ai';

type LinkRow = {
  kind: (typeof LINK_KINDS)[number];
  label: string;
  url: string;
};
const FIELDS = ['first_name', 'last_name', 'title', 'company', 'phone', 'email', 'website', 'bio'] as const;

type CardRow = NonNullable<ReturnType<typeof useMyCards>['data']>[number];

export default function EditCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entitlements } = useAuth();
  const cards = useMyCards();
  const card = cards.data?.find((c) => c.id === id);
  if (cards.isLoading || !entitlements || !card) return <Loading />;
  return <EditForm key={card.id} card={card} />;
}

function EditForm({ card }: { card: CardRow }) {
  const { t, locale } = useI18n();
  const th = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { session, entitlements } = useAuth();
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(FIELDS.map((f) => [f, (card[f] as string | null) ?? ''])));
  const [links, setLinks] = useState<LinkRow[]>(() =>
    [...(card.card_links ?? [])]
      .sort((a, b) => a.sort - b.sort)
      .map((l) => ({
        kind: l.kind as LinkRow['kind'],
        label: l.label ?? '',
        url: l.url,
      })),
  );
  const [avatar, setAvatar] = useState<string | null>(card.avatar_path);
  const [msg, setMsg] = useState<{
    tone: 'error' | 'success';
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  if (!entitlements) return <Loading />;
  const editable = entitlements.editable_card_ids.includes(card.id);
  if (!editable) {
    return (
      <Screen>
        <Notice text={t('m.noEditRights')} />
      </Screen>
    );
  }
  const org = card.org_id ? entitlements.orgs.find((o) => o.org_id === card.org_id) : null;
  const isOrgAdmin = !!org && (org.role === 'owner' || org.role === 'admin');
  const allowed = (f: string) => !card.org_id || isOrgAdmin || (org?.allow_employee_edit_fields ?? []).includes(f);

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    const type = asset.mimeType ?? 'image/jpeg';
    if (!(IMAGE_UPLOAD.mimeTypes as readonly string[]).includes(type)) return setMsg({ tone: 'error', text: t('errors.fileType') });
    if ((asset.fileSize ?? 0) > IMAGE_UPLOAD.maxBytes) return setMsg({ tone: 'error', text: t('errors.fileTooLarge') });
    const body = await (await fetch(asset.uri)).arrayBuffer();
    const path = `${session!.user.id}/${card.id}-${Date.now()}.${type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'}`;
    const { error } = await supabase.storage.from('avatars').upload(path, body, { contentType: type });
    if (error) return setMsg({ tone: 'error', text: errorText(t, error) });
    setAvatar(path);
  };

  const writeBio = async () => {
    setAiBusy(true);
    setMsg(null);
    try {
      const r = await runAi(
        'bio',
        {
          name: [v.last_name, v.first_name].filter(Boolean).join(' '),
          title: v.title,
          company: v.company,
          keywords: v.bio,
        },
        locale,
      );
      setV((o) => ({ ...o, bio: r.bio.slice(0, 500) }));
      haptic.success();
      setMsg({ tone: 'success', text: t('ai.bioReady') });
    } catch (e) {
      haptic.error();
      setMsg({ tone: 'error', text: errorText(t, e) });
    } finally {
      setAiBusy(false);
    }
  };

  const save = async () => {
    setMsg(null);
    const parsed = cardSchema.partial().safeParse(v);
    if (!parsed.success)
      return setMsg({
        tone: 'error',
        text: t(parsed.error.issues[0]!.message),
      });
    const bad = links.find((l) => !linkSchema.safeParse(l).success);
    if (bad) return setMsg({ tone: 'error', text: t('errors.invalidUrl') });
    const patch: Record<string, unknown> = {};
    FIELDS.forEach((f) => {
      const nv = (parsed.data as Record<string, unknown>)[f] ?? null;
      if (allowed(f) && nv !== (card[f] ?? null)) patch[f] = nv;
    });
    if (allowed('avatar_path') && avatar !== card.avatar_path) patch.avatar_path = avatar;
    setBusy(true);
    try {
      if (Object.keys(patch).length) {
        const { error } = await supabase
          .from('cards')
          .update(patch as TablesUpdate<'cards'>)
          .eq('id', card.id);
        if (error) throw error;
      }
      if (allowed('links')) {
        const del = await supabase.from('card_links').delete().eq('card_id', card.id);
        if (del.error) throw del.error;
        if (links.length) {
          const ins = await supabase.from('card_links').insert(
            links.map((l, i) => ({
              card_id: card.id,
              kind: l.kind,
              label: l.label || null,
              url: l.url.trim(),
              sort: i,
            })),
          );
          if (ins.error) throw ins.error;
        }
      }
      void qc.invalidateQueries({ queryKey: ['cards'] });
      haptic.success();
      setMsg({ tone: 'success', text: t('m.saved') });
      router.back();
    } catch (e) {
      setMsg({ tone: 'error', text: errorText(t, e) });
    } finally {
      setBusy(false);
    }
  };

  const labels: Record<(typeof FIELDS)[number], string> = {
    first_name: t('card.firstName'),
    last_name: t('card.lastName'),
    title: t('card.title'),
    company: t('card.company'),
    phone: t('card.phone'),
    email: t('card.email'),
    website: t('card.website'),
    bio: t('card.bio'),
  };

  return (
    <Screen>
      {FIELDS.map((f) => (
        <Field
          key={f}
          label={labels[f]}
          value={v[f] ?? ''}
          editable={allowed(f)}
          hint={allowed(f) ? undefined : t('m.fieldLocked')}
          onChangeText={(text) => setV((o) => ({ ...o, [f]: text }))}
          keyboardType={f === 'phone' ? 'phone-pad' : f === 'email' ? 'email-address' : 'default'}
          autoCapitalize={f === 'email' || f === 'website' ? 'none' : 'sentences'}
          multiline={f === 'bio'}
        />
      ))}
      {allowed('bio') ? (
        <Button title={aiBusy ? t('ai.working') : t('ai.writeBio')} variant="ai" loading={aiBusy} icon={<Icon name="sparkles" color={th.accent} size={16} />} onPress={() => void writeBio()} />
      ) : null}
      {card.published_at ? <Txt muted size={12}>{`/c/${card.slug} · ${t('ai.slugLockedHint')}`}</Txt> : null}
      {allowed('avatar_path') ? <Button title={t('m.choosePhoto')} variant="secondary" onPress={() => void pickPhoto()} /> : null}
      <Card>
        <Txt weight="600">{t('card.links')}</Txt>
        {links.map((l, i) => (
          <View
            key={i}
            style={{
              gap: 6,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: th.border,
              paddingTop: i ? 8 : 0,
            }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {(['facebook', 'instagram', 'linkedin', 'telegram', 'website', 'custom'] as const).map((k) => (
                <Pressable
                  key={k}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: l.kind === k }}
                  disabled={!allowed('links')}
                  onPress={() => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, kind: k } : x)))}
                  style={{
                    paddingHorizontal: 10,
                    minHeight: 36,
                    justifyContent: 'center',
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: l.kind === k ? th.primary : th.border,
                  }}
                >
                  <Txt size={13}>{k}</Txt>
                </Pressable>
              ))}
            </View>
            <Field label={t('card.links')} value={l.url} editable={allowed('links')} autoCapitalize="none" onChangeText={(url) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, url } : x)))} />
            <Button title={t('common.delete')} variant="ghost" disabled={!allowed('links')} onPress={() => setLinks((ls) => ls.filter((_, j) => j !== i))} />
          </View>
        ))}
        <Button
          title={`+ ${t('card.links')}`}
          variant="secondary"
          disabled={!allowed('links') || links.length >= 20}
          onPress={() => setLinks((ls) => [...ls, { kind: 'website', label: '', url: 'https://' }])}
        />
      </Card>
      {msg ? <Notice tone={msg.tone} text={msg.text} /> : null}
      <Button title={t('common.save')} onPress={() => void save()} loading={busy} />
    </Screen>
  );
}
