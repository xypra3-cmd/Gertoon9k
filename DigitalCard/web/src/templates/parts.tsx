import { useLayoutEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { displayName, initials } from '@digitalcard/shared/format';
import type { CardData } from '@digitalcard/shared/types';
import type { TemplateColor } from '@digitalcard/shared/templates';
import { GlobeIcon, LINK_BADGE, MailIcon, MapIcon, PhoneIcon } from '@/components/icons';

/**
 * Shrinks the font until the text fits in `maxLines` (never truncates with "…").
 * Falls back to the minimum size and lets it wrap if it still does not fit.
 */
export function AutoFitText({
  text,
  as: Tag = 'div',
  size,
  minSize,
  maxLines = 2,
  className,
  style,
}: {
  text: string;
  as?: ElementType;
  size: number;
  minSize?: number;
  maxLines?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  const [fontSize, setFontSize] = useState(size);
  const min = minSize ?? Math.round(size * 0.6);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      let s = size;
      el.style.fontSize = `${s}px`;
      while (s > min && el.scrollHeight > Math.ceil(s * 1.2 * maxLines) + 1) {
        s -= 1;
        el.style.fontSize = `${s}px`;
      }
      setFontSize(s);
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(fit);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [text, size, min, maxLines]);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{ ...style, fontSize, lineHeight: 1.2, overflowWrap: 'anywhere', hyphens: 'auto' }}
      title={text}
    >
      {text}
    </Tag>
  );
}

export function Avatar({
  data,
  size,
  colors,
  shape = 'circle',
  className = '',
}: {
  data: CardData;
  size: number;
  colors: TemplateColor;
  shape?: 'circle' | 'rounded' | 'square';
  className?: string;
}) {
  const radius = shape === 'circle' ? '9999px' : shape === 'rounded' ? '18%' : '0';
  if (data.avatarUrl) {
    return (
      <img
        src={data.avatarUrl}
        alt={displayName(data)}
        width={size}
        height={size}
        className={`object-cover ${className}`}
        style={{ width: size, height: size, borderRadius: radius }}
        loading="eager"
        decoding="async"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center font-semibold ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: colors.accent,
        color: colors.bg,
        fontSize: size * 0.38,
      }}
    >
      {initials(data.firstName, data.lastName)}
    </div>
  );
}

export function Logo({ data, height = 28 }: { data: CardData; height?: number }) {
  if (!data.logoUrl) return null;
  return (
    <img
      src={data.logoUrl}
      alt={data.company ?? ''}
      style={{ height, width: 'auto', maxWidth: 140 }}
      className="object-contain"
    />
  );
}

export function NameBlock({
  data,
  colors,
  align = 'left',
  nameSize = 26,
  nameClass = 'font-bold',
  nameStyle,
}: {
  data: CardData;
  colors: TemplateColor;
  align?: 'left' | 'center';
  nameSize?: number;
  nameClass?: string;
  nameStyle?: CSSProperties;
}) {
  return (
    <div style={{ textAlign: align }} className="min-w-0">
      <AutoFitText
        as="h1"
        text={displayName(data)}
        size={nameSize}
        className={nameClass}
        style={{ color: colors.fg, ...nameStyle }}
      />
      {data.title && (
        <AutoFitText text={data.title} size={16} className="mt-1 font-medium" style={{ color: colors.accent }} />
      )}
      {data.company && <AutoFitText text={data.company} size={15} className="mt-0.5" style={{ color: colors.muted }} />}
    </div>
  );
}

function Row({
  href,
  icon,
  children,
  colors,
}: {
  href?: string;
  icon: ReactNode;
  children: ReactNode;
  colors: TemplateColor;
}) {
  const content = (
    <>
      <span className="shrink-0" style={{ color: colors.accent }}>
        {icon}
      </span>
      <span className="min-w-0 break-words">{children}</span>
    </>
  );
  const cls = 'flex items-center gap-3 py-1.5 text-[15px]';
  return href ? (
    <a href={href} className={`${cls} hover:underline`} style={{ color: colors.fg }}>
      {content}
    </a>
  ) : (
    <div className={cls} style={{ color: colors.fg }}>
      {content}
    </div>
  );
}

export function ContactRows({ data, colors }: { data: CardData; colors: TemplateColor }) {
  return (
    <div className="space-y-0.5">
      {data.phone && (
        <Row
          href={`tel:${data.phone.replace(/[^0-9+]/g, '')}`}
          icon={<PhoneIcon width={18} height={18} />}
          colors={colors}
        >
          {data.phone}
        </Row>
      )}
      {data.email && (
        <Row href={`mailto:${data.email}`} icon={<MailIcon width={18} height={18} />} colors={colors}>
          {data.email}
        </Row>
      )}
      {data.website && (
        <Row href={data.website} icon={<GlobeIcon width={18} height={18} />} colors={colors}>
          {data.website.replace(/^https:\/\//, '')}
        </Row>
      )}
      {data.address && (
        <Row icon={<MapIcon width={18} height={18} />} colors={colors}>
          {data.address}
        </Row>
      )}
    </div>
  );
}

export function LinkList({
  data,
  colors,
  onLinkClick,
  variant = 'pill',
}: {
  data: CardData;
  colors: TemplateColor;
  onLinkClick?: (kind: string) => void;
  variant?: 'pill' | 'icon';
}) {
  if (!data.links.length) return null;
  return (
    <ul className={variant === 'icon' ? 'flex flex-wrap gap-2' : 'grid grid-cols-2 gap-2'}>
      {data.links.map((l, i) => {
        const badge = LINK_BADGE[l.kind] ?? LINK_BADGE.custom!;
        const label = l.label || l.kind;
        return (
          <li key={`${l.url}-${i}`}>
            <a
              href={l.url}
              target={l.url.startsWith('https://') ? '_blank' : undefined}
              rel="noopener noreferrer nofollow"
              onClick={() => onLinkClick?.(l.kind)}
              aria-label={variant === 'icon' ? label : undefined}
              className={
                variant === 'icon'
                  ? 'flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white'
                  : 'flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium'
              }
              style={
                variant === 'icon'
                  ? { background: badge.color }
                  : { background: `${colors.accent}14`, color: colors.fg, border: `1px solid ${colors.accent}33` }
              }
            >
              <span
                aria-hidden={variant === 'icon' ? undefined : true}
                className={
                  variant === 'icon'
                    ? ''
                    : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white'
                }
                style={variant === 'icon' ? undefined : { background: badge.color }}
              >
                {badge.text}
              </span>
              {variant === 'pill' && <span className="truncate">{label}</span>}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function Bio({ data, colors }: { data: CardData; colors: TemplateColor }) {
  if (!data.bio && !data.slogan) return null;
  return (
    <div className="space-y-1">
      {data.slogan && (
        <p className="text-sm font-semibold italic" style={{ color: colors.accent }}>
          {data.slogan}
        </p>
      )}
      {data.bio && (
        <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: colors.muted }}>
          {data.bio}
        </p>
      )}
    </div>
  );
}

/** Card frame shared by all templates: width-limited, rounded, themed. */
export function Frame({
  colors,
  children,
  className = '',
  style,
}: {
  colors: TemplateColor;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <article
      className={`mx-auto w-full max-w-[440px] overflow-hidden rounded-3xl shadow-xl ${className}`}
      style={{ background: colors.bg, color: colors.fg, ...style }}
    >
      {children}
    </article>
  );
}
