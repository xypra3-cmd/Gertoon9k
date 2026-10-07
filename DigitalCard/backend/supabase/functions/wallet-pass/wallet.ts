// Apple Wallet (.pkpass) and Google Wallet («Save to Google Wallet» JWT) for a business card.
// Keys live only in Edge Function secrets (base64 of the PEM files). Missing → not configured.
// @deno-types="@types/node-forge"
import forge from 'node-forge';
import { zip } from '../_shared/zip.ts';
import { PASS_IMAGES } from './images.ts';

export interface PassCard {
  id: string;
  slug: string;
  first_name: string;
  last_name: string | null;
  title: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  color: string; // #RRGGBB
  url: string;
}

/** Unset secrets can arrive as '' or as the literal `env(NAME)` placeholder from config.toml. */
const secret = (name: string) => {
  const v = Deno.env.get(name)?.trim();
  return v && !v.startsWith('env(') ? v : undefined;
};
const b64 = (name: string) => {
  const v = secret(name);
  return v ? new TextDecoder().decode(Uint8Array.from(atob(v), (c) => c.charCodeAt(0))) : null;
};

export interface AppleConfig {
  passTypeId: string;
  teamId: string;
  certPem: string;
  keyPem: string;
  wwdrPem: string;
  keyPassword?: string;
}
export function appleConfig(): AppleConfig | null {
  const passTypeId = secret('APPLE_PASS_TYPE_ID');
  const teamId = secret('APPLE_TEAM_ID');
  const certPem = b64('APPLE_PASS_CERT_B64');
  const keyPem = b64('APPLE_PASS_KEY_B64');
  const wwdrPem = b64('APPLE_WWDR_CERT_B64');
  if (!passTypeId || !teamId || !certPem || !keyPem || !wwdrPem) return null;
  return { passTypeId, teamId, certPem, keyPem, wwdrPem, keyPassword: secret('APPLE_PASS_KEY_PASSWORD') || undefined };
}

export interface GoogleConfig {
  issuerId: string;
  serviceAccountEmail: string;
  keyPem: string;
}
export function googleConfig(): GoogleConfig | null {
  const issuerId = secret('GOOGLE_WALLET_ISSUER_ID');
  const serviceAccountEmail = secret('GOOGLE_WALLET_SA_EMAIL');
  const keyPem = b64('GOOGLE_WALLET_SA_KEY_B64');
  if (!issuerId || !serviceAccountEmail || !keyPem) return null;
  return { issuerId, serviceAccountEmail, keyPem };
}

const fullName = (c: PassCard) => [c.last_name, c.first_name].filter(Boolean).join(' ').trim() || c.first_name;
const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

function sha1Hex(data: Uint8Array): string {
  const md = forge.md.sha1.create();
  md.update(forge.util.binary.raw.encode(data));
  return md.digest().toHex();
}

export function applePassJson(c: PassCard, cfg: Pick<AppleConfig, 'passTypeId' | 'teamId'>) {
  const field = (key: string, label: string, value: string | null) => (value ? [{ key, label, value }] : []);
  return {
    formatVersion: 1,
    passTypeIdentifier: cfg.passTypeId,
    teamIdentifier: cfg.teamId,
    serialNumber: c.id,
    organizationName: 'Digital Card',
    description: `${fullName(c)} — Digital Card`,
    logoText: c.company || 'Digital Card',
    foregroundColor: 'rgb(255, 255, 255)',
    labelColor: 'rgb(220, 228, 255)',
    backgroundColor: rgb(c.color),
    generic: {
      primaryFields: [{ key: 'name', label: c.title ?? '', value: fullName(c) }],
      secondaryFields: field('company', 'Байгууллага', c.company),
      auxiliaryFields: [...field('phone', 'Утас', c.phone), ...field('email', 'Имэйл', c.email)],
      backFields: [{ key: 'link', label: 'Карт', value: c.url }],
    },
    barcodes: [{ format: 'PKBarcodeFormatQR', message: c.url, messageEncoding: 'iso-8859-1' }],
  };
}

/** Builds and signs the .pkpass archive (PKCS#7 detached signature over manifest.json). */
export function buildApplePass(c: PassCard, cfg: AppleConfig): Uint8Array {
  const enc = new TextEncoder();
  const files: Record<string, Uint8Array> = { 'pass.json': enc.encode(JSON.stringify(applePassJson(c, cfg))) };
  for (const [name, data] of Object.entries(PASS_IMAGES)) files[name] = Uint8Array.from(atob(data), (ch) => ch.charCodeAt(0));
  const manifest: Record<string, string> = {};
  for (const [name, data] of Object.entries(files)) manifest[name] = sha1Hex(data);
  const manifestBytes = enc.encode(JSON.stringify(manifest));

  const cert = forge.pki.certificateFromPem(cfg.certPem);
  const wwdr = forge.pki.certificateFromPem(cfg.wwdrPem);
  const key = cfg.keyPassword ? forge.pki.decryptRsaPrivateKey(cfg.keyPem, cfg.keyPassword) : forge.pki.privateKeyFromPem(cfg.keyPem);
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(forge.util.binary.raw.encode(manifestBytes));
  p7.addCertificate(cert);
  p7.addCertificate(wwdr);
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign({ detached: true });
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();

  files['manifest.json'] = manifestBytes;
  files['signature'] = forge.util.binary.raw.decode(der);
  return zip(files);
}

const b64url = (data: Uint8Array | string) =>
  btoa(typeof data === 'string' ? unescape(encodeURIComponent(data)) : String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

function pemToDer(pem: string): Uint8Array {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
}

/** «Save to Google Wallet» link: a JWT (RS256, service-account key) carrying a Generic pass. */
export async function googleSaveUrl(c: PassCard, cfg: GoogleConfig, origins: string[]): Promise<string> {
  const classId = `${cfg.issuerId}.digitalcard`;
  const object = {
    id: `${cfg.issuerId}.${c.id}`,
    classId,
    state: 'ACTIVE',
    cardTitle: { defaultValue: { language: 'mn', value: c.company || 'Digital Card' } },
    header: { defaultValue: { language: 'mn', value: fullName(c) } },
    ...(c.title ? { subheader: { defaultValue: { language: 'mn', value: c.title } } } : {}),
    textModulesData: [
      ...(c.phone ? [{ id: 'phone', header: 'Утас', body: c.phone }] : []),
      ...(c.email ? [{ id: 'email', header: 'Имэйл', body: c.email }] : []),
    ],
    linksModuleData: { uris: [{ uri: c.url, description: 'Digital Card', id: 'card' }] },
    barcode: { type: 'QR_CODE', value: c.url },
    hexBackgroundColor: c.color,
  };
  const claims = {
    iss: cfg.serviceAccountEmail,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    origins,
    payload: { genericClasses: [{ id: classId }], genericObjects: [object] },
  };
  const signingInput = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify(claims))}`;
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(cfg.keyPem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput)));
  return `https://pay.google.com/gp/v/save/${signingInput}.${b64url(sig)}`;
}
