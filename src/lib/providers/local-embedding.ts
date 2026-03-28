import { pipeline } from '@xenova/transformers';

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

let embedder: Awaited<ReturnType<typeof pipeline>> | null = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', MODEL_NAME);
  }
  return embedder;
}

export async function localGenerateEmbedding(text: string): Promise<number[]> {
  const pipe = await getEmbedder();
  const result = await pipe(text, { pooling: 'mean', normalize: true } as any) as unknown as { data: Float32Array };
  return Array.from(result.data);
}

export async function localBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const pipe = await getEmbedder();
  const results: number[][] = [];
  for (const text of texts) {
    const result = await pipe(text, { pooling: 'mean', normalize: true } as any) as unknown as { data: Float32Array };
    results.push(Array.from(result.data));
  }
  return results;
}