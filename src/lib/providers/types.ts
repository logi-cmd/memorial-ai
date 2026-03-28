export interface LLMProvider {
  streamChat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    systemPrompt: string,
    characterCard: Record<string, unknown>,
    maxTokens: number
  ): ReadableStream;

  generateText(
    prompt: string,
    systemPrompt: string,
    maxTokens: number
  ): Promise<string>;

  analyzeEmotion(
    userMessage: string
    ): Promise<{
    emotion: string;
    intensity: number;
    summary: string;
  }>;

  extractMemory(
    conversationHistory: string,
    currentMessage: string,
    characterCard: string,
    maxTokens: number
  ): Promise<Array<{
    id: string;
    content: string;
  category: string;
  importance: number;
  }>>;

  generateConversationSummary(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number
  ): Promise<string>;

  evolveCharacterCard(
    currentCard: string,
    newMemories: string[],
    conversations: string[]
  ): Promise<string | null>;
}

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  batchEmbeddings(texts: string[]): Promise<number[][]>;
  dimension: number;
}

export interface TTSProvider {
  synthesize(
    text: string,
    voiceId?: string,
    options?: { speed?: number; pitch?: number }
  ): Promise<BufferSource>;

  cloneVoice(
    audioBuffer: Buffer,
    voiceName: string,
    description?: string
  ): Promise<string>;

  getVoices(): Promise<Array<{ id: string; name: string; preview?: string }>>;
}

export interface StorageProvider {
  getAvatars(): Promise<any[]>;
  getAvatar(id: string): Promise<any | null>;
  createAvatar(avatar: any): Promise<any>;
  updateAvatar(id: string, updates: any): Promise<any>;
  deleteAvatar(id: string): Promise<void>;

  getMemories(avatarId: string, options?: { confirmed?: boolean; type?: string; limit?: number }): Promise<any[]>;
  getMemory(id: string): Promise<any | null>;
  createMemory(memory: any): Promise<any>;
  updateMemory(id: string, updates: any): Promise<any>;
  deleteMemory(id: string): Promise<void>;

  getConversations(avatarId: string, limit?: number): Promise<any[]>;
  createConversation(conversation: any): Promise<any>;
  updateConversation(id: string, updates: any): Promise<void>;

  getProactiveMessages(avatarId: string): Promise<any[]>;
  createProactiveMessage(message: any): Promise<any>;

  saveFile(bucket: string, key: string, data: Buffer | string): Promise<string>;
  getFile(bucket: string, key: string): Promise<Buffer | null>;
  deleteFile(bucket: string, key: string): Promise<void>;
}
