import type { TemplateProps } from './types';
import { Avatar, Bio, ContactRows, Frame, LinkList, Logo, NameBlock } from './parts';

export default function Creative({ data, colors, actions, onLinkClick }: TemplateProps) {
  return (
    <Frame
      colors={colors}
      style={{ background: `radial-gradient(circle at 15% 0%, ${colors.accent}40, transparent 45%), ${colors.bg}` }}
    >
      <div className="flex items-center gap-4 px-6 pt-7">
        <div
          className="rounded-full p-1"
          style={{ background: `conic-gradient(${colors.accent}, ${colors.muted}, ${colors.accent})` }}
        >
          <Avatar data={data} size={84} colors={colors} className="border-4" />
        </div>
        <div className="ml-auto">
          <Logo data={data} height={26} />
        </div>
      </div>
      <div className="space-y-4 px-6 pb-6 pt-4">
        <NameBlock data={data} colors={colors} nameSize={28} nameClass="font-extrabold" />
        {actions}
        <ContactRows data={data} colors={colors} />
        <LinkList data={data} colors={colors} onLinkClick={onLinkClick} />
        <Bio data={data} colors={colors} />
      </div>
    </Frame>
  );
}
