const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

export async function ollamaStreamChat(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  model?: string
) {
  const selectedModel = model || DEFAULT_MODEL;
  const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: selectedModel,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
      options: { temperature: 0.7, num_predict: 2048 },
    }),
  });
  return response;
}

export async function ollamaGenerate(prompt: string, model?: string): Promise<string> {
  const selectedModel = model || DEFAULT_MODEL;
  const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: selectedModel,
      prompt,
      stream: false,
      options: { temperature: 0.3 },
    }),
  });
  const data = await response.json();
  return data.response || '';
}