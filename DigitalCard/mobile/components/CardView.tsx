// Native card renderer (no WebView): same data, template colors and layout families as the web templates,
// so the card looks the same on web, Android and iOS and works offline.
import type { ReactNode } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { getTemplate, type TemplateColor } from '@digitalcard/shared/templates';
import { displayName, initials } from '@digitalcard/shared/format';
import type { CardData } from '@digitalcard/shared/types';
import type { IconName } from '@digitalcard/shared/icons';
import { Icon } from './motion';

const LINK_BADGE: Record<string, { text: string; color: string }> = {
  facebook: { text: 'f', color: '#1877F2' },
  instagram: { text: 'IG', color: '#C13584' },
  linkedin: { text: 'in', color: '#0A66C2' },
  telegram: { text: 'TG', color: '#229ED9' },
  whatsapp: { text: 'WA', color: '#25D366' },
  viber: { text: 'Vb', color: '#7360F2' },
  tiktok: { text: 'TT', color: '#111111' },
  youtube: { text: 'YT', color: '#FF0000' },
  website: { text: 'www', color: '#475569' },
  custom: { text: '•', color: '#475569' },
};

type Layout = 'banner' | 'centered' | 'minimal' | 'side';
const LAYOUT: Record<string, Layout> = {
  modern: 'banner',
  profile: 'banner',
  creative: 'banner',
  classic: 'centered',
  business: 'centered',
  corporate: 'centered',
  minimal: 'minimal',
  dark: 'side',
  executive: 'side',
  premium: 'side',
};

function Avatar({ data, size, c, ring }: { data: CardData; size: number; c: TemplateColor; ring?: string }) {
  const style = { width: size, height: size, borderRadius: size / 2, borderWidth: ring ? 4 : 0, borderColor: ring };
  if (data.avatarUrl) return <Image source={{ uri: data.avatarUrl }} style={style} accessibilityIgnoresInvertColors />;
  return (
    <View style={[style, { backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: c.bg, fontSize: size * 0.36, fontWeight: '700' }}>{initials(data.firstName, data.lastName)}</Text>
    </View>
  );
}

function Row({ icon, text, href, c }: { icon: IconName; text: string; href?: string; c: TemplateColor }) {
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 }}>
      <Icon name={icon} size={18} color={c.accent} />
      <Text style={{ color: c.fg, fontSize: 15, flex: 1 }} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
  if (!href) return content;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={text} onPress={() => void Linking.openURL(href)}>
      {content}
    </Pressable>
  );
}

export function CardView({ data, actions, interactive = true }: { data: CardData; actions?: ReactNode; interactive?: boolean }) {
  const tpl = getTemplate(data.templateId);
  const c = tpl.colors[data.colorScheme] ?? tpl.colors.a;
  const layout = LAYOUT[tpl.id] ?? 'centered';
  const name = displayName(data);
  const tel = data.phone?.replace(/[^0-9+]/g, '');
  const dark = layout === 'side';

  const nameBlock = (align: 'left' | 'center', size = 24) => (
    <View style={{ gap: 2, alignItems: align === 'center' ? 'center' : 'flex-start', flexShrink: 1 }}>
      <Text style={{ color: c.fg, fontSize: size, fontWeight: '700', textAlign: align }} adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={2}>
        {name}
      </Text>
      {data.title ? <Text style={{ color: c.accent, fontSize: 15, fontWeight: '600', textAlign: align }}>{data.title}</Text> : null}
      {data.company ? <Text style={{ color: c.muted, fontSize: 14, textAlign: align }}>{data.company}</Text> : null}
      {data.slogan ? <Text style={{ color: c.muted, fontSize: 13, fontStyle: 'italic', textAlign: align, marginTop: 2 }}>{data.slogan}</Text> : null}
    </View>
  );

  const body = (
    <View style={{ gap: 6 }}>
      {data.phone ? <Row icon="phone" text={data.phone} href={interactive && tel ? `tel:${tel}` : undefined} c={c} /> : null}
      {data.email ? <Row icon="mail" text={data.email} href={interactive ? `mailto:${data.email}` : undefined} c={c} /> : null}
      {data.website ? <Row icon="globe" text={data.website.replace(/^https:\/\//, '')} href={interactive ? data.website : undefined} c={c} /> : null}
      {data.address ? <Row icon="map" text={data.address} c={c} /> : null}
      {data.links.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {data.links.map((l, i) => {
            const b = LINK_BADGE[l.kind] ?? LINK_BADGE.custom!;
            return (
              <Pressable
                key={`${l.kind}-${i}`}
                accessibilityRole="link"
                accessibilityLabel={l.label || l.kind}
                disabled={!interactive}
                onPress={() => void Linking.openURL(l.url)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: `${c.accent}55`,
                  backgroundColor: `${c.accent}12`,
                }}
              >
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: b.color, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>{b.text}</Text>
                </View>
                <Text style={{ color: c.fg, fontSize: 14 }}>{l.label || l.kind}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {data.bio ? <Text style={{ color: c.muted, fontSize: 14, lineHeight: 20, marginTop: 8 }}>{data.bio}</Text> : null}
    </View>
  );

  return (
    <View
      accessibilityLabel={name}
      style={{
        backgroundColor: c.bg,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: dark ? 1 : StyleSheet.hairlineWidth,
        borderColor: dark ? `${c.accent}66` : '#00000014',
        shadowColor: dark ? c.accent : '#101828',
        shadowOpacity: dark ? 0.25 : 0.1,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
      }}
    >
      {layout === 'banner' ? (
        <>
          <View style={{ height: 88, backgroundColor: c.accent, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', right: -30, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: '#FFFFFF22' }} />
          </View>
          <View style={{ marginTop: -44, paddingHorizontal: 20 }}>
            <Avatar data={data} size={88} c={c} ring={c.bg} />
          </View>
          <View style={{ padding: 20, paddingTop: 10, gap: 14 }}>
            {nameBlock('left')}
            {actions}
            {body}
          </View>
        </>
      ) : null}
      {layout === 'centered' ? (
        <View style={{ padding: 22, gap: 14 }}>
          <View style={{ height: 4, width: 48, borderRadius: 2, backgroundColor: c.accent, alignSelf: 'center' }} />
          <View style={{ alignItems: 'center', gap: 12 }}>
            <Avatar data={data} size={80} c={c} />
            {nameBlock('center')}
          </View>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: `${c.muted}55` }} />
          {actions}
          {body}
        </View>
      ) : null}
      {layout === 'minimal' ? (
        <View style={{ padding: 24, gap: 16 }}>
          {nameBlock('left', 28)}
          <View style={{ height: 2, width: 32, backgroundColor: c.accent }} />
          {actions}
          {body}
        </View>
      ) : null}
      {layout === 'side' ? (
        <View style={{ padding: 22, gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Avatar data={data} size={72} c={c} />
            <View style={{ flex: 1 }}>{nameBlock('left', 22)}</View>
          </View>
          {actions}
          {body}
        </View>
      ) : null}
    </View>
  );
}
