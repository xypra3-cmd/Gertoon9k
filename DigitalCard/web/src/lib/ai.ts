// AI assist (no chatbot): one button → one structured suggestion the user reviews before saving.
import { supabase } from './supabase';

export interface AiResults {
  bio: { bio: string; slogan: string };
  scan: {
    first_name: string;
    last_name: string;
    title: string;
    company: string;
    phone: string;
    email: string;
    website: string;
    address: string;
  };
  note: { summary: string; tags: string[]; next_step: string; follow_up_days: number };
  followup: { subject: string; message: string };
}
export type AiTask = keyof AiResults;

export async function runAi<T extends AiTask>(
  task: T,
  input: Record<string, unknown>,
  locale: 'mn' | 'en',
): Promise<{ result: AiResults[T]; remaining: number }> {
  const { data, error } = await supabase.functions.invoke('ai-assist', { body: { task, locale, input } });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const parsed = ctx ? await ctx.json().catch(() => null) : null;
    throw parsed ?? error;
  }
  return data as { result: AiResults[T]; remaining: number };
}

/** Reads an image file as base64 (without the data: prefix), downscaled to ≤ 1600px JPEG for speed. */
export async function imageToBase64(file: File): Promise<{ data: string; mediaType: 'image/jpeg' }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL('image/jpeg', 0.85);
  return { data: url.slice(url.indexOf(',') + 1), mediaType: 'image/jpeg' };
}
