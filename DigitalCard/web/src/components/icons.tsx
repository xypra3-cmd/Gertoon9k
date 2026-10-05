// Tiny inline icon set (no icon font → fewer requests, CSP friendly). Decorative: aria-hidden.
import type { SVGProps } from 'react';
import { ICONS, type IconName } from '@digitalcard/shared/icons';

type P = SVGProps<SVGSVGElement>;
const base = (props: P) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
  ...props,
});

/** Renders a shared icon (same geometry as the mobile app). */
export function Icon({ name, ...props }: Omit<P, 'name'> & { name: IconName }) {
  return (
    <svg {...base(props)}>
      {ICONS[name].map(([tag, attrs], i) =>
        tag === 'path' ? (
          <path key={i} {...attrs} />
        ) : tag === 'circle' ? (
          <circle key={i} {...attrs} />
        ) : (
          <rect key={i} {...attrs} />
        ),
      )}
    </svg>
  );
}

const named = (name: IconName) => {
  const C = (p: P) => <Icon {...p} name={name} />;
  C.displayName = `${name}Icon`;
  return C;
};

export const PhoneIcon = named('phone');
export const MailIcon = named('mail');
export const GlobeIcon = named('globe');
export const MapIcon = named('map');
export const DownloadIcon = named('download');
export const ShareIcon = named('share');
export const UserPlusIcon = named('userPlus');
export const SendIcon = named('send');
export const LinkIcon = named('link');
export const LockIcon = named('lock');
export const CheckIcon = named('check');
export const XIcon = named('x');
export const MenuIcon = named('menu');
export const SparklesIcon = named('sparkles');
export const GiftIcon = named('gift');
export const CameraIcon = named('camera');
export const CalendarIcon = named('calendar');
export const CopyIcon = named('copy');
export const PenIcon = named('pen');
export const TrophyIcon = named('trophy');
export const ArrowRightIcon = named('arrowRight');

/** Short badges for social networks (brand logos are trademarks; we use neutral text badges). */
export const LINK_BADGE: Record<string, { text: string; color: string }> = {
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
