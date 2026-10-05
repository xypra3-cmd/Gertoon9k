// POST { task: 'bio' | 'scan' | 'note' | 'followup', locale?: 'mn' | 'en', input: {...} } with the user's JWT.
// One-shot AI helpers (no chatbot). The user always reviews the result before it is saved.
// Quota + plan checks live in the database (consume_ai_credit). Request content is never logged.
import Anthropic from '@anthropic-ai/sdk';
import { json, logEvent, preflight, readJson } from '../_shared/http.ts';
import { DbError, getUser, rpc } from '../_shared/db.ts';
import { TASKS, type Task } from './tasks.ts';

const MODEL = Deno.env.get('AI_MODEL') || 'claude-opus-5-5';
const MAX_IMAGE_BASE64 = 5_500_000; // ≈ 4 MB image

interface Body {
  task?: string;
  locale?: string;
  input?: Record<string, unknown>;
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  // Reads ANTHROPIC_API_KEY (Edge Function secret); ANTHROPIC_BASE_URL only for local mocks.
  client ??= new Anthropic({ baseURL: Deno.env.get('ANTHROPIC_BASE_URL') || undefined, maxRetries: 2, timeout: 60_000 });
  return client;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);

  const user = await getUser(req);
  if (!user) return json(req, { error: 'not_authenticated' }, 401);

  const body = await readJson<Body>(req);
  const task = body?.task as Task | undefined;
  if (!task || !(task in TASKS) || !body?.input || typeof body.input !== 'object') {
    return json(req, { error: 'invalid' }, 400);
  }
  const locale = body.locale === 'en' ? 'en' : 'mn';
  const spec = TASKS[task];

  let content: Anthropic.ContentBlockParam[];
  try {
    content = spec.build(body.input, locale);
  } catch {
    return json(req, { error: 'invalid' }, 400);
  }
  for (const block of content) {
    if (block.type === 'image' && block.source.type === 'base64' && block.source.data.length > MAX_IMAGE_BASE64) {
      return json(req, { error: 'image_too_large' }, 413);
    }
  }

  let remaining: number;
  try {
    remaining = await rpc<number>('consume_ai_credit', { p_user: user.id, p_task: task });
  } catch (e) {
    if (e instanceof DbError) return json(req, { error: e.message }, e.code === '42501' ? 403 : 429);
    throw e;
  }

  try {
    const response = await anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: spec.schema } },
      system: spec.system,
      messages: [{ role: 'user', content }],
    } as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming);

    if (response.stop_reason === 'refusal') {
      await rpc('refund_ai_credit', { p_user: user.id });
      logEvent('ai-assist', 'refusal', { task });
      return json(req, { error: 'ai_refused' }, 422);
    }
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') throw new Error('no_text');
    const result = JSON.parse(text.text);
    logEvent('ai-assist', 'ok', { task, model: response.model, out_tokens: response.usage.output_tokens });
    return json(req, { result, remaining });
  } catch (e) {
    await rpc('refund_ai_credit', { p_user: user.id }).catch(() => {});
    const status = e instanceof Anthropic.APIError ? e.status : undefined;
    logEvent('ai-assist', 'failed', { task, status: status ?? 'error' });
    return json(req, { error: 'ai_unavailable' }, 502);
  }
});
