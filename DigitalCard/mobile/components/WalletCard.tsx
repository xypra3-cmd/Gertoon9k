// Business-card-shaped (ISO 7810, 1.586 : 1) card for the home screen, like a card in a wallet app.
// Colours come from the card's own template: dark templates keep their dark face, light templates
// use a gradient of their accent colour with white text. The back shows a large scannable QR.
import type { ReactNode } from 'react';
import { Image, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { getTemplate } from '@digitalcard/shared/templates';
import { displayName, initials } from '@digitalcard/shared/format';
import type { CardData } from '@digitalcard/shared/types';
import { font } from '@/lib/fonts';
import { Icon } from './motion';

const RATIO = 1.586;

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Darken a #RRGGBB colour by `amount` (0..1). */
function shade(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  return `#${[0, 2, 4]
    .map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - amount)))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

export function walletColors(data: CardData) {
  const tpl = getTemplate(data.templateId);
  const c = tpl.colors[data.colorScheme] ?? tpl.colors.a;
  const dark = luminance(c.bg) < 0.2;
  const base = data.brandColor && /^#[0-9a-f]{6}$/i.test(data.brandColor) ? data.brandColor : c.accent;
  return dark ? { from: c.bg, to: shade(c.bg, 0.4), fg: c.fg, sub: c.muted, accent: c.accent } : { from: base, to: shade(base, 0.45), fg: '#FFFFFF', sub: '#FFFFFFCC', accent: '#FFFFFF' };
}

export function useWalletSize(horizontalPadding = 32) {
  const { width } = useWindowDimensions();
  const w = Math.min(width - horizontalPadding, 520);
  return { width: w, height: Math.round(w / RATIO) };
}

function Face({ id, width, height, from, to, children }: { id: string; width: number; height: number; from: string; to: string; children: ReactNode }) {
  return (
    <View style={{ width, height, borderRadius: 22, overflow: 'hidden', shadowColor: from, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 10 }}>
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill={`url(#${id})`} />
        <Circle cx={width * 0.92} cy={height * 0.08} r={height * 0.62} fill="#FFFFFF" fillOpacity={0.08} />
        <Circle cx={width * 0.1} cy={height * 1.05} r={height * 0.45} fill="#FFFFFF" fillOpacity={0.06} />
      </Svg>
      <View style={{ flex: 1, padding: 18 }}>{children}</View>
    </View>
  );
}

export function WalletFront({ data }: { data: CardData }) {
  const { width, height } = useWalletSize();
  const col = walletColors(data);
  const name = displayName({ ...data, nameFormat: 'full' });
  const line = [data.title, data.company].filter(Boolean).join(' · ');
  return (
    <Face id={`wallet-${data.slug || 'card'}`} width={width} height={height} from={col.from} to={col.to}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {data.avatarUrl ? (
          <Image source={{ uri: data.avatarUrl }} style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: '#FFFFFFAA' }} accessibilityIgnoresInvertColors />
        ) : (
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF26', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF55' }}>
            <Text style={{ color: col.fg, fontSize: 17, ...font('700') }}>{initials(data.firstName, data.lastName)}</Text>
          </View>
        )}
        {data.logoUrl ? (
          <Image source={{ uri: data.logoUrl }} style={{ width: 64, height: 32 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.85 }}>
            <Icon name="qr" color={col.fg} size={16} />
            <Text style={{ color: col.fg, fontSize: 12, letterSpacing: 0.5, ...font('600') }}>{data.company ? data.company.toUpperCase().slice(0, 18) : 'DIGITAL CARD'}</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1, justifyContent: 'flex-end', gap: 2 }}>
        <Text style={{ color: col.fg, fontSize: 26, letterSpacing: -0.5, ...font('800') }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {name}
        </Text>
        {line ? (
          <Text style={{ color: col.sub, fontSize: 14, ...font('500') }} numberOfLines={1}>
            {line}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 }}>
        {data.phone ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 }}>
            <Icon name="phone" color={col.sub} size={13} />
            <Text style={{ color: col.sub, fontSize: 12, ...font('500') }} numberOfLines={1}>
              {data.phone}
            </Text>
          </View>
        ) : null}
        {data.email ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 }}>
            <Icon name="mail" color={col.sub} size={13} />
            <Text style={{ color: col.sub, fontSize: 12, ...font('500') }} numberOfLines={1}>
              {data.email}
            </Text>
          </View>
        ) : null}
      </View>
    </Face>
  );
}

export function WalletBack({ data, qrValue, ecl = 'M', children }: { data: CardData; qrValue: string; ecl?: 'L' | 'M'; children?: ReactNode }) {
  const { width, height } = useWalletSize();
  const qr = height - 36;
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        gap: 16,
        shadowColor: '#0B1220',
        shadowOpacity: 0.18,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 12 },
        elevation: 10,
      }}
    >
      <QRCode value={qrValue} size={qr} ecl={ecl} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ color: '#0B1220', fontSize: 16, ...font('800') }} numberOfLines={2}>
          {displayName({ ...data, nameFormat: 'full' })}
        </Text>
        {data.title ? (
          <Text style={{ color: '#4B5563', fontSize: 12, ...font('500') }} numberOfLines={2}>
            {data.title}
          </Text>
        ) : null}
        {children}
      </View>
    </View>
  );
}
