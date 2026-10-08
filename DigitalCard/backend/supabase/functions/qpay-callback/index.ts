// QPay calls: <PUBLIC_FUNCTIONS_URL>/qpay-callback?inv=<sender_invoice_no>
// The callback body is NOT trusted. We look the payment up by sender_invoice_no and ask QPay
// (/v2/payment/check) ourselves; apply_payment_check is transactional and idempotent.
import { json, logEvent, preflight } from '../_shared/http.ts';
import { rpc, select } from '../_shared/db.ts';
import { checkInvoice } from '../_shared/qpay.ts';
import { issueEbarimt } from '../_shared/ebarimt.ts';
import { monitored, reportError } from '../_shared/monitor.ts';

Deno.serve(monitored('qpay-callback', async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const inv = new URL(req.url).searchParams.get('inv') ?? '';
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(inv)) return json(req, { status: 'ignored' }, 200);

  const rows = await select<{ id: string; qpay_invoice_id: string | null; status: string }[]>(
    `payments?sender_invoice_no=eq.${encodeURIComponent(inv)}&select=id,qpay_invoice_id,status`,
  );
  const payment = rows[0];
  if (!payment || !payment.qpay_invoice_id) {
    logEvent('qpay-callback', 'unknown_invoice');
    return json(req, { status: 'ignored' }, 200);
  }
  if (payment.status === 'paid') return json(req, { status: 'already_paid' }, 200);

  try {
    const check = await checkInvoice(payment.qpay_invoice_id);
    const result = await rpc<string>('apply_payment_check', {
      p_sender_invoice_no: inv,
      p_paid: check.paid,
      p_paid_amount: check.paidAmount,
      p_qpay_payment_id: check.paymentId,
      p_raw: check.raw,
    });
    logEvent('qpay-callback', 'checked', { payment_id: payment.id, result });
    // VAT receipt right away; a failure here is retried by qpay-reconcile.
    if (result === 'paid') await issueEbarimt(payment.id);
    return json(req, { status: result }, 200);
  } catch (e) {
    await reportError('qpay-callback', e, { stage: 'check', payment_id: payment.id });
    // 200 so QPay does not hammer us; qpay-reconcile retries every 5 minutes.
    return json(req, { status: 'retry_later' }, 200);
  }
}));
