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
let calls = { token: 0, invoice: 0, check: 0, turnstile: 0, ai: 0 };
let ebarimtFail = 0; // next N e-barimt calls fail (retry tests)
let lastAi = null; // last /v1/messages request body (tests assert on the shape)

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

  // e-barimt (VAT receipt) for a paid payment; /__mock/ebarimt-fail makes the next N calls fail.
  if (url.pathname === '/v2/ebarimt_v3/create') {
    calls.ebarimt = (calls.ebarimt ?? 0) + 1;
    if (ebarimtFail > 0) {
      ebarimtFail--;
      return send(res, 503, { error: 'ebarimt_unavailable' });
    }
    if (!body.payment_id || !['CITIZEN', 'ORGANIZATION'].includes(body.ebarimt_receiver_type)) return send(res, 400, { error: 'invalid' });
    return send(res, 200, { id: `EB-${body.payment_id}`, ebarimt_status: 'REGISTERED', ebarimt_receiver_type: body.ebarimt_receiver_type,
      ebarimt_qr_data: `ebarimt-qr-${body.payment_id}` });
  }
  if (url.pathname === '/__mock/ebarimt-fail') {
    ebarimtFail = Number(body.times ?? 1);
    return send(res, 200, { ok: true });
  }

  // Claude Messages API mock (ai-assist): answers with schema-shaped JSON per task.
  if (url.pathname === '/v1/messages') {
    calls.ai++;
    lastAi = body;
    if (!req.headers['x-api-key']) return send(res, 401, { type: 'error', error: { type: 'authentication_error', message: 'no key' } });
    const sys = String(body.system ?? '');
    const userText = JSON.stringify(body.messages ?? []);
    const base = { id: 'msg_mock', type: 'message', role: 'assistant', model: body.model, stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 20 } };
    if (userText.includes('REFUSE_ME')) return send(res, 200, { ...base, content: [], stop_reason: 'refusal' });
    const out = sys.includes('card bio') ? { bio: 'Туршлагатай борлуулалтын менежер.', slogan: 'Итгэлтэй түнш' }
      : sys.includes('business card') && sys.includes('photographed') ? { first_name: 'Бат', last_name: 'Дорж', title: 'Менежер',
          company: 'Монгол ХХК', phone: '+97699001122', email: 'bat@example.mn', website: '', address: '' }
      : sys.includes('meeting note') ? { summary: 'Түншлэлийн санал ярилцсан.', tags: ['түнш', 'санал'], next_step: 'Үнийн санал илгээх', follow_up_days: 3 }
      : { subject: 'Уулзалтын дараа', message: 'Сайн байна уу! Уулзсандаа баяртай байлаа.' };
    return send(res, 200, { ...base, content: [{ type: 'text', text: JSON.stringify(out) }], stop_reason: 'end_turn' });
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
    ebarimtFail = 0;
    return send(res, 200, { ok: true });
  }
  if (url.pathname === '/__mock/state') {
    return send(res, 200, { calls, invoices: Object.fromEntries(invoices), lastAi });
  }
  return send(res, 404, { error: 'not found' });
});

server.listen(PORT, '0.0.0.0', () => console.log(`mock QPay/Turnstile on :${PORT}`));
