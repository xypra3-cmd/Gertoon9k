import { supabase } from './supabase';

export interface Invoice {
  payment_id: string;
  sender_invoice_no: string;
  amount_mnt: number;
  qr_image: string;
  qr_text: string;
  short_url: string | null;
  urls: { name: string; description: string; logo: string; link: string }[];
}

export async function createInvoice(body: {
  plan_id: 'pro' | 'team';
  org_id?: string;
  seats?: number;
  period?: 'month' | 'year';
}): Promise<Invoice> {
  const { data, error } = await supabase.functions.invoke('qpay-create-invoice', { body });
  if (error) {
    // FunctionsHttpError carries the JSON body in context
    const ctx = (error as { context?: Response }).context;
    const parsed = ctx ? await ctx.json().catch(() => null) : null;
    throw parsed ?? error;
  }
  return data as Invoice;
}
