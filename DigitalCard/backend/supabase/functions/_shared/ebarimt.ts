// e-barimt (electronic VAT receipt) through QPay for a paid payment. Mongolian tax law requires a
// receipt for every sale; failures are retried by qpay-reconcile.
import { logEvent } from './http.ts';
import { rpc, select } from './db.ts';
import { createEbarimt } from './qpay.ts';

interface PaidRow {
  id: string;
  qpay_payment_id: string | null;
  ebarimt_receiver: string | null;
}

export async function issueEbarimt(paymentId: string): Promise<string> {
  const rows = await select<PaidRow[]>(
    `payments?id=eq.${paymentId}&status=eq.paid&ebarimt_status=in.(pending,failed)&select=id,qpay_payment_id,ebarimt_receiver`,
  );
  const p = rows[0];
  if (!p?.qpay_payment_id) return 'skipped';
  try {
    const r = await createEbarimt(p.qpay_payment_id, p.ebarimt_receiver);
    const result = await rpc<string>('record_ebarimt', { p_payment_id: p.id, p_ok: true, p_ebarimt_id: r.id, p_qr: r.ebarimt_qr_data ?? '' });
    logEvent('ebarimt', 'issued', { payment_id: p.id });
    return result;
  } catch (e) {
    await rpc<string>('record_ebarimt', { p_payment_id: p.id, p_ok: false, p_ebarimt_id: null, p_qr: null });
    logEvent('ebarimt', 'failed', { payment_id: p.id, error: String((e as Error).message) });
    return 'failed';
  }
}

/** Retries receipts that are still missing (oldest first, at most 5 attempts each). */
export async function issueMissingEbarimts(limit = 50): Promise<number> {
  const todo = await select<{ id: string }[]>(
    `payments?status=eq.paid&ebarimt_status=in.(pending,failed)&ebarimt_attempts=lt.5&select=id&order=paid_at.asc&limit=${limit}`,
  );
  let issued = 0;
  for (const t of todo) if ((await issueEbarimt(t.id)) === 'issued') issued++;
  return issued;
}
