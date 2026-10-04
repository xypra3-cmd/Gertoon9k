import { validateImageFile } from '@digitalcard/shared';

/** Validates and downsizes an image to WebP (max side `max` px) before upload. */
export async function prepareImage(
  file: File,
  max = 800,
): Promise<{ blob: Blob; error?: undefined } | { error: string; blob?: undefined }> {
  const v = validateImageFile(file);
  if (v !== 'ok') return { error: v };
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.86));
    if (!blob) return { blob: file };
    return { blob: blob.size < file.size ? blob : file };
  } catch {
    return { blob: file };
  }
}
