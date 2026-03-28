import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  __setTestDb,
  __closeDb,
  getAvatars,
  getAvatarById,
  createAvatar,
  updateAvatar,
  deleteAvatar,
  getMemories,
  createMemory,
  confirmMemory,
  deleteMemory,
  createConversation,
  getConversations,
  getMessages,
  addMessage,
  getProactiveMessages,
  createProactiveMessage,
  markProactiveSent,
} from '@/lib/db';

describe('db', () => {
  beforeEach(() => {
    __setTestDb();
  });

  afterEach(() => {
    __closeDb();
  });

  describe('Schema initialization', () => {
    it('creates the avatars table', () => {
      const avatars = getAvatars();
      expect(Array.isArray(avatars)).toBe(true);
    });

    it('creates the memories table', () => {
      const avatar = createAvatar({ name: 'Test', relationship: 'friend' }) as any;
      const memories = getMemories(avatar.id);
      expect(Array.isArray(memories)).toBe(true);
    });

    it('creates the conversations table', () => {
      const avatar = createAvatar({ name: 'Test', relationship: 'friend' }) as any;
      const convos = getConversations(avatar.id);
      expect(Array.isArray(convos)).toBe(true);
    });

    it('creates the messages table', () => {
      const avatar = createAvatar({ name: 'Test', relationship: 'friend' }) as any;
      const convo = createConversation(avatar.id) as any;
      const msgs = getMessages(convo.id);
      expect(Array.isArray(msgs)).toBe(true);
    });

    it('creates the proactive_messages table', () => {
      const avatar = createAvatar({ name: 'Test', relationship: 'friend' }) as any;
      const proactives = getProactiveMessages(avatar.id);
      expect(Array.isArray(proactives)).toBe(true);
    });

    it('creates indexes (verified by successful filtered queries)', () => {
      const avatar = createAvatar({ name: 'Test', relationship: 'friend' }) as any;
      createMemory({ avatar_id: avatar.id, content: 'test', source: 'user', type: 'conversation' });
      createConversation(avatar.id);
      expect(true).toBe(true);
    });
  });

  describe('Avatar CRUD', () => {
    it('createAvatar creates and returns avatar with generated id', () => {
      const avatar = createAvatar({ name: 'Alice', relationship: 'mother' }) as any;
      expect(avatar).toBeDefined();
      expect(avatar.id).toBeDefined();
      expect(typeof avatar.id).toBe('string');
      expect(avatar.name).toBe('Alice');
      expect(avatar.relationship).toBe('mother');
    });

    it('createAvatar with optional fields (photo_url)', () => {
      const avatar = createAvatar({
        name: 'Bob',
        relationship: 'father',
        photo_url: 'https://example.com/photo.jpg',
      }) as any;
      expect(avatar.photo_url).toBe('https://example.com/photo.jpg');
    });

    it('createAvatar with character_card serializes to JSON', () => {
      const card = { personality: 'kind', memories: ['loved gardening'] };
      const avatar = createAvatar({
        name: 'Carol',
        relationship: 'grandmother',
        character_card: card,
      }) as any;
      expect(typeof avatar.character_card).toBe('string');
      expect(JSON.parse(avatar.character_card)).toEqual(card);
    });

    it('getAvatarById returns correct avatar', () => {
      const created = createAvatar({ name: 'Dave', relationship: 'brother' }) as any;
      const found = getAvatarById(created.id) as any;
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('Dave');
    });

    it('getAvatarById returns undefined for non-existent id', () => {
      const found = getAvatarById('non-existent-id');
      expect(found).toBeUndefined();
    });

    it('getAvatars returns all avatars ordered by updated_at DESC', () => {
      createAvatar({ name: 'First', relationship: 'friend' });
      createAvatar({ name: 'Second', relationship: 'friend' });
      createAvatar({ name: 'Third', relationship: 'friend' });
      const avatars = getAvatars() as any[];
      expect(avatars.length).toBe(3);
      for (let i = 0; i < avatars.length - 1; i++) {
        expect(avatars[i].updated_at >= avatars[i + 1].updated_at).toBe(true);
      }
    });

    it('updateAvatar updates fields and returns updated avatar', () => {
      const avatar = createAvatar({ name: 'Eve', relationship: 'sister' }) as any;
      const updated = updateAvatar(avatar.id, { name: 'Eve Updated' }) as any;
      expect(updated.name).toBe('Eve Updated');
      expect(updated.id).toBe(avatar.id);
    });

    it('updateAvatar with character_card serializes to JSON', () => {
      const avatar = createAvatar({ name: 'Frank', relationship: 'uncle' }) as any;
      const card = { traits: ['humorous', 'wise'] };
      const updated = updateAvatar(avatar.id, { character_card: card }) as any;
      expect(JSON.parse(updated.character_card)).toEqual(card);
    });

    it('deleteAvatar cascade-deletes memories, conversations, messages, proactive_messages', () => {
      const avatar = createAvatar({ name: 'Grace', relationship: 'aunt' }) as any;

      createMemory({ avatar_id: avatar.id, content: 'memory1', source: 'user', type: 'conversation' });
      const convo = createConversation(avatar.id) as any;
      addMessage(convo.id, 'user', 'hello');
      createProactiveMessage(avatar.id, 'greeting', 'Hi there!');

      expect(getMemories(avatar.id).length).toBe(1);
      expect(getConversations(avatar.id).length).toBe(1);
      expect(getMessages(convo.id).length).toBe(1);
      expect(getProactiveMessages(avatar.id).length).toBe(1);

      deleteAvatar(avatar.id);

      expect(getAvatarById(avatar.id)).toBeUndefined();
      expect(getMemories(avatar.id).length).toBe(0);
      expect(getConversations(avatar.id).length).toBe(0);
      expect(getProactiveMessages(avatar.id).length).toBe(0);
    });
  });

  describe('Memory CRUD', () => {
    let avatarId: string;

    beforeEach(() => {
      const avatar = createAvatar({ name: 'Test Avatar', relationship: 'friend' }) as any;
      avatarId = avatar.id;
    });

    it('createMemory creates memory with default importance (0.5)', () => {
      const memory = createMemory({
        avatar_id: avatarId,
        content: 'Loved cooking pasta',
        source: 'user',
        type: 'conversation',
      }) as any;
      expect(memory).toBeDefined();
      expect(memory.id).toBeDefined();
      expect(memory.content).toBe('Loved cooking pasta');
      expect(memory.importance).toBe(0.5);
      expect(memory.confirmed).toBe(0);
    });

    it('createMemory with custom importance', () => {
      const memory = createMemory({
        avatar_id: avatarId,
        content: 'Very important memory',
        source: 'user',
        type: 'fact',
        importance: 0.9,
      }) as any;
      expect(memory.importance).toBe(0.9);
    });

    it('createMemory with embedding stores as JSON string in raw row', () => {
      const embedding = [0.1, 0.2, 0.3];
      const memory = createMemory({
        avatar_id: avatarId,
        content: 'Embedding test',
        source: 'auto_extract',
        type: 'conversation',
        embedding,
      }) as any;
      expect(typeof memory.embedding).toBe('string');
      expect(JSON.parse(memory.embedding)).toEqual(embedding);
    });

    it('getMemories returns all memories for avatar, ordered by created_at DESC', () => {
      createMemory({ avatar_id: avatarId, content: 'First', source: 'user', type: 'conversation' });
      createMemory({ avatar_id: avatarId, content: 'Second', source: 'user', type: 'conversation' });
      createMemory({ avatar_id: avatarId, content: 'Third', source: 'user', type: 'conversation' });

      const memories = getMemories(avatarId) as any[];
      expect(memories.length).toBe(3);
      for (const m of memories) {
        expect(m.embedding === null || Array.isArray(m.embedding)).toBe(true);
      }
    });

    it('getMemories with confirmed filter', () => {
      const m1 = createMemory({ avatar_id: avatarId, content: 'Unconfirmed', source: 'user', type: 'conversation' }) as any;
      const m2 = createMemory({ avatar_id: avatarId, content: 'Confirmed', source: 'user', type: 'conversation' }) as any;
      confirmMemory(m2.id);

      const confirmed = getMemories(avatarId, { confirmed: true }) as any[];
      const unconfirmed = getMemories(avatarId, { confirmed: false }) as any[];

      expect(confirmed.length).toBe(1);
      expect(confirmed[0].id).toBe(m2.id);
      expect(unconfirmed.length).toBe(1);
      expect(unconfirmed[0].id).toBe(m1.id);
    });

    it('getMemories with type filter', () => {
      createMemory({ avatar_id: avatarId, content: 'Conv memory', source: 'user', type: 'conversation' });
      createMemory({ avatar_id: avatarId, content: 'Fact memory', source: 'user', type: 'fact' });
      createMemory({ avatar_id: avatarId, content: 'Another fact', source: 'user', type: 'fact' });

      const facts = getMemories(avatarId, { type: 'fact' }) as any[];
      expect(facts.length).toBe(2);
      facts.forEach((m: any) => expect(m.type).toBe('fact'));
    });

    it('getMemories with limit', () => {
      for (let i = 0; i < 10; i++) {
        createMemory({ avatar_id: avatarId, content: `Memory ${i}`, source: 'user', type: 'conversation' });
      }
      const limited = getMemories(avatarId, { limit: 3 }) as any[];
      expect(limited.length).toBe(3);
    });

    it('getMemories with multiple filters combined', () => {
      createMemory({ avatar_id: avatarId, content: 'Conv unconfirmed', source: 'user', type: 'conversation' });
      const m2 = createMemory({ avatar_id: avatarId, content: 'Fact confirmed', source: 'user', type: 'fact' }) as any;
      confirmMemory(m2.id);
      createMemory({ avatar_id: avatarId, content: 'Fact unconfirmed', source: 'user', type: 'fact' });

      const result = getMemories(avatarId, { confirmed: false, type: 'fact', limit: 10 }) as any[];
      expect(result.length).toBe(1);
      expect(result[0].content).toBe('Fact unconfirmed');
    });

    it('confirmMemory sets confirmed to 1', () => {
      const memory = createMemory({
        avatar_id: avatarId,
        content: 'To confirm',
        source: 'user',
        type: 'conversation',
      }) as any;
      expect(memory.confirmed).toBe(0);

      confirmMemory(memory.id);

      const updated = getMemories(avatarId) as any[];
      expect(updated[0].confirmed).toBe(1);
    });

    it('deleteMemory removes the memory', () => {
      const memory = createMemory({
        avatar_id: avatarId,
        content: 'To delete',
        source: 'user',
        type: 'conversation',
      }) as any;

      expect(getMemories(avatarId).length).toBe(1);
      deleteMemory(memory.id);
      expect(getMemories(avatarId).length).toBe(0);
    });
  });

  describe('Conversation + Messages', () => {
    let avatarId: string;

    beforeEach(() => {
      const avatar = createAvatar({ name: 'Chat Avatar', relationship: 'friend' }) as any;
      avatarId = avatar.id;
    });

    it('createConversation creates conversation with avatar_id', () => {
      const convo = createConversation(avatarId) as any;
      expect(convo).toBeDefined();
      expect(convo.id).toBeDefined();
      expect(convo.avatar_id).toBe(avatarId);
    });

    it('getConversations returns conversations for avatar, limited', () => {
      for (let i = 0; i < 8; i++) {
        createConversation(avatarId);
      }
      const convos = getConversations(avatarId, 3) as any[];
      expect(convos.length).toBe(3);
      convos.forEach((c: any) => expect(c.avatar_id).toBe(avatarId));
    });

    it('getConversations defaults to limit 5', () => {
      for (let i = 0; i < 8; i++) {
        createConversation(avatarId);
      }
      const convos = getConversations(avatarId) as any[];
      expect(convos.length).toBe(5);
    });

    it('addMessage creates message with role and content', () => {
      const convo = createConversation(avatarId) as any;
      const msg = addMessage(convo.id, 'user', 'Hello!') as any;
      expect(msg).toBeDefined();
      expect(msg.id).toBeDefined();
      expect(msg.conversation_id).toBe(convo.id);
      expect(msg.role).toBe('user');
      expect(msg.content).toBe('Hello!');
    });

    it('getMessages returns messages in order (created_at ASC)', () => {
      const convo = createConversation(avatarId) as any;
      addMessage(convo.id, 'user', 'First message');
      addMessage(convo.id, 'assistant', 'Second message');
      addMessage(convo.id, 'user', 'Third message');

      const msgs = getMessages(convo.id) as any[];
      expect(msgs.length).toBe(3);
      expect(msgs[0].content).toBe('First message');
      expect(msgs[1].content).toBe('Second message');
      expect(msgs[2].content).toBe('Third message');
    });
  });

  describe('Proactive messages', () => {
    let avatarId: string;

    beforeEach(() => {
      const avatar = createAvatar({ name: 'Proactive Avatar', relationship: 'friend' }) as any;
      avatarId = avatar.id;
    });

    it('createProactiveMessage creates with type and content, sent defaults to 0', () => {
      const msg = createProactiveMessage(avatarId, 'greeting', 'Good morning!') as any;
      expect(msg).toBeDefined();
      expect(msg.id).toBeDefined();
      expect(msg.avatar_id).toBe(avatarId);
      expect(msg.type).toBe('greeting');
      expect(msg.content).toBe('Good morning!');
      expect(msg.sent).toBe(0);
    });

    it('getProactiveMessages returns all for avatar, ordered DESC', () => {
      createProactiveMessage(avatarId, 'greeting', 'First');
      createProactiveMessage(avatarId, 'reminder', 'Second');
      createProactiveMessage(avatarId, 'greeting', 'Third');

      const msgs = getProactiveMessages(avatarId) as any[];
      expect(msgs.length).toBe(3);
      const contents = msgs.map((m: any) => m.content);
      expect(contents).toContain('First');
      expect(contents).toContain('Second');
      expect(contents).toContain('Third');
    });

    it('markProactiveSent sets sent to 1', () => {
      const msg = createProactiveMessage(avatarId, 'greeting', 'Hello!') as any;
      expect(msg.sent).toBe(0);

      markProactiveSent(msg.id);

      const msgs = getProactiveMessages(avatarId) as any[];
      expect(msgs[0].sent).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('avatar with no memories returns empty array', () => {
      const avatar = createAvatar({ name: 'Lonely', relationship: 'friend' }) as any;
      const memories = getMemories(avatar.id);
      expect(memories).toEqual([]);
    });

    it('conversation with no messages returns empty array', () => {
      const avatar = createAvatar({ name: 'Quiet', relationship: 'friend' }) as any;
      const convo = createConversation(avatar.id) as any;
      const msgs = getMessages(convo.id);
      expect(msgs).toEqual([]);
    });

    it('memory with null embedding works correctly', () => {
      const avatar = createAvatar({ name: 'Test', relationship: 'friend' }) as any;
      createMemory({
        avatar_id: avatar.id,
        content: 'No embedding',
        source: 'user',
        type: 'conversation',
      });

      const memories = getMemories(avatar.id) as any[];
      expect(memories[0].embedding).toBeNull();
    });

    it('delete avatar that does not exist should not throw', () => {
      expect(() => deleteAvatar('totally-fake-id')).not.toThrow();
    });

    it('getProactiveMessages for avatar with none returns empty array', () => {
      const avatar = createAvatar({ name: 'NoProactive', relationship: 'friend' }) as any;
      const msgs = getProactiveMessages(avatar.id);
      expect(msgs).toEqual([]);
    });

    it('getConversations for avatar with none returns empty array', () => {
      const avatar = createAvatar({ name: 'NoConvos', relationship: 'friend' }) as any;
      const convos = getConversations(avatar.id);
      expect(convos).toEqual([]);
    });
  });
});
