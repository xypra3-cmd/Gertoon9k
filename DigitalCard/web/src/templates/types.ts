import type { ReactNode } from 'react';
import type { CardData } from '@digitalcard/shared/types';
import type { TemplateColor } from '@digitalcard/shared/templates';

export interface TemplateProps {
  data: CardData;
  colors: TemplateColor;
  /** Optional action area (call / save / exchange buttons) rendered inside the card. */
  actions?: ReactNode;
  /** Called when a link is clicked (analytics). */
  onLinkClick?: (kind: string) => void;
}
