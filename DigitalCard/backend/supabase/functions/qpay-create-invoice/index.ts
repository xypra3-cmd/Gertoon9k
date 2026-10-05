// POST { plan_id: 'pro' | 'team', org_id?: uuid, seats?: number, period?: 'month' | 'year' } with the user's JWT.
// Creates a pending payment (amount from the plans table) and a QPay v2 invoice.
import { env, json, logEvent, preflight, readJson } from '../_shared/http.ts';
import { DbError, getUser, rpc } from '../_shared/db.ts';
import { createInvoice } from '../_shared/qpay.ts';

interface Body {
  plan_id?: string;
  org_id?: string | null;
  seats?: number | null;
  period?: 'month' | 'year' | null;
}

interface Pending {
  payment_id: string;
  sender_invoice_no: string;
  amount_mnt: number;
  subscription_id: string;
  description: string;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);

  const user = await getUser(req);
  if (!user) return json(req, { error: 'not_authenticated' }, 401);

  const body = await readJson<Body>(req);
  if (!body?.plan_id || !['pro', 'team'].includes(body.plan_id)) return json(req, { error: 'invalid_plan' }, 400);

  let pending: Pending;
  try {
    const rows = await rpc<Pending[]>('create_pending_payment', {
      p_user: user.id,
      p_plan_id: body.plan_id,
      p_org_id: body.org_id ?? null,
      p_seats: body.seats ?? null,
      p_period: body.period === 'year' ? 'year' : 'month',
    });
    pending = rows[0];
  } catch (e) {
    if (e instanceof DbError) return json(req, { error: e.message }, e.code === '42501' ? 403 : 400);
    throw e;
  }

  const callbackUrl = `${env('PUBLIC_FUNCTIONS_URL').replace(/\/$/, '')}/qpay-callback?inv=${encodeURIComponent(pending.sender_invoice_no)}`;

  try {
    const invoice = await createInvoice({
      senderInvoiceNo: pending.sender_invoice_no,
      amount: pending.amount_mnt,
      description: pending.description,
      receiverCode: user.id,
      callbackUrl,
    });
    await rpc('attach_qpay_invoice', { p_payment_id: pending.payment_id, p_qpay_invoice_id: invoice.invoice_id });
    logEvent('qpay-create-invoice', 'created', { payment_id: pending.payment_id });
    return json(req, {
      payment_id: pending.payment_id,
      sender_invoice_no: pending.sender_invoice_no,
      amount_mnt: pending.amount_mnt,
      qr_image: invoice.qr_image,
      qr_text: invoice.qr_text,
      short_url: invoice.qPay_shortUrl ?? null,
      urls: invoice.urls ?? [],
    });
  } catch (e) {
    logEvent('qpay-create-invoice', 'qpay_failed', { payment_id: pending.payment_id, error: String((e as Error).message) });
    return json(req, { error: 'qpay_unavailable' }, 502);
  }
});
