import type { TemplateProps } from './types';
import { Bio, ContactRows, Frame, LinkList, Logo, NameBlock } from './parts';

export default function Minimal({ data, colors, actions, onLinkClick }: TemplateProps) {
  return (
    <Frame colors={colors} className="border" style={{ borderColor: `${colors.fg}1A` }}>
      <div className="space-y-5 px-7 py-8">
        <div className="flex items-start justify-between gap-4">
          <NameBlock data={data} colors={colors} nameSize={30} nameClass="font-light tracking-tight" />
          <Logo data={data} height={24} />
        </div>
        <div className="h-px w-12" style={{ background: colors.accent }} />
        {actions}
        <ContactRows data={data} colors={colors} />
        <LinkList data={data} colors={colors} onLinkClick={onLinkClick} variant="icon" />
        <Bio data={data} colors={colors} />
      </div>
    </Frame>
  );
}
