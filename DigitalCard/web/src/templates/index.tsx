import type { ComponentType } from 'react';
import { getTemplate, type TemplateId } from '@digitalcard/shared/templates';
import type { CardData } from '@digitalcard/shared/types';
import type { TemplateProps } from './types';
import Classic from './Classic';
import Modern from './Modern';
import Minimal from './Minimal';
import Corporate from './Corporate';
import Creative from './Creative';
import Dark from './Dark';
import Profile from './Profile';
import Business from './Business';
import Executive from './Executive';
import Premium from './Premium';

export const TEMPLATE_COMPONENTS: Record<TemplateId, ComponentType<TemplateProps>> = {
  classic: Classic,
  modern: Modern,
  minimal: Minimal,
  corporate: Corporate,
  creative: Creative,
  dark: Dark,
  profile: Profile,
  business: Business,
  executive: Executive,
  premium: Premium,
};

/** Renders any template from the same CardData; switching templates never loses data. */
export function CardRenderer({ data, ...rest }: Omit<TemplateProps, 'colors'> & { data: CardData }) {
  const meta = getTemplate(data.templateId);
  const Component = TEMPLATE_COMPONENTS[meta.id];
  const colors = meta.colors[data.colorScheme];
  return <Component data={data} colors={colors} {...rest} />;
}
