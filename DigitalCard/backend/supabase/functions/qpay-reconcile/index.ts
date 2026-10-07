// Cron (every 5 min): re-check pending payments younger than 24h; expire older ones;
// issue e-barimt receipts that are still missing.
import { isCronRequest, json, logEvent } from '../_shared/http.ts';
import { rpc, select } from '../_shared/db.ts';
import { checkInvoice } from '../_shared/qpay.ts';
import { issueMissingEbarimts } from '../_shared/ebarimt.ts';

Deno.serve(async (req) => {
  if (!isCronRequest(req)) return json(req, { error: 'forbidden' }, 403);

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const pending = await select<{ id: string; sender_invoice_no: string; qpay_invoice_id: string }[]>(
    `payments?status=eq.pending&qpay_invoice_id=not.is.null&created_at=gte.${encodeURIComponent(since)}` +
      `&select=id,sender_invoice_no,qpay_invoice_id&order=created_at.asc&limit=200`,
  );

  const results: Record<string, number> = {};
  for (const p of pending) {
    try {
      const check = await checkInvoice(p.qpay_invoice_id);
      const r = await rpc<string>('apply_payment_check', {
        p_sender_invoice_no: p.sender_invoice_no,
        p_paid: check.paid,
        p_paid_amount: check.paidAmount,
        p_qpay_payment_id: check.paymentId,
        p_raw: check.raw,
      });
      results[r] = (results[r] ?? 0) + 1;
    } catch (e) {
      results.error = (results.error ?? 0) + 1;
      logEvent('qpay-reconcile', 'check_failed', { payment_id: p.id, error: String((e as Error).message) });
    }
  }
  const expired = await rpc<number>('expire_stale_payments');
  const receipts = await issueMissingEbarimts();
  logEvent('qpay-reconcile', 'done', { checked: pending.length, expired, receipts, ...results });
  return json(req, { checked: pending.length, expired, receipts, results });
});
