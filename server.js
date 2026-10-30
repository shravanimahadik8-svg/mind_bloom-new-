const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const { users, moods, journals, emergencyContacts, chats } = require('./database');
const { generateToken, authenticateRequest } = require('./auth');
const { generateSupportiveResponse } = require('./ai_friend');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types helper
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

// Request body parser helper
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) {
        req.socket.destroy();
        reject(new Error('Request entity too large'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// JSON response helper
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

// Static file server helper
function serveStatic(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Server Error');
      }
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  });
}

// Main HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  // API Routes
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Auth routes (Public)
      if (pathname === '/api/auth/signup' && method === 'POST') {
        const body = await parseBody(req);
        const { name, email, password } = body;

        if (!name || !email || !password) {
          return sendJson(res, 400, { error: 'Name, email, and password are required' });
        }
        if (password.length < 6) {
          return sendJson(res, 400, { error: 'Password must be at least 6 characters' });
        }

        const existing = users.findByEmail(email);
        if (existing) {
          return sendJson(res, 409, { error: 'An account with this email already exists' });
        }

        const newUser = users.create(name.trim(), email.trim().toLowerCase(), password);
        
        // Seed default emergency contacts for new user
        emergencyContacts.create(newUser.userId, 'Emergency Services', '911', 'Emergency');
        emergencyContacts.create(newUser.userId, 'Campus Helpline / Tele-MANAS', '14416', 'Support');

        const token = generateToken(newUser);
        return sendJson(res, 201, {
          token,
          user: {
            userId: newUser.userId,
            name: newUser.name,
            email: newUser.email,
            createdAt: newUser.createdAt
          }
        });
      }

      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseBody(req);
        const { email, password } = body;

        if (!email || !password) {
          return sendJson(res, 400, { error: 'Email and password are required' });
        }

        const authenticated = users.verify(email.trim().toLowerCase(), password);
        if (!authenticated) {
          return sendJson(res, 401, { error: 'Invalid email or password' });
        }

        const token = generateToken(authenticated);
        return sendJson(res, 200, {
          token,
          user: {
            userId: authenticated.userId,
            name: authenticated.name,
            email: authenticated.email,
            createdAt: authenticated.createdAt
          }
        });
      }

      // Protected routes - require authentication
      const user = authenticateRequest(req);
      if (!user) {
        return sendJson(res, 401, { error: 'Unauthorized. Please login.' });
      }

      // User Profile
      if (pathname === '/api/auth/me' && method === 'GET') {
        const userProfile = users.findById(user.userId);
        if (!userProfile) {
          return sendJson(res, 404, { error: 'User not found' });
        }
        const moodCount = moods.getCount(user.userId);
        const journalCount = journals.getCount(user.userId);
        return sendJson(res, 200, {
          user: userProfile,
          stats: {
            totalMoods: moodCount,
            totalJournals: journalCount
          }
        });
      }

      // Mood Routes
      if (pathname === '/api/moods' && method === 'POST') {
        const body = await parseBody(req);
        const { moodScore, mood, note } = body;

        if (!moodScore || !mood) {
          return sendJson(res, 400, { error: 'Mood score (1-5) and mood name are required' });
        }

        const now = new Date();
        const dateStr = body.date || now.toISOString().split('T')[0];
        const timeStr = body.time || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const newMood = moods.create(
          user.userId,
          moodScore,
          mood,
          note || '',
          dateStr,
          timeStr
        );
        return sendJson(res, 201, newMood);
      }

      if (pathname === '/api/moods/recent' && method === 'GET') {
        const limit = parseInt(parsedUrl.query.limit) || 10;
        const recent = moods.getRecent(user.userId, limit);
        return sendJson(res, 200, recent);
      }

      if (pathname === '/api/moods/week' && method === 'GET') {
        const week = moods.getLast7Days(user.userId);
        return sendJson(res, 200, week);
      }

      if (pathname === '/api/moods/today' && method === 'GET') {
        const todayDate = parsedUrl.query.date || new Date().toISOString().split('T')[0];
        const todayMood = moods.getToday(user.userId, todayDate);
        return sendJson(res, 200, todayMood || null);
      }

      // Journal Routes
      if (pathname === '/api/journals' && method === 'GET') {
        const allJournals = journals.getAll(user.userId);
        return sendJson(res, 200, allJournals);
      }

      if (pathname === '/api/journals' && method === 'POST') {
        const body = await parseBody(req);
        const { title, text } = body;

        if (!text || !text.trim()) {
          return sendJson(res, 400, { error: 'Journal content is required' });
        }

        const now = new Date();
        const dateStr = body.date || now.toISOString().split('T')[0];
        const timeStr = body.time || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const created = journals.create(
          user.userId,
          title ? title.trim() : 'Daily Reflection',
          text.trim(),
          dateStr,
          timeStr
        );
        return sendJson(res, 201, created);
      }

      if (pathname.startsWith('/api/journals/') && method === 'DELETE') {
        const journalId = parseInt(pathname.split('/')[3]);
        if (!journalId) {
          return sendJson(res, 400, { error: 'Invalid journal ID' });
        }
        const deleted = journals.delete(journalId, user.userId);
        return sendJson(res, 200, { success: deleted });
      }

      // Emergency Contacts Routes
      if (pathname === '/api/emergency-contacts' && method === 'GET') {
        const contacts = emergencyContacts.getAll(user.userId);
        return sendJson(res, 200, contacts);
      }

      if (pathname === '/api/emergency-contacts' && method === 'POST') {
        const body = await parseBody(req);
        const { name, phone, relationship } = body;

        if (!name || !phone) {
          return sendJson(res, 400, { error: 'Contact name and phone number are required' });
        }

        const contact = emergencyContacts.create(
          user.userId,
          name.trim(),
          phone.trim(),
          relationship ? relationship.trim() : 'Contact'
        );
        return sendJson(res, 201, contact);
      }

      if (pathname.startsWith('/api/emergency-contacts/') && method === 'DELETE') {
        const contactId = parseInt(pathname.split('/')[3]);
        if (!contactId) {
          return sendJson(res, 400, { error: 'Invalid contact ID' });
        }
        const deleted = emergencyContacts.delete(contactId, user.userId);
        return sendJson(res, 200, { success: deleted });
      }

      // Chat Routes
      if (pathname === '/api/chat' && method === 'GET') {
        const history = chats.getAll(user.userId, 50);
        return sendJson(res, 200, history);
      }

      if (pathname === '/api/chat/stream' && method === 'POST') {
        const body = await parseBody(req);
        const { messages } = body;
        if (!messages || !Array.isArray(messages)) {
          return sendJson(res, 400, { error: 'Messages array is required' });
        }
        
        const openrouter = require('./openrouter');
        
        // Auto-log mood silently in background
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMessage) {
            openrouter.extractMood(lastUserMessage.content).then(moodData => {
                const now = new Date();
                const dateStr = now.toISOString().split('T')[0];
                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                moods.create(
                    user.userId,
                    moodData.moodScore || 3,
                    moodData.mood || 'Okay',
                    "AI inferred from chat",
                    dateStr,
                    timeStr
                );
            }).catch(() => {});
        }
        
        return openrouter.streamChat(messages, res);
      }

      if (pathname === '/api/analyze-session' && method === 'POST') {
        const body = await parseBody(req);
        const { messages } = body;
        if (!messages || !Array.isArray(messages)) {
          return sendJson(res, 400, { error: 'Messages array is required' });
        }

        try {
          const openrouter = require('./openrouter');
          const analysis = await openrouter.analyzeSession(messages);
          return sendJson(res, 200, analysis);
        } catch (e) {
          return sendJson(res, 500, { error: e.message });
        }
      }

      if (pathname === '/api/chat' && method === 'DELETE') {
        chats.clear(user.userId);
        return sendJson(res, 200, { success: true });
      }

      // Dashboard Consolidated Data
      if (pathname === '/api/dashboard' && method === 'GET') {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const todayMood = moods.getToday(user.userId, todayStr);
        const weekMoods = moods.getLast7Days(user.userId);
        const recentMoods = moods.getRecent(user.userId, 5);
        const journalCount = journals.getCount(user.userId);
        const contacts = emergencyContacts.getAll(user.userId);

        return sendJson(res, 200, {
          user: {
            userId: user.userId,
            name: user.name,
            email: user.email
          },
          todayMood,
          weekMoods,
          recentMoods,
          journalCount,
          emergencyContacts: contacts
        });
      }

      // Unmatched API route
      return sendJson(res, 404, { error: 'API endpoint not found' });
    } catch (apiErr) {
      console.error('API Error:', apiErr);
      return sendJson(res, 500, { error: 'Internal Server Error', details: apiErr.message });
    }
  }

  // Static files handling
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  // Prevent directory traversal
  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath);

  if (!fs.existsSync(filePath)) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  serveStatic(res, filePath);
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🌸 Mind Bloom MVP Server is running!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`👤 Demo Account: demo@mindbloom.com / bloom123`);
  console.log(`====================================================`);
});
