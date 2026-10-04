import type { TemplateProps } from './types';
import { Avatar, Bio, ContactRows, Frame, LinkList, Logo, NameBlock } from './parts';

export default function Executive({ data, colors, actions, onLinkClick }: TemplateProps) {
  return (
    <Frame colors={colors}>
      <div className="flex flex-col items-center gap-3 px-6 pt-8 text-center">
        <Logo data={data} height={26} />
        <Avatar data={data} size={92} colors={colors} className="border-2" />
        <div className="h-px w-16" style={{ background: colors.accent }} />
        <NameBlock
          data={data}
          colors={colors}
          align="center"
          nameSize={28}
          nameClass="font-semibold tracking-wide"
          nameStyle={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        />
        <div className="h-px w-16" style={{ background: colors.accent }} />
      </div>
      <div className="space-y-4 px-6 pb-6 pt-4">
        {actions}
        <ContactRows data={data} colors={colors} />
        <LinkList data={data} colors={colors} onLinkClick={onLinkClick} variant="icon" />
        <Bio data={data} colors={colors} />
      </div>
    </Frame>
  );
}
