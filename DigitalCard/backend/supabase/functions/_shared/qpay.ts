// QPay Merchant API v2 client. Credentials live only in Edge Function secrets.
import { env } from './http.ts';

interface TokenCache {
  token: string;
  expiresAt: number; // ms epoch
}

let cache: TokenCache | null = null;

const base = () => env('QPAY_BASE_URL').replace(/\/$/, '');

export async function getToken(): Promise<string> {
  if (cache && cache.expiresAt - 60_000 > Date.now()) return cache.token;
  const basic = btoa(`${env('QPAY_USERNAME')}:${env('QPAY_PASSWORD')}`);
  const res = await fetch(`${base()}/v2/auth/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) throw new Error(`qpay_auth_failed:${res.status}`);
  const data = await res.json();
  // QPay returns expires_in as an epoch (seconds); fall back to a relative value if small.
  const exp = Number(data.expires_in ?? 0);
  const expiresAt = exp > 1e9 ? exp * 1000 : Date.now() + (exp > 0 ? exp * 1000 : 30 * 60_000);
  cache = { token: data.access_token, expiresAt };
  return cache.token;
}

async function call<T>(path: string, body: unknown, retry = true): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${base()}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 401 && retry) {
    cache = null;
    return call<T>(path, body, false);
  }
  if (!res.ok) throw new Error(`qpay_error:${path}:${res.status}`);
  return (await res.json()) as T;
}

export interface QPayInvoice {
  invoice_id: string;
  qr_text: string;
  qr_image: string; // base64 PNG
  qPay_shortUrl?: string;
  urls: { name: string; description: string; logo: string; link: string }[];
}

export function createInvoice(params: {
  senderInvoiceNo: string;
  amount: number;
  description: string;
  receiverCode: string;
  callbackUrl: string;
}): Promise<QPayInvoice> {
  return call<QPayInvoice>('/v2/invoice', {
    invoice_code: env('QPAY_INVOICE_CODE'),
    sender_invoice_no: params.senderInvoiceNo,
    invoice_receiver_code: params.receiverCode,
    invoice_description: params.description,
    amount: params.amount,
    callback_url: params.callbackUrl,
  });
}

export interface PaymentCheckResult {
  paid: boolean;
  paidAmount: number | null;
  paymentId: string | null;
  raw: unknown;
}

/** Server-side source of truth for "is this invoice paid?". */
export async function checkInvoice(invoiceId: string): Promise<PaymentCheckResult> {
  const data = await call<{ count: number; paid_amount?: number; rows?: { payment_id: string; payment_status: string; payment_amount: number | string }[] }>(
    '/v2/payment/check',
    { object_type: 'INVOICE', object_id: invoiceId, offset: { page_number: 1, page_limit: 100 } },
  );
  const paidRows = (data.rows ?? []).filter((r) => r.payment_status === 'PAID');
  const paidAmount = paidRows.reduce((sum, r) => sum + Number(r.payment_amount ?? 0), 0);
  return {
    paid: paidRows.length > 0,
    paidAmount: paidRows.length > 0 ? paidAmount : null,
    paymentId: paidRows[0]?.payment_id ?? null,
    raw: data,
  };
}

export interface QPayEbarimt {
  id: string;
  ebarimt_qr_data?: string;
  ebarimt_status?: string;
}

/** Electronic VAT receipt for a paid payment; `register` (7 digits) makes it a company receipt. */
export function createEbarimt(paymentId: string, register: string | null): Promise<QPayEbarimt> {
  return call<QPayEbarimt>('/v2/ebarimt_v3/create', {
    payment_id: paymentId,
    ebarimt_receiver_type: register ? 'ORGANIZATION' : 'CITIZEN',
    ...(register ? { ebarimt_receiver: register } : {}),
  });
}
