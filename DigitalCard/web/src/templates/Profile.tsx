import type { TemplateProps } from './types';
import { Avatar, Bio, ContactRows, Frame, LinkList, Logo, NameBlock } from './parts';

export default function Profile({ data, colors, actions, onLinkClick }: TemplateProps) {
  return (
    <Frame colors={colors}>
      <div className="flex justify-center px-6 pt-6" style={{ background: `${colors.accent}12` }}>
        <Avatar data={data} size={140} colors={colors} shape="rounded" className="translate-y-6 shadow-lg" />
      </div>
      <div className="space-y-4 px-6 pb-6 pt-10">
        <NameBlock data={data} colors={colors} align="center" />
        <div className="flex justify-center">
          <Logo data={data} height={22} />
        </div>
        {actions}
        <ContactRows data={data} colors={colors} />
        <LinkList data={data} colors={colors} onLinkClick={onLinkClick} />
        <Bio data={data} colors={colors} />
      </div>
    </Frame>
  );
}
