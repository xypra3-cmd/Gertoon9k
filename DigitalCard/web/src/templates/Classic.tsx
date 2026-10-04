import type { TemplateProps } from './types';
import { Avatar, Bio, ContactRows, Frame, LinkList, Logo, NameBlock } from './parts';

export default function Classic({ data, colors, actions, onLinkClick }: TemplateProps) {
  return (
    <Frame colors={colors} className="border" style={{ borderColor: `${colors.muted}33` }}>
      <div className="flex flex-col items-center gap-3 px-6 pb-4 pt-8 text-center">
        <Logo data={data} />
        <Avatar data={data} size={88} colors={colors} />
        <NameBlock data={data} colors={colors} align="center" />
      </div>
      <div className="mx-6 border-t" style={{ borderColor: `${colors.muted}33` }} />
      <div className="space-y-4 px-6 py-4">
        {actions}
        <ContactRows data={data} colors={colors} />
        <LinkList data={data} colors={colors} onLinkClick={onLinkClick} />
        <Bio data={data} colors={colors} />
      </div>
    </Frame>
  );
}
