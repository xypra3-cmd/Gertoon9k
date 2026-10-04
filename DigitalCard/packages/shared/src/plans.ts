// UI descriptions of plans ONLY. Prices and limits are read from the `plans` table at runtime —
// never hard-code them in apps. Mobile apps must not display prices at all (store rules).
import type { PlanId } from './types';

export interface PlanCopy {
  id: PlanId;
  /** i18n keys of the bullet points shown on the pricing section */
  featureKeys: string[];
  highlight?: boolean;
}

export const PLAN_COPY: Record<PlanId, PlanCopy> = {
  free: {
    id: 'free',
    featureKeys: [
      'plans.features.oneCard',
      'plans.features.qrVcard',
      'plans.features.exchangeLimited',
      'plans.features.basicStats',
    ],
  },
  pro: {
    id: 'pro',
    highlight: true,
    featureKeys: [
      'plans.features.fiveCards',
      'plans.features.qrVcard',
      'plans.features.exchangeUnlimited',
      'plans.features.crm',
      'plans.features.followup',
      'plans.features.funnel',
    ],
  },
  team: {
    id: 'team',
    featureKeys: [
      'plans.features.cardPerMember',
      'plans.features.crm',
      'plans.features.branding',
      'plans.features.lockedTemplate',
      'plans.features.teamDashboard',
    ],
  },
};

/** Monthly amount for a plan row from the DB (team = per seat × max(seats, min_seats)). */
export function planMonthlyAmount(
  plan: { id: string; price_mnt: number; price_per_seat_mnt: number; min_seats: number },
  seats = 1,
): number {
  if (plan.id === 'team') return plan.price_per_seat_mnt * Math.max(seats, plan.min_seats);
  return plan.price_mnt;
}

export function formatMnt(amount: number, locale: 'mn' | 'en' = 'mn'): string {
  const n = new Intl.NumberFormat(locale === 'mn' ? 'mn-MN' : 'en-US').format(amount);
  return `${n}₮`;
}
