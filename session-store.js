const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function isLoopbackAddress(address = '') {
  const normalized = String(address).toLowerCase();
  return normalized === '127.0.0.1'
    || normalized === '::1'
    || normalized === '::ffff:127.0.0.1';
}

class SessionStore {
  constructor(file, options = {}) {
    this.file = file;
    this.ttlMs = Number(options.ttlMs || DEFAULT_TTL_MS);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) this.write({ sessions: [] });
  }

  read() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return { sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [] };
    } catch (error) {
      console.error(`会话文件读取失败：${error.message}`);
      return { sessions: [] };
    }
  }

  write(data) {
    const temporary = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(data, null, 2));
    fs.renameSync(temporary, this.file);
  }

  active() {
    const now = Date.now();
    return this.read().sessions.filter(item => Number(item.expiresAt) > now);
  }

  create(userId) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const sessions = this.active();
    sessions.push({ tokenHash: hashToken(rawToken), userId, expiresAt: Date.now() + this.ttlMs });
    this.write({ sessions });
    return rawToken;
  }

  get(rawToken) {
    if (!rawToken) return null;
    const tokenHash = hashToken(rawToken);
    const sessions = this.active();
    const found = sessions.find(item => item.tokenHash === tokenHash) || null;
    this.write({ sessions });
    return found;
  }

  delete(rawToken) {
    const tokenHash = hashToken(rawToken);
    this.write({ sessions: this.active().filter(item => item.tokenHash !== tokenHash) });
  }

  revokeUser(userId) {
    this.write({ sessions: this.active().filter(item => item.userId !== userId) });
  }
}

module.exports = { DEFAULT_TTL_MS, SessionStore, hashToken, isLoopbackAddress };
