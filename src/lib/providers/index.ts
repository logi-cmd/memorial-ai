import { AppConfig, getAppConfig } from './config';

export function getLLMProvider(config?: AppConfig) {
  const c = config || getAppConfig();
  if (c.mode === 'local' || c.llm.provider === 'ollama') {
    return require('./ollama');
  }
  return require('../claude');
}

export function getEmbeddingProvider(config?: AppConfig) {
  const c = config || getAppConfig();
  if (c.mode === 'local' || c.embedding.provider === 'local') {
    return require('./local-embedding');
  }
  return require('../embedding');
}

export function getTTSProvider(config?: AppConfig) {
  const c = config || getAppConfig();
  if (c.mode === 'local' || c.tts.provider === 'edge-tts') {
    return require('./edge-tts');
  }
  return require('../voice');
}