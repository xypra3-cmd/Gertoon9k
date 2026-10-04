// Critical (NO-GO) tests — Prompt 04 §2. Every test uses real user JWTs against the local stack
// (REST directly, bypassing the UI). A single failure here = NO-GO.
import { beforeAll, describe, expect, it } from 'vitest';
import { admin, anon, callFn, createCard, cron, expirePlan, guestHeaders, mockPay, newUser, setPlan, slug, type TestUser } from './helpers';
import { TURNSTILE_OK } from './env';

describe('SEC-01 user A cannot SELECT/UPDATE/DELETE user B data (all tables)', () => {
  let A: TestUser, B: TestUser;
  let bCard: { id: string; slug: string }, bContactId: string, bPaymentId: string, bSubId: string;

  beforeAll(async () => {
    [A, B] = await Promise.all([newUser('a'), newUser('b')]);
    await setPlan(B.id, 'pro');
    bCard = await createCard(B);
    await B.db.from('card_links').insert({ card_id: bCard.id, kind: 'website', url: 'https://b.example.mn' });
    const c = await B.db.from('contacts').insert({ owner_id: B.id, name: 'B secret', note: 'private' }).select().single();
    bContactId = c.data!.id;
    await callFn('track-event', { body: { slug: bCard.slug, event: 'view' }, headers: guestHeaders('sec01') });
    bSubId = (await admin.from('subscriptions').select('id').eq('owner_user_id', B.id).single()).data!.id;
    bPaymentId = (await admin.from('payments').insert({ subscription_id: bSubId, plan_id: 'pro', sender_invoice_no: slug('INV'), amount_mnt: 9900 }).select().single()).data!.id;
  });

  const tables = ['cards', 'card_links', 'contacts', 'card_events', 'payments', 'subscriptions', 'profiles', 'org_members', 'organizations', 'audit_log', 'email_queue', 'card_daily_stats'];

  it.each(tables)('SELECT %s returns none of B rows', async (t) => {
    const { data, error } = await A.db.from(t).select('*');
    const rows = (data ?? []) as Record<string, unknown>[];
    const leaked = rows.filter((r) => JSON.stringify(r).includes(B.id) || JSON.stringify(r).includes(bCard.id));
    expect(error === null || ['42501', 'PGRST205'].includes(error.code ?? '') || /permission denied/.test(error.message)).toBe(true);
    expect(leaked).toEqual([]);
  });

  it('UPDATE on B rows changes nothing', async () => {
    const r = await Promise.all([
      A.db.from('cards').update({ title: 'hacked' }).eq('id', bCard.id).select(),
      A.db.from('contacts').update({ name: 'hacked' }).eq('id', bContactId).select(),
      A.db.from('card_links').update({ url: 'https://evil.example' }).eq('card_id', bCard.id).select(),
      A.db.from('payments').update({ status: 'paid' }).eq('id', bPaymentId).select(),
      A.db.from('subscriptions').update({ status: 'active' }).eq('id', bSubId).select(),
      A.db.from('profiles').update({ full_name: 'hacked' }).eq('id', B.id).select(),
    ]);
    for (const x of r) expect(x.data ?? []).toEqual([]);
    const card = await admin.from('cards').select('title').eq('id', bCard.id).single();
    expect(card.data!.title).not.toBe('hacked');
  });

  it('DELETE on B rows removes nothing', async () => {
    await Promise.all([
      A.db.from('cards').delete().eq('id', bCard.id),
      A.db.from('contacts').delete().eq('id', bContactId),
      A.db.from('card_links').delete().eq('card_id', bCard.id),
      A.db.from('payments').delete().eq('id', bPaymentId),
      A.db.from('card_events').delete().eq('card_id', bCard.id),
    ]);
    expect((await admin.from('cards').select('deleted_at').eq('id', bCard.id).single()).data!.deleted_at).toBeNull();
    expect((await admin.from('contacts').select('id').eq('id', bContactId)).data).toHaveLength(1);
    expect((await admin.from('card_links').select('id').eq('card_id', bCard.id)).data).toHaveLength(1);
    expect((await admin.from('payments').select('id').eq('id', bPaymentId)).data).toHaveLength(1);
    expect((await admin.from('card_events').select('id').eq('card_id', bCard.id)).data!.length).toBeGreaterThan(0);
  });

  it('INSERT into B account / service tables is refused', async () => {
    expect((await A.db.from('contacts').insert({ owner_id: B.id, name: 'spam' })).error).not.toBeNull();
    expect((await A.db.from('cards').insert({ owner_id: B.id, slug: slug(), first_name: 'x' })).error).not.toBeNull();
    expect((await A.db.from('card_links').insert({ card_id: bCard.id, kind: 'custom', url: 'https://x.mn' })).error).not.toBeNull();
    expect((await A.db.from('card_events').insert({ card_id: bCard.id, event: 'view', visitor_hash: 'a'.repeat(64) })).error).not.toBeNull();
    expect((await A.db.from('subscriptions').insert({ owner_user_id: A.id, plan_id: 'pro', status: 'active' })).error).not.toBeNull();
    expect((await A.db.from('payments').insert({ subscription_id: bSubId, plan_id: 'pro', sender_invoice_no: slug(), amount_mnt: 1 })).error).not.toBeNull();
  });

  it('service-only RPCs are not callable by users', async () => {
    const r = await A.db.rpc('apply_payment_check', { p_sender_invoice_no: 'x', p_paid: true, p_paid_amount: 9900, p_qpay_payment_id: 'x', p_raw: {} });
    expect(r.error).not.toBeNull();
    const r2 = await A.db.rpc('track_card_event', { p_slug: bCard.slug, p_event: 'view', p_link_kind: null, p_visitor_hash: 'a'.repeat(64) });
    expect(r2.error).not.toBeNull();
  });
});

