export interface AppConfig {
  mode: 'local' | 'cloud';
  llm: { provider: 'ollama' | 'anthropic'; model?: string };
  embedding: { provider: 'local' | 'openai' };
  tts: { provider: 'edge-tts' | 'elevenlabs' };
}

export function getAppConfig(): AppConfig {
  return {
    mode: (process.env.APP_MODE as 'local' | 'cloud') || 'local',
    llm: { provider: (process.env.LLM_PROVIDER as 'ollama' | 'anthropic') || 'ollama', model: process.env.OLLAMA_MODEL },
    embedding: { provider: (process.env.EMBEDDING_PROVIDER as 'local' | 'openai') || 'local' },
    tts: { provider: (process.env.TTS_PROVIDER as 'edge-tts' | 'elevenlabs') || 'edge-tts' },
  };
}