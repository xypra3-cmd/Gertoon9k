// High-priority tests (Prompt 04 §3) that run at the API level.
import { describe, expect, it } from 'vitest';
import { ANON_KEY, API_URL } from './env';
import { admin, callFn, createCard, guestHeaders, newUser } from './helpers';

describe('SEC-05 upload limits (storage)', () => {
  const upload = async (token: string, path: string, body: Uint8Array, type: string) =>
    (await fetch(`${API_URL}/storage/v1/object/avatars/${path}`, { method: 'POST', headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': type }, body })).status;
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(64).fill(0)]);

  it('rejects 5 MB, .svg, .exe and foreign folders; accepts a small png', async () => {
    const [u, other] = await Promise.all([newUser('up'), newUser('up2')]);
    expect(await upload(u.token, `${u.id}/ok.png`, png, 'image/png')).toBe(200);
    expect(await upload(u.token, `${u.id}/big.png`, new Uint8Array(5 * 1024 * 1024), 'image/png')).toBeGreaterThanOrEqual(400);
    expect(await upload(u.token, `${u.id}/x.svg`, new TextEncoder().encode('<svg/>'), 'image/svg+xml')).toBeGreaterThanOrEqual(400);
    expect(await upload(u.token, `${u.id}/x.exe`, png, 'application/x-msdownload')).toBeGreaterThanOrEqual(400);
    expect(await upload(u.token, `${other.id}/hijack.png`, png, 'image/png')).toBeGreaterThanOrEqual(400);
  });
});

describe('SEC-06 track-event rate limit', () => {
  it('100 requests in a minute → only 30 counted', async () => {
    const u = await newUser('rl');
    const c = await createCard(u);
    const h = guestHeaders('burst');
    const results = await Promise.all(Array.from({ length: 100 }, () => callFn('track-event', { body: { slug: c.slug, event: 'view' }, headers: h })));
    expect(results.filter((r) => r.body.status === 'ok')).toHaveLength(30);
    expect((await admin.from('card_events').select('id').eq('card_id', c.id)).data).toHaveLength(30);
  });
});

describe('FUN-03 statistics consistency', () => {
  it('All ≥ 30d ≥ 7d ≥ today and total = view + qr_open', async () => {
    const u = await newUser('st');
    const c = await createCard(u);
    const rows = [0, 0, 3, 10, 20, 45].flatMap((d, i) => [
      { card_id: c.id, event: 'view', visitor_hash: String(i).padStart(64, 'a'), created_at: new Date(Date.now() - d * 864e5).toISOString() },
      { card_id: c.id, event: 'qr_open', visitor_hash: String(i).padStart(64, 'b'), created_at: new Date(Date.now() - d * 864e5).toISOString() },
    ]);
    await admin.from('card_events').insert(rows);
    const ub = (days: number) => {
      const day = new Date(Date.now() + 8 * 3600e3 - days * 864e5).toISOString().slice(0, 10);
      return new Date(Date.parse(`${day}T00:00:00Z`) - 8 * 3600e3).toISOString();
    };
    const get = async (from: string | null) => (await u.db.rpc('get_card_stats', { p_card_ids: [c.id], p_from: from ?? undefined })).data![0];
    const [all, d30, d7, today] = await Promise.all([get(null), get(ub(29)), get(ub(6)), get(ub(0))]);
    for (const s of [all, d30, d7, today]) expect(Number(s.total_opens)).toBe(Number(s.views) + Number(s.qr_opens));
    expect(Number(all.total_opens)).toBeGreaterThanOrEqual(Number(d30.total_opens));
    expect(Number(d30.total_opens)).toBeGreaterThanOrEqual(Number(d7.total_opens));
    expect(Number(d7.total_opens)).toBeGreaterThanOrEqual(Number(today.total_opens));
    expect(Number(all.total_opens)).toBe(12);
  });
});

describe('Account deletion (store requirement)', () => {
  it('user can delete own account and all data', async () => {
    const u = await newUser('del');
    const c = await createCard(u);
    await u.db.from('contacts').insert({ owner_id: u.id, name: 'x' });
    expect((await u.db.rpc('delete_my_account')).error).toBeNull();
    expect((await admin.from('cards').select('id').eq('id', c.id)).data).toEqual([]);
    expect((await admin.from('contacts').select('id').eq('owner_id', u.id)).data).toEqual([]);
  });
});