describe('SEC-02 quotas enforced by the DB (direct REST)', () => {
  it('Free: 2nd card refused', async () => {
    const u = await newUser('free');
    await createCard(u);
    const { error } = await u.db.from('cards').insert({ owner_id: u.id, slug: slug(), first_name: 'x' });
    expect(error?.message).toBe('card_quota_exceeded');
  });

  it('Pro: 6th card refused', async () => {
    const u = await newUser('pro');
    await setPlan(u.id, 'pro');
    for (let i = 0; i < 5; i++) await createCard(u);
    const { error } = await u.db.from('cards').insert({ owner_id: u.id, slug: slug(), first_name: 'x' });
    expect(error?.message).toBe('card_quota_exceeded');
  });

  it('Team: more members than paid seats refused (REST and org-invite)', async () => {
    const owner = await newUser('owner');
    const org = (await owner.db.from('organizations').insert({ name: 'QA Org', owner_id: owner.id }).select().single()).data!;
    await admin.from('subscriptions').insert({ org_id: org.id, plan_id: 'team', seats: 5, status: 'active', current_period_start: new Date().toISOString(), current_period_end: new Date(Date.now() + 30 * 864e5).toISOString() });
    for (let i = 0; i < 4; i++) {
      const r = await callFn('org-invite', { token: owner.token, body: { org_id: org.id, email: `m${i}-${slug()}@test.mn` } });
      expect(r.status).toBe(200);
    }
    const viaFn = await callFn('org-invite', { token: owner.token, body: { org_id: org.id, email: `over-${slug()}@test.mn` } });
    expect(viaFn.status).toBe(403);
    expect(viaFn.body.error).toBe('seat_limit_reached');
    const viaRest = await owner.db.from('org_members').insert({ org_id: org.id, invited_email: `rest-${slug()}@test.mn`, role: 'member' });
    expect(viaRest.error?.message).toBe('seat_limit_reached');
  });
});

describe('SEC-03 expired user cannot UPDATE via REST', () => {
  it('locked card update changes 0 rows; new card refused', async () => {
    const u = await newUser('exp');
    await setPlan(u.id, 'pro');
    const first = await createCard(u);
    const second = await createCard(u);
    await admin.from('cards').update({ created_at: new Date(Date.now() - 864e5).toISOString() }).eq('id', first.id);
    await expirePlan(u.id);
    const upd = await u.db.from('cards').update({ title: 'should not save' }).eq('id', second.id).select();
    expect(upd.data ?? []).toEqual([]);
    expect((await admin.from('cards').select('title').eq('id', second.id).single()).data!.title).toBeNull();
    const ins = await u.db.from('cards').insert({ owner_id: u.id, slug: slug(), first_name: 'x' });
    expect(ins.error?.message).toBe('card_quota_exceeded');
  });
});

