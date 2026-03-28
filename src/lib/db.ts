import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';

const DB_PATH = path.join(os.homedir(), '.memorial-ai', 'memorial-ai.db');

function generateId(): string {
  return crypto.randomUUID();
}

let _db: Database.Database | null = null;
let _dbPath: string = DB_PATH;

export function getDb(): Database.Database {
  if (!_db) {
    const dir = path.dirname(_dbPath);
    if (dir !== ':memory:' && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    _db = new Database(_dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

export function __setTestDb(dbPath = ':memory:'): Database.Database {
  if (_db) _db.close();
  _dbPath = dbPath;
  _db = new Database(dbPath);
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

export function __closeDb() {
  if (_db) { _db.close(); _db = null; _dbPath = DB_PATH; }
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS avatars (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      photo_url TEXT,
      voice_id TEXT,
      character_card TEXT,
      creation_step INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      avatar_id TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'auto_extract',
      type TEXT NOT NULL DEFAULT 'conversation',
      importance REAL DEFAULT 0.5,
      confirmed INTEGER DEFAULT 0,
      embedding TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      avatar_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS proactive_messages (
      id TEXT PRIMARY KEY,
      avatar_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      sent INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const avatarIndex = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_memories_avatar'");
  if (!avatarIndex.get()) {
    db.exec('CREATE INDEX idx_memories_avatar ON memories(avatar_id)');
    db.exec('CREATE INDEX idx_conversations_avatar ON conversations(avatar_id)');
    db.exec('CREATE INDEX idx_messages_conversation ON messages(conversation_id)');
  }
}

export function getAvatars() {
  const db = getDb();
  return db.prepare('SELECT * FROM avatars ORDER BY updated_at DESC').all();
}

export function getAvatarById(id: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM avatars WHERE id = ?').get(id);
}

export function createAvatar(data: { name: string; relationship: string; photo_url?: string; character_card?: any }) {
  const db = getDb();
  const id = generateId();
  db.prepare(
    'INSERT INTO avatars (id, name, relationship, photo_url, character_card) VALUES (?, ?, ?, ?, ?)'
  ).run(id, data.name, data.relationship, data.photo_url || null, data.character_card ? JSON.stringify(data.character_card) : null);
  return db.prepare('SELECT * FROM avatars WHERE id = ?').get(id);
}

export function updateAvatar(id: string, updates: Record<string, unknown>) {
  const db = getDb();
  const sets = Object.keys(updates).map(k => `${k} = ?`);
  const values = Object.values(updates);
  if (updates.character_card && typeof updates.character_card === 'object') {
    const idx = Object.keys(updates).indexOf('character_card');
    values[idx] = JSON.stringify(updates.character_card);
  }
  db.prepare(`UPDATE avatars SET ${sets.join(', ')} WHERE id = ?`).run(...values, id);
  return db.prepare('SELECT * FROM avatars WHERE id = ?').get(id);
}

export function deleteAvatar(id: string) {
  const db = getDb();
  db.prepare('DELETE FROM memories WHERE avatar_id = ?').run(id);
  db.prepare('DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE avatar_id = ?)').run(id);
  db.prepare('DELETE FROM conversations WHERE avatar_id = ?').run(id);
  db.prepare('DELETE FROM proactive_messages WHERE avatar_id = ?').run(id);
  db.prepare('DELETE FROM avatars WHERE id = ?').run(id);
}

// Memory operations
export function getMemories(avatarId: string, options?: { confirmed?: boolean; type?: string; limit?: number }) {
  const db = getDb();
  let sql = 'SELECT * FROM memories WHERE avatar_id = ?';
  const params: unknown[] = [avatarId];
  if (options?.confirmed !== undefined) { sql += ' AND confirmed = ?'; params.push(options.confirmed ? 1 : 0); }
  if (options?.type) { sql += ' AND type = ?'; params.push(options.type); }
  sql += ' ORDER BY created_at DESC';
  if (options?.limit) { sql += ' LIMIT ?'; params.push(options.limit); }
  const rows = db.prepare(sql).all(...params) as any[];
  return rows.map(r => ({ ...r, embedding: r.embedding ? JSON.parse(r.embedding) : null }));
}

export function createMemory(data: { avatar_id: string; content: string; source: string; type: string; importance?: number; embedding?: number[] }) {
  const db = getDb();
  const id = generateId();
  db.prepare(
    'INSERT INTO memories (id, avatar_id, content, source, type, importance, embedding) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, data.avatar_id, data.content, data.source, data.type, data.importance ?? 0.5, data.embedding ? JSON.stringify(data.embedding) : null);
  return db.prepare('SELECT * FROM memories WHERE id = ?').get(id);
}

export function confirmMemory(id: string) {
  const db = getDb();
  db.prepare('UPDATE memories SET confirmed = 1 WHERE id = ?').run(id);
}

export function deleteMemory(id: string) {
  const db = getDb();
  db.prepare('DELETE FROM memories WHERE id = ?').run(id);
}

// Conversation operations
export function createConversation(avatarId: string) {
  const db = getDb();
  const id = generateId();
  db.prepare('INSERT INTO conversations (id, avatar_id) VALUES (?, ?)').run(id, avatarId);
  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
}

export function getConversations(avatarId: string, limit = 5) {
  const db = getDb();
  return db.prepare('SELECT * FROM conversations WHERE avatar_id = ? ORDER BY created_at DESC LIMIT ?').all(avatarId, limit);
}

export function getMessages(conversationId: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at').all(conversationId);
}

export function addMessage(conversationId: string, role: string, content: string) {
  const db = getDb();
  const id = generateId();
  db.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').run(id, conversationId, role, content);
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
}

// Proactive messages
export function getProactiveMessages(avatarId: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM proactive_messages WHERE avatar_id = ? ORDER BY created_at DESC').all(avatarId);
}

export function createProactiveMessage(avatarId: string, type: string, content: string) {
  const db = getDb();
  const id = generateId();
  db.prepare('INSERT INTO proactive_messages (id, avatar_id, type, content) VALUES (?, ?, ?, ?)').run(id, avatarId, type, content);
  return db.prepare('SELECT * FROM proactive_messages WHERE id = ?').get(id);
}

export function markProactiveSent(id: string) {
  const db = getDb();
  db.prepare('UPDATE proactive_messages SET sent = 1 WHERE id = ?').run(id);
}

// File storage (local filesystem)
const FILES_DIR = path.join(path.dirname(DB_PATH), 'files');

export function storeFile(subdir: string, filename: string, data: Buffer): string {
  const dir = path.join(FILES_DIR, subdir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const fullPath = path.join(dir, filename);
  fs.writeFileSync(fullPath, data);
  return fullPath;
}

export function getFile(subdir: string, filename: string): Buffer | null {
  const fullPath = path.join(FILES_DIR, subdir, filename);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath);
}
