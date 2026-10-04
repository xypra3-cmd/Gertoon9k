import type { TemplateProps } from './types';
import { Avatar, Bio, ContactRows, Frame, LinkList, Logo, NameBlock } from './parts';

export default function Business({ data, colors, actions, onLinkClick }: TemplateProps) {
  return (
    <Frame colors={colors} className="border-t-4" style={{ borderColor: colors.accent }}>
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <NameBlock data={data} colors={colors} nameSize={24} />
        {data.logoUrl ? (
          <Logo data={data} height={34} />
        ) : (
          <Avatar data={data} size={56} colors={colors} shape="square" />
        )}
      </div>
      <div className="mx-6 mt-4 grid grid-cols-[4px_1fr] gap-4">
        <div className="rounded" style={{ background: colors.accent }} />
        <div className="space-y-4 pb-6">
          {actions}
          <ContactRows data={data} colors={colors} />
          <LinkList data={data} colors={colors} onLinkClick={onLinkClick} />
          <Bio data={data} colors={colors} />
        </div>
      </div>
    </Frame>
  );
}