describe('PAY-01..04 payments', () => {
  let U: TestUser;
  beforeAll(async () => {
    U = await newUser('pay');
  });
  const sub = async () => (await admin.from('subscriptions').select('*').eq('owner_user_id', U.id).single()).data!;
  const invoice = async () => {
    const r = await callFn('qpay-create-invoice', { token: U.token, body: { plan_id: 'pro' } });
    expect(r.status).toBe(200);
    return (await admin.from('payments').select('*').eq('sender_invoice_no', r.body.sender_invoice_no).single()).data!;
  };

  it('PAY-01 forged callback does not activate', async () => {
    const p = await invoice();
    const r = await callFn('qpay-callback', { query: `?inv=${p.sender_invoice_no}`, body: { payment_status: 'PAID', paid_amount: p.amount_mnt } });
    expect(r.body.status).toBe('not_paid');
    expect((await sub()).status).not.toBe('active');
  });

  it('PAY-02 duplicate callback extends only once', async () => {
    const p = await invoice();
    await mockPay(p.qpay_invoice_id, p.amount_mnt);
    await callFn('qpay-callback', { query: `?inv=${p.sender_invoice_no}` });
    const end1 = (await sub()).current_period_end;
    await callFn('qpay-callback', { query: `?inv=${p.sender_invoice_no}` });
    await callFn('qpay-callback', { query: `?inv=${p.sender_invoice_no}` });
    expect((await sub()).current_period_end).toBe(end1);
    expect((await sub()).status).toBe('active');
  });

  it('PAY-03 reconcile activates without a callback', async () => {
    const before = (await sub()).current_period_end;
    const p = await invoice();
    await mockPay(p.qpay_invoice_id, p.amount_mnt);
    const r = await cron('qpay-reconcile');
    expect(r.status).toBe(200);
    expect((await admin.from('payments').select('status').eq('id', p.id).single()).data!.status).toBe('paid');
    expect(Date.parse((await sub()).current_period_end) > Date.parse(before)).toBe(true);
  });

  it('PAY-04 underpaid invoice is not applied and is visible to admins', async () => {
    const before = (await sub()).current_period_end;
    const p = await invoice();
    await mockPay(p.qpay_invoice_id, 100);
    const r = await callFn('qpay-callback', { query: `?inv=${p.sender_invoice_no}` });
    expect(r.body.status).toBe('amount_mismatch');
    expect((await sub()).current_period_end).toBe(before);
    const pay = (await admin.from('payments').select('*').eq('id', p.id).single()).data!;
    expect(pay.status).toBe('failed');
    expect((await admin.from('audit_log').select('id').eq('action', 'payment.amount_mismatch').eq('entity_id', p.id)).data).toHaveLength(1);
  });
});

describe('ORG-01 employee cannot see colleagues stats or change org template', () => {
  it('isolation + template lock', async () => {
    const [owner, e1, e2] = await Promise.all([newUser('o'), newUser('e1'), newUser('e2')]);
    const org = (await owner.db.from('organizations').insert({ name: 'QA Org2', owner_id: owner.id, locked_template_id: 'corporate', allow_employee_edit_fields: ['phone'] }).select().single()).data!;
    await admin.from('subscriptions').insert({ org_id: org.id, plan_id: 'team', seats: 5, status: 'active', current_period_start: new Date().toISOString(), current_period_end: new Date(Date.now() + 30 * 864e5).toISOString() });
    await admin.from('org_members').insert([
      { org_id: org.id, user_id: e1.id, role: 'member', status: 'active' },
      { org_id: org.id, user_id: e2.id, role: 'member', status: 'active' },
    ]);
    const c1 = await createCard(e1, { org_id: org.id });
    const c2 = await createCard(e2, { org_id: org.id });
    for (const c of [c1, c2]) await callFn('track-event', { body: { slug: c.slug, event: 'view' }, headers: guestHeaders('org') });

    expect((await e1.db.from('card_events').select('card_id')).data!.every((r) => r.card_id === c1.id)).toBe(true);
    expect((await e1.db.from('card_events').select('id').eq('card_id', c2.id)).data).toEqual([]);
    expect((await e1.db.rpc('get_card_stats', { p_card_ids: [c2.id] })).data).toEqual([]);
    expect((await owner.db.from('card_events').select('card_id')).data!.length).toBeGreaterThanOrEqual(2);

    const t = await e1.db.from('cards').update({ template_id: 'dark' }).eq('id', c1.id);
    expect(t.error?.message).toBe('org_template_locked');
    const f = await e1.db.from('cards').update({ company: 'Other' }).eq('id', c1.id);
    expect(f.error?.message).toBe('org_field_locked');
    const o = await e1.db.from('organizations').update({ locked_template_id: null }).eq('id', org.id).select();
    expect(o.data ?? []).toEqual([]);
  });
});

