import type { TemplateProps } from './types';
import { Avatar, Bio, ContactRows, Frame, LinkList, Logo, NameBlock } from './parts';

export default function Dark({ data, colors, actions, onLinkClick }: TemplateProps) {
  return (
    <Frame
      colors={colors}
      className="border"
      style={{ borderColor: `${colors.accent}55`, boxShadow: `0 0 40px ${colors.accent}22` }}
    >
      <div className="flex items-center gap-4 px-6 pt-7">
        <Avatar data={data} size={76} colors={colors} shape="rounded" />
        <div className="min-w-0 flex-1">
          <NameBlock data={data} colors={colors} nameSize={24} />
        </div>
      </div>
      <div className="space-y-4 px-6 pb-6 pt-5">
        <Logo data={data} height={22} />
        {actions}
        <ContactRows data={data} colors={colors} />
        <LinkList data={data} colors={colors} onLinkClick={onLinkClick} />
        <Bio data={data} colors={colors} />
      </div>
    </Frame>
  );
}
