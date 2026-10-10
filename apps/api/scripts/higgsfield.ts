import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const HIGGSFIELD_BASE_URL = 'https://api.higgsfield.ai';

export interface HiggsfieldImageRequest {
  model: string;
  prompt: string;
  image_urls?: string[];
}

interface HiggsfieldResponse {
  status: string;
  request_id?: string;
  status_url?: string;
  error?: string;
  images?: Array<{ url?: string }>;
}

function apiKey(): string {
  const key = process.env.HIGGSFIELD_API_KEY;
  if (!key) throw new Error('HIGGSFIELD_API_KEY is required for story image generation');
  return key;
}

export async function generateImage(request: HiggsfieldImageRequest): Promise<string> {
  const response = await fetch(`${HIGGSFIELD_BASE_URL}/${request.model}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey()}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({ prompt: request.prompt, image_urls: request.image_urls }),
  });
  const initial = (await response.json()) as HiggsfieldResponse;
  if (!response.ok || !initial.status_url) {
    throw new Error(`Higgsfield submission failed (${response.status}): ${initial.error ?? 'missing status_url'}`);
  }

  const deadline = Date.now() + Number(process.env.HIGGSFIELD_TIMEOUT_MS ?? 300000);
  while (Date.now() < deadline) {
    const statusResponse = await fetch(initial.status_url, {
      headers: { Authorization: `Key ${apiKey()}` },
    });
    const result = (await statusResponse.json()) as HiggsfieldResponse;
    if (result.status === 'completed') {
      const url = result.images?.[0]?.url;
      if (!url) throw new Error('Higgsfield completed without an image URL');
      return url;
    }
    if (['failed', 'nsfw', 'canceled'].includes(result.status)) {
      throw new Error(`Higgsfield image job ${result.status}: ${result.error ?? 'unknown error'}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error('Higgsfield image job timed out');
}

export async function downloadImage(url: string, directory: string, filename: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image download failed (${response.status})`);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, filename), Buffer.from(await response.arrayBuffer()));
  return filename;
}