describe('PUB-01 expired plan keeps public card, QR and vCard working', () => {
  it('public_cards still serves both cards', async () => {
    const u = await newUser('pub');
    await setPlan(u.id, 'pro');
    const a = await createCard(u);
    const b = await createCard(u);
    await expirePlan(u.id);
    const { data } = await anon().from('public_cards').select('slug, first_name, links').in('slug', [a.slug, b.slug]);
    expect(data).toHaveLength(2);
    const ev = await callFn('track-event', { body: { slug: b.slug, event: 'qr_open' }, headers: guestHeaders('pub') });
    expect(ev.status).toBe(200);
  });
});

describe('PRIV-01/02 privacy', () => {
  it('PRIV-01 no IP address stored in card_events', async () => {
    const u = await newUser('ip');
    const c = await createCard(u);
    const ip = '203.0.113.199';
    await callFn('track-event', { body: { slug: c.slug, event: 'view' }, headers: { 'x-forwarded-for': ip, 'user-agent': 'priv' } });
    const rows = (await admin.from('card_events').select('*').eq('card_id', c.id)).data!;
    expect(rows.length).toBe(1);
    expect(JSON.stringify(rows)).not.toContain(ip);
    expect(Object.keys(rows[0]!).some((k) => /ip/i.test(k))).toBe(false);
  });

  it('PRIV-02 viewer name only shown when the viewer opted in', async () => {
    const [owner, shy, open] = await Promise.all([newUser('own'), newUser('shy'), newUser('open')]);
    await admin.from('profiles').update({ show_name_to_owners: true }).eq('id', open.id);
    const c = await createCard(owner);
    await callFn('track-event', { token: shy.token, body: { slug: c.slug, event: 'view' }, headers: guestHeaders('shy') });
    await callFn('track-event', { token: open.token, body: { slug: c.slug, event: 'view' }, headers: guestHeaders('open') });
    const viewers = (await owner.db.rpc('get_named_viewers', { p_card_id: c.id })).data!;
    expect(viewers.map((v: { viewer_user_id: string }) => v.viewer_user_id)).toEqual([open.id]);
    const raw = (await admin.from('card_events').select('viewer_user_id').eq('card_id', c.id)).data!.map((r) => r.viewer_user_id);
    expect(raw).not.toContain(shy.id);
  });
});

describe('EXC-01/02 contact exchange', () => {
  let card: { id: string; slug: string };
  beforeAll(async () => {
    const u = await newUser('exc');
    await setPlan(u.id, 'pro');
    card = await createCard(u);
  });
  const body = (o: Record<string, unknown> = {}) => ({ slug: card.slug, name: 'Зочин', phone: '+97699001122', consent: true, turnstile_token: TURNSTILE_OK, ...o });

  it('EXC-01 without consent or Turnstile → refused', async () => {
    expect((await callFn('contact-exchange', { body: body({ consent: false }), headers: guestHeaders(1) })).body.status).toBe('consent_required');
    expect((await callFn('contact-exchange', { body: body({ turnstile_token: undefined }), headers: guestHeaders(1) })).body.status).toBe('captcha_failed');
    expect((await callFn('contact-exchange', { body: body({ turnstile_token: 'forged' }), headers: guestHeaders(1) })).body.status).toBe('captcha_failed');
  });

  it('EXC-02 more than 5 per visitor per hour → refused', async () => {
    const h = guestHeaders('same');
    const statuses: string[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await callFn('contact-exchange', { body: body({ name: `G${i}` }), headers: h })).body.status);
    expect(statuses).toEqual(['ok', 'ok', 'ok', 'ok', 'ok', 'rate_limited']);
  });
});

describe('ENT-01 Free user cannot write CRM fields via REST; Pro can', () => {
  it('note / follow_up_at', async () => {
    const [free, pro] = await Promise.all([newUser('f'), newUser('p')]);
    await setPlan(pro.id, 'pro');
    const fc = (await free.db.from('contacts').insert({ owner_id: free.id, name: 'x' }).select().single()).data!;
    expect((await free.db.from('contacts').update({ note: 'n' }).eq('id', fc.id)).error?.message).toBe('crm_not_enabled');
    expect((await free.db.from('contacts').update({ follow_up_at: '2030-01-01' }).eq('id', fc.id)).error?.message).toBe('crm_not_enabled');
    expect((await free.db.from('contacts').insert({ owner_id: free.id, name: 'y', note: 'n' })).error?.message).toBe('crm_not_enabled');
    const pc = await pro.db.from('contacts').insert({ owner_id: pro.id, name: 'z', note: 'n', follow_up_at: '2030-01-01' }).select().single();
    expect(pc.error).toBeNull();
  });
});
