import { createClient, SupabaseClient } from '@supabase/supabase-js';

function createSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing required env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  const required = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
  ] as const;
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }

  return createClient(url, key);
}

/**
 * Legacy anon client — 仅用于 API routes 中不需要 SSR session 的场景。
 * 需要用户认证的 API routes 请使用 `createSupabaseServerClient()` (from @supabase/ssr)。
 */
export const supabase = createSupabaseClient();

// ===== Database Types =====

export type Avatar = {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  photo_url: string | null;
  voice_id: string | null;
  profile: Record<string, unknown> | null;
  system_prompt: string | null;
  character_card: Record<string, unknown> | null;
  creation_step: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type Memory = {
  id: string;
  avatar_id: string;
  content: string;
  source: 'conversation' | 'auto_extract' | 'manual';
  importance: number;
  confirmed: boolean;
  confidence_score: number | null;
  memory_type: string;
  emotion_type: string | null;
  emotion_intensity: number | null;
  memory_time: string | null;
  access_count: number;
  embedding: number[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type EmotionTurn = {
  turn: number;
  user_text: string;
  emotion: string;
  intensity: number;
  timestamp: string;
};

export type ConversationSummary = {
  topics: string[];
  emotion_arc: string[];
  new_info: string[];
  relationship_change?: string;
  summary_text: string;
};

export type Conversation = {
  id: string;
  avatar_id: string;
  user_id: string;
  messages: Message[];
  emotion_summary: string | null;
  emotion_trajectory: EmotionTurn[];
  summary: ConversationSummary | null;
  turn_count: number;
  last_summary_turn: number;
  created_at: string;
  updated_at: string;
};

export type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  audio_url?: string;
  timestamp?: string;
};

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  subscription_plan: 'free' | 'memorial' | 'remembrance';
  created_at: string;
};

export type ProactiveMessage = {
  id: string;
  avatar_id: string;
  type: 'birthday' | 'anniversary' | 'high_importance_memory' | 'emotional_checkin';
  title: string;
  content: string;
  dismissed: boolean;
  sent: boolean;
  created_at: string;
};
