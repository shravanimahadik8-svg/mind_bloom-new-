const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const DB_PATH = path.join(__dirname, 'mind_bloom.db');
const db = new DatabaseSync(DB_PATH);

// Initialize Tables
function initDatabase() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      userId INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password TEXT NOT NULL,
      salt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS moods (
      moodId INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      moodScore INTEGER NOT NULL CHECK (moodScore BETWEEN 1 AND 5),
      mood TEXT NOT NULL,
      note TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS journals (
      journalId INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      title TEXT,
      text TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS emergency_contacts (
      contactId INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      relationship TEXT,
      FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chats (
      chatId INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      message TEXT NOT NULL,
      response TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
    );
  `);

  seedDemoData();
}

function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, storedHash, salt) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

function seedDemoData() {
  // Check if demo user already exists
  const checkUser = db.prepare('SELECT userId FROM users WHERE email = ?');
  const demoEmail = 'demo@mindbloom.com';
  const existing = checkUser.get(demoEmail);

  if (!existing) {
    console.log('🌱 Seeding initial demo student account (demo@mindbloom.com / bloom123)...');
    const { hash, salt } = hashPassword('bloom123');
    const now = new Date();
    const createdStr = now.toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password, salt, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    const userResult = insertUser.run('Alex Rivera', demoEmail, hash, salt, createdStr);
    const userId = Number(userResult.lastInsertRowid);

    // Seed Emergency Contacts for Alex
    const insertContact = db.prepare(`
      INSERT INTO emergency_contacts (userId, name, phone, relationship)
      VALUES (?, ?, ?, ?)
    `);
    insertContact.run(userId, 'Mom', '+1-555-0199', 'Family');
    insertContact.run(userId, 'Sam (Roommate)', '+1-555-0182', 'Friend');
    insertContact.run(userId, 'Campus Support Helpline', '988', 'Support');
    insertContact.run(userId, 'Emergency Services', '911', 'Emergency');

    // Seed 7-Day Mood History
    const insertMood = db.prepare(`
      INSERT INTO moods (userId, moodScore, mood, note, date, time)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const pastDays = [
      { daysAgo: 6, score: 3, mood: 'Okay', note: 'Normal Monday. Labs were long but manageable.', time: '08:30 PM' },
      { daysAgo: 5, score: 2, mood: 'Sad', note: 'Feeling low after math assignment results.', time: '09:15 PM' },
      { daysAgo: 4, score: 1, mood: 'Anxious', note: 'Feeling stressed about college midterms coming up.', time: '11:45 PM' },
      { daysAgo: 3, score: 3, mood: 'Okay', note: 'Studied at library with Sam. Feeling a bit calmer.', time: '07:20 PM' },
      { daysAgo: 2, score: 4, mood: 'Happy', note: 'Project presentation went super well! Group praised my work.', time: '06:10 PM' },
      { daysAgo: 1, score: 5, mood: 'Happy', note: 'Friday night chill with friends, good movie and pizza.', time: '10:00 PM' },
      { daysAgo: 0, score: 4, mood: 'Happy', note: 'Productive Sunday. Ready for the new week with a calm mind.', time: '09:00 AM' }
    ];

    for (const item of pastDays) {
      const d = new Date(Date.now() - item.daysAgo * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      insertMood.run(userId, item.score, item.mood, item.note, dateStr, item.time);
    }

    // Seed Sample Journals
    const insertJournal = db.prepare(`
      INSERT INTO journals (userId, title, text, date, time, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const d1 = new Date(Date.now() - 4 * 86400000);
    insertJournal.run(
      userId,
      'Handling College Overwhelm',
      'Today I was feeling overwhelmed by all the deadlines piling up. I took 10 minutes to write things down and broke the tasks into smaller chunks. Reminding myself that I only have to take it one step at a time.',
      d1.toISOString().split('T')[0],
      '10:30 PM',
      d1.toISOString()
    );

    const d2 = new Date(Date.now() - 2 * 86400000);
    insertJournal.run(
      userId,
      'Presentation Victory & Gratitude',
      'Our team delivered our software engineering presentation today. The professor asked three questions and we answered all with confidence. So grateful for supportive team members who showed up!',
      d2.toISOString().split('T')[0],
      '07:45 PM',
      d2.toISOString()
    );

    const d3 = new Date();
    insertJournal.run(
      userId,
      'Fresh Week, Clear Mind',
      'Starting today with gratitude. Went for a quick 20-minute morning walk and drank fresh water. Mood is grounded and looking forward to building Mind Bloom.',
      d3.toISOString().split('T')[0],
      '09:15 AM',
      d3.toISOString()
    );

    // Seed Sample Chat with AI Friend
    const insertChat = db.prepare(`
      INSERT INTO chats (userId, message, response, date, time)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertChat.run(
      userId,
      "I'm feeling really stressed today with my college exams.",
      "I hear you, Alex. College exams can feel really heavy, but please remember your worth is not defined by a single exam. Let's take a deep breath together. Would you like to break down what's on your plate, or would you prefer a quick calming exercise right now?",
      d1.toISOString().split('T')[0],
      '11:46 PM'
    );

    console.log('✅ Demo data seeded successfully.');
  }
}

// User helper methods
const users = {
  create: (name, email, password) => {
    const { hash, salt } = hashPassword(password);
    const createdAt = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password, salt, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name, email, hash, salt, createdAt);
    return {
      userId: Number(info.lastInsertRowid),
      name,
      email,
      createdAt
    };
  },

  findByEmail: (email) => {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  },

  findById: (userId) => {
    const stmt = db.prepare('SELECT userId, name, email, createdAt FROM users WHERE userId = ?');
    return stmt.get(userId);
  },

  verify: (email, password) => {
    const user = users.findByEmail(email);
    if (!user) return null;
    const isValid = verifyPassword(password, user.password, user.salt);
    if (!isValid) return null;
    return {
      userId: user.userId,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    };
  }
};

// Mood helper methods
const moods = {
  create: (userId, moodScore, mood, note, date, time) => {
    const stmt = db.prepare(`
      INSERT INTO moods (userId, moodScore, mood, note, date, time)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(userId, Number(moodScore), mood, note || '', date, time);
    return {
      moodId: Number(info.lastInsertRowid),
      userId,
      moodScore: Number(moodScore),
      mood,
      note,
      date,
      time
    };
  },

  getRecent: (userId, limit = 10) => {
    const stmt = db.prepare(`
      SELECT * FROM moods 
      WHERE userId = ? 
      ORDER BY date DESC, moodId DESC 
      LIMIT ?
    `);
    return stmt.all(userId, limit);
  },

  getLast7Days: (userId) => {
    const stmt = db.prepare(`
      SELECT * FROM moods 
      WHERE userId = ? 
      ORDER BY date ASC, moodId ASC
    `);
    const all = stmt.all(userId);
    // Take up to last 14 and group/slice to 7 most recent distinct days or entries
    return all.slice(-7);
  },

  getToday: (userId, dateStr) => {
    const stmt = db.prepare(`
      SELECT * FROM moods 
      WHERE userId = ? AND date = ? 
      ORDER BY moodId DESC 
      LIMIT 1
    `);
    return stmt.get(userId, dateStr);
  },

  getCount: (userId) => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM moods WHERE userId = ?');
    const row = stmt.get(userId);
    return row ? row.count : 0;
  }
};

// Journal helper methods
const journals = {
  create: (userId, title, text, date, time) => {
    const createdAt = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO journals (userId, title, text, date, time, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(userId, title || 'Journal Entry', text, date, time, createdAt);
    return {
      journalId: Number(info.lastInsertRowid),
      userId,
      title: title || 'Journal Entry',
      text,
      date,
      time,
      createdAt
    };
  },

  getAll: (userId) => {
    const stmt = db.prepare(`
      SELECT * FROM journals 
      WHERE userId = ? 
      ORDER BY journalId DESC
    `);
    return stmt.all(userId);
  },

  getById: (journalId, userId) => {
    const stmt = db.prepare('SELECT * FROM journals WHERE journalId = ? AND userId = ?');
    return stmt.get(journalId, userId);
  },

  delete: (journalId, userId) => {
    const stmt = db.prepare('DELETE FROM journals WHERE journalId = ? AND userId = ?');
    const result = stmt.run(journalId, userId);
    return result.changes > 0;
  },

  getCount: (userId) => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM journals WHERE userId = ?');
    const row = stmt.get(userId);
    return row ? row.count : 0;
  }
};

// Emergency Contacts helper methods
const emergencyContacts = {
  getAll: (userId) => {
    const stmt = db.prepare(`
      SELECT * FROM emergency_contacts 
      WHERE userId = ? 
      ORDER BY contactId ASC
    `);
    return stmt.all(userId);
  },

  create: (userId, name, phone, relationship) => {
    const stmt = db.prepare(`
      INSERT INTO emergency_contacts (userId, name, phone, relationship)
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(userId, name, phone, relationship || 'Contact');
    return {
      contactId: Number(info.lastInsertRowid),
      userId,
      name,
      phone,
      relationship: relationship || 'Contact'
    };
  },

  delete: (contactId, userId) => {
    const stmt = db.prepare('DELETE FROM emergency_contacts WHERE contactId = ? AND userId = ?');
    const result = stmt.run(contactId, userId);
    return result.changes > 0;
  }
};

// Chats helper methods
const chats = {
  create: (userId, message, response, date, time) => {
    const stmt = db.prepare(`
      INSERT INTO chats (userId, message, response, date, time)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(userId, message, response, date, time);
    return {
      chatId: Number(info.lastInsertRowid),
      userId,
      message,
      response,
      date,
      time
    };
  },

  getAll: (userId, limit = 50) => {
    const stmt = db.prepare(`
      SELECT * FROM chats 
      WHERE userId = ? 
      ORDER BY chatId ASC 
      LIMIT ?
    `);
    return stmt.all(userId, limit);
  },

  clear: (userId) => {
    const stmt = db.prepare('DELETE FROM chats WHERE userId = ?');
    stmt.run(userId);
    return true;
  }
};

// Initialize DB on module load
initDatabase();

module.exports = {
  db,
  users,
  moods,
  journals,
  emergencyContacts,
  chats
};
