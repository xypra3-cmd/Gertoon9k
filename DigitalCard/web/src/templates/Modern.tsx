import type { TemplateProps } from './types';
import { Avatar, Bio, ContactRows, Frame, LinkList, Logo, NameBlock } from './parts';

export default function Modern({ data, colors, actions, onLinkClick }: TemplateProps) {
  return (
    <Frame colors={colors}>
      <div
        className="relative h-24"
        style={{ background: `linear-gradient(120deg, ${colors.accent}, ${colors.accent}AA)` }}
      >
        <div className="absolute right-4 top-4 rounded-lg bg-white/90 px-2 py-1 empty:hidden">
          <Logo data={data} height={22} />
        </div>
      </div>
      <div className="-mt-12 px-6">
        <div className="inline-block rounded-full" style={{ boxShadow: `0 0 0 4px ${colors.bg}` }}>
          <Avatar data={data} size={96} colors={colors} />
        </div>
      </div>
      <div className="space-y-4 px-6 pb-6 pt-3">
        <NameBlock data={data} colors={colors} />
        {actions}
        <ContactRows data={data} colors={colors} />
        <LinkList data={data} colors={colors} onLinkClick={onLinkClick} />
        <Bio data={data} colors={colors} />
      </div>
    </Frame>
  );
}
