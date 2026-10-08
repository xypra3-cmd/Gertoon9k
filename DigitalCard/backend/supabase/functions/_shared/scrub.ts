// Personal-data scrubber for error reports (pure — no Deno APIs, so web/mobile tests run it too:
// packages/shared/test/scrub.test.ts checks this file and packages/shared/src/scrub.ts give the same result).
const SCRUBBERS: [RegExp, string][] = [
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[jwt]'],
  [/\b(bearer|basic)\s+[\w.~+/=-]+/gi, '$1 [token]'],
  [/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]'],
  [/\b\d{1,3}(\.\d{1,3}){3}\b/g, '[ip]'],
  // IPv6, full or compressed (needs «::» or 4+ colons, so clock times like 12:30:45 survive)
  [/(?<![\w:])(?=[0-9a-f:]*(?:::|(?:[0-9a-f]{1,4}:){4}))[0-9a-f]{0,4}(?::[0-9a-f]{0,4}){2,7}(?![\w:])/gi, '[ip]'],
  [/\+?\d[\d\s-]{6,}\d/g, '[number]'],
];

// Record ids (payment_id, card_id) are not personal data and are what makes an error actionable.
const UUID = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/** Removes personal data and secrets from free text before it leaves the server. */
export function scrub(text: string): string {
  return text
    .split(UUID)
    .map((part, i) => {
      if (i % 2 === 1) return part;
      let out = part;
      for (const [re, by] of SCRUBBERS) out = out.replace(re, by);
      return out;
    })
    .join('')
    .slice(0, 2000);
}
