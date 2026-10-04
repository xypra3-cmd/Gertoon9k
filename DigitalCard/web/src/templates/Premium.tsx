import type { TemplateProps } from './types';
import { Avatar, Bio, ContactRows, Frame, LinkList, Logo, NameBlock } from './parts';

export default function Premium({ data, colors, actions, onLinkClick }: TemplateProps) {
  return (
    <Frame colors={colors} className="p-2">
      <div className="rounded-[20px] border" style={{ borderColor: `${colors.accent}88` }}>
        <div className="flex items-center gap-4 px-5 pt-6">
          <Avatar data={data} size={80} colors={colors} className="border-2" />
          <div className="min-w-0 flex-1">
            <NameBlock data={data} colors={colors} nameSize={25} nameClass="font-semibold" />
          </div>
        </div>
        <div className="space-y-4 px-5 pb-5 pt-5">
          <Logo data={data} height={22} />
          {actions}
          <ContactRows data={data} colors={colors} />
          <LinkList data={data} colors={colors} onLinkClick={onLinkClick} />
          <Bio data={data} colors={colors} />
        </div>
      </div>
    </Frame>
  );
}
