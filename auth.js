const crypto = require('node:crypto');
// database require removed to prevent node:sqlite instantiation in serverless environments

// JWT secret must be configured via environment variable — no hardcoded fallback.
function getJwtSecret() {
  const secret = process.env.MOOD_BLOOM_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error('MOOD_BLOOM_SECRET is not configured. Authentication is unavailable.');
  }
  return secret;
}

function generateToken(user) {
  const secret = getJwtSecret();
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.userId,
      email: user.email,
      name: user.name,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days validity
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const secret = getJwtSecret();
  const [header, payload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  // timingSafeEqual requires equal-length buffers; unequal lengths mean invalid token
  if (sigBuf.length !== expBuf.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && Date.now() > data.exp) {
      return null; // Expired
    }
    return data;
  } catch (err) {
    return null;
  }
}

function authenticateRequest(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : parts[0];
  return verifyToken(token);
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateRequest
};
