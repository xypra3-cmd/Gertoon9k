import type { TemplateProps } from './types';
import { Avatar, Bio, ContactRows, Frame, LinkList, Logo, NameBlock } from './parts';

export default function Corporate({ data, colors, actions, onLinkClick }: TemplateProps) {
  const accent = data.brandColor ?? colors.accent;
  const c = { ...colors, accent };
  return (
    <Frame colors={c} className="border-l-8" style={{ borderColor: accent }}>
      <div
        className="flex items-center justify-between gap-3 border-b px-6 py-4"
        style={{ borderColor: `${c.muted}33` }}
      >
        <Logo data={data} height={30} />
        {data.company && !data.logoUrl && (
          <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: accent }}>
            {data.company}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 px-6 pt-5">
        <Avatar data={data} size={72} colors={c} shape="rounded" />
        <NameBlock data={data} colors={c} nameSize={24} />
      </div>
      <div className="space-y-4 px-6 pb-6 pt-4">
        {actions}
        <ContactRows data={data} colors={c} />
        <LinkList data={data} colors={c} onLinkClick={onLinkClick} />
        <Bio data={data} colors={c} />
      </div>
    </Frame>
  );
}
