// Local mock for QPay v2 and Cloudflare Turnstile (used by tests/functions).
// Run: node supabase/tests/mocks/mock-server.mjs   (listens on :54399)
// Control endpoints (tests only):
//   POST /__mock/pay    { invoice_id, amount }  → marks an invoice as PAID with that amount
//   POST /__mock/reset
//   GET  /__mock/state
import http from 'node:http';

const PORT = Number(process.env.MOCK_PORT ?? 54399);
const TURNSTILE_PASS = 'XXXX.DUMMY.TOKEN.XXXX'; // Cloudflare's documented dummy token

let invoices = new Map(); // invoice_id → { amount, sender_invoice_no, paid: null | { amount } }
let calls = { token: 0, invoice: 0, check: 0, turnstile: 0 };

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
  });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const raw = await readBody(req);
  const body = (() => {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  })();

  if (url.pathname === '/v2/auth/token') {
    calls.token++;
    if (!(req.headers.authorization ?? '').startsWith('Basic ')) return send(res, 401, { error: 'unauthorized' });
    return send(res, 200, {
      token_type: 'bearer',
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh',
      expires_in: Math.floor(Date.now() / 1000) + 3600,
    });
  }

  if (url.pathname.startsWith('/v2/') && req.headers.authorization !== 'Bearer mock-access-token') {
    return send(res, 401, { error: 'invalid token' });
  }

  if (url.pathname === '/v2/invoice') {
    calls.invoice++;
    const id = `MOCK-${body.sender_invoice_no}`;
    invoices.set(id, { amount: body.amount, sender_invoice_no: body.sender_invoice_no, callback_url: body.callback_url, paid: null });
    return send(res, 200, {
      invoice_id: id,
      qr_text: `mock-qr-${id}`,
      qr_image: 'iVBORw0KGgo=',
      qPay_shortUrl: `https://qpay.example/${id}`,
      urls: [{ name: 'Khan bank', description: 'Хаан банк', logo: 'https://qpay.example/khan.png', link: `khanbank://q?qPay_QRcode=${id}` }],
    });
  }

  if (url.pathname === '/v2/payment/check') {
    calls.check++;
    const inv = invoices.get(body.object_id);
    if (!inv || !inv.paid) return send(res, 200, { count: 0, paid_amount: 0, rows: [] });
    return send(res, 200, {
      count: 1,
      paid_amount: inv.paid.amount,
      rows: [{ payment_id: `PAY-${body.object_id}`, payment_status: 'PAID', payment_amount: String(inv.paid.amount), payment_currency: 'MNT' }],
    });
  }

  if (url.pathname === '/turnstile/v0/siteverify') {
    calls.turnstile++;
    const params = new URLSearchParams(raw.includes('=') && !raw.includes('Content-Disposition') ? raw : '');
    let token = params.get('response');
    if (!token) {
      const m = raw.match(/name="response"\r?\n\r?\n([^\r\n]*)/);
      token = m?.[1] ?? '';
    }
    return send(res, 200, { success: token === TURNSTILE_PASS, 'error-codes': token === TURNSTILE_PASS ? [] : ['invalid-input-response'] });
  }

  if (url.pathname === '/__mock/pay') {
    const inv = invoices.get(body.invoice_id);
    if (!inv) return send(res, 404, { error: 'unknown invoice' });
    inv.paid = { amount: body.amount ?? inv.amount };
    return send(res, 200, { ok: true });
  }
  if (url.pathname === '/__mock/reset') {
    invoices = new Map();
    calls = { token: 0, invoice: 0, check: 0, turnstile: 0 };
    return send(res, 200, { ok: true });
  }
  if (url.pathname === '/__mock/state') {
    return send(res, 200, { calls, invoices: Object.fromEntries(invoices) });
  }
  return send(res, 404, { error: 'not found' });
});

server.listen(PORT, '0.0.0.0', () => console.log(`mock QPay/Turnstile on :${PORT}`));
