// Turns OCR text from a photographed paper business card into contact fields — runs on the phone,
// no network. Phones, e-mails and websites are reliable; names/titles are best-effort heuristics
// (the server AI refines them when online).

export interface CardFields {
  first_name: string;
  last_name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  address: string;
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL_RE = /\b((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:mn|com|org|net|io|co|edu|gov|info|biz|app|dev)(?:\/[^\s]*)?)\b/i;
const PHONE = /(?:\+?\d[\d\s().-]{6,}\d)/g;
const LABEL = /^(?:tel|phone|mobile|mob|fax|утас|гар утас|факс|e-?mail|имэйл|web|вэб|address|хаяг)\s*[:.]?\s*/i;

const TITLE_WORDS = [
  'менежер', 'захирал', 'зөвлөх', 'инженер', 'нягтлан', 'борлуулагч', 'мэргэжилтэн', 'ахлах', 'дарга', 'тэргүүн', 'эрхлэгч', 'дизайнер', 'хөгжүүлэгч', 'төлөөлөгч', 'багш', 'эмч', 'хуульч', 'ерөнхий',
  'director', 'manager', 'engineer', 'ceo', 'cto', 'cfo', 'coo', 'founder', 'co-founder', 'officer', 'consultant', 'specialist', 'sales', 'head', 'lead', 'designer', 'developer', 'president', 'executive', 'accountant', 'partner', 'owner', 'analyst', 'architect', 'advisor', 'agent', 'representative',
];
const COMPANY_WORDS = [
  'ххк', 'хк', 'тбб', 'төк', 'компани', 'групп', 'банк', 'даатгал', 'корпораци', 'их сургууль', 'сургууль', 'яам', 'агентлаг', 'холдинг',
  'llc', 'ltd', 'inc', 'corp', 'corporation', 'group', 'bank', 'insurance', 'holding', 'company', 'co.', 'gmbh', 'university', 'studio', 'agency', 'solutions', 'technologies', 'systems',
];
const ADDRESS_WORDS = ['дүүрэг', 'хороо', 'гудамж', 'байр', 'тоот', 'улаанбаатар', 'district', 'khoroo', 'street', 'st.', 'avenue', 'ulaanbaatar', 'building', 'floor', 'давхар', 'төв', 'tower', 'plaza'];

const has = (line: string, words: string[]) => {
  const l = line.toLowerCase();
  return words.some((w) => (w.length <= 4 ? new RegExp(`(^|[^\\p{L}])${w.replace('.', '\\.')}([^\\p{L}]|$)`, 'u').test(l) : l.includes(w)));
};

/** Mongolian numbers: keep a leading +976, group 8 digits as 4-4. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  const m = digits.match(/^(?:\+?976)?(\d{8})$/);
  if (m) return `${digits.startsWith('+') || digits.startsWith('976') ? '+976 ' : ''}${m[1]!.slice(0, 4)} ${m[1]!.slice(4)}`;
  return raw.trim().replace(/\s+/g, ' ');
}

/** Name line: 2–3 words, letters / initials only, each starting with a capital. */
function looksLikeName(line: string): boolean {
  if (/\d|@/.test(line) || line.length > 40) return false;
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 3) return false;
  return words.every((w) => /^\p{Lu}[\p{L}'’-]*\.?$/u.test(w) || /^\p{Lu}\.\p{Lu}[\p{Ll}'’-]+$/u.test(w));
}

function splitName(line: string): { first_name: string; last_name: string } {
  const words = line.split(/\s+/).filter(Boolean);
  // «Б.Болд» → last «Б.», first «Болд»
  if (words.length === 1) {
    const m = words[0]!.match(/^(\p{Lu}\.)(.+)$/u);
    return m ? { last_name: m[1]!, first_name: m[2]! } : { first_name: words[0]!, last_name: '' };
  }
  const cyrillic = /\p{Script=Cyrillic}/u.test(line);
  const initialFirst = /^\p{Lu}\.$/u.test(words[0]!);
  // Mongolian order is «Овог Нэр» (family name first); Latin cards usually «First Last».
  if (cyrillic || initialFirst) return { last_name: words[0]!, first_name: words.slice(1).join(' ') };
  return { first_name: words.slice(0, -1).join(' '), last_name: words[words.length - 1]! };
}

export function parseCardText(text: string): CardFields {
  const out: CardFields = { first_name: '', last_name: '', title: '', company: '', phone: '', email: '', website: '', address: '' };
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const rest: string[] = [];

  for (const raw of lines) {
    const line = raw.replace(LABEL, '');
    const email = line.match(EMAIL)?.[0];
    if (email) {
      out.email ||= email.toLowerCase();
      continue;
    }
    const phones = [...line.matchAll(PHONE)].map((m) => m[0]).filter((p) => p.replace(/\D/g, '').length >= 8);
    if (phones.length && phones.join('').replace(/\D/g, '').length >= line.replace(/\D/g, '').length * 0.8 && !/\p{L}{4,}/u.test(line.replace(LABEL, ''))) {
      out.phone ||= normalizePhone(phones[0]!);
      continue;
    }
    const url = line.match(URL_RE)?.[1];
    if (url && !/\s/.test(line.replace(url, '').trim() || '')) {
      out.website ||= /^https?:\/\//i.test(url) ? url : `https://${url.toLowerCase()}`;
      continue;
    }
    rest.push(line);
  }

  for (const line of rest) {
    if (!out.company && has(line, COMPANY_WORDS)) out.company = line;
    else if (!out.title && has(line, TITLE_WORDS)) out.title = line;
    else if (!out.address && has(line, ADDRESS_WORDS)) out.address = line;
  }
  const nameLine = rest.find((l) => l !== out.company && l !== out.title && l !== out.address && (looksLikeName(l) || /^\p{Lu}\.\p{Lu}\p{Ll}+$/u.test(l)));
  if (nameLine) Object.assign(out, splitName(nameLine));
  // A short all-caps line nobody claimed is usually the company/brand.
  if (!out.company) out.company = rest.find((l) => l !== nameLine && l !== out.title && l !== out.address && /^[\p{Lu}\d &.,'-]{2,40}$/u.test(l)) ?? '';
  return out;
}
