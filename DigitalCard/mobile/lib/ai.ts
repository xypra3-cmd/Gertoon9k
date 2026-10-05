// AI assist (no chatbot) — same Edge Function and result shapes as the web app.
import * as ImagePicker from 'expo-image-picker';
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
  note: {
    summary: string;
    tags: string[];
    next_step: string;
    follow_up_days: number;
  };
  followup: { subject: string; message: string };
}
export type AiTask = keyof AiResults;

export async function runAi<K extends AiTask>(task: K, input: Record<string, unknown>, locale: 'mn' | 'en'): Promise<AiResults[K]> {
  const { data, error } = await supabase.functions.invoke('ai-assist', {
    body: { task, locale, input },
  });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const parsed = ctx ? await ctx.json().catch(() => null) : null;
    throw parsed ?? error;
  }
  return (data as { result: AiResults[K] }).result;
}

/** Takes a photo of a paper business card and returns it as base64 JPEG (null when cancelled). */
export async function photographCard(): Promise<{
  data: string;
  mediaType: 'image/jpeg';
} | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.5,
    base64: true,
    exif: false,
  });
  const asset = res.canceled ? null : res.assets[0];
  if (!asset?.base64) return null;
  return { data: asset.base64, mediaType: 'image/jpeg' };
}
