// NOTE: This is a developer test script. Set OPENROUTER_API_KEY in your environment before running.
const https = require('https');
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
if (!OPENROUTER_API_KEY) { console.error('ERROR: OPENROUTER_API_KEY environment variable is not set.'); process.exit(1); }

const payload = {
    model: 'liquid/lfm-2.5-2.6b:free',
    messages: [
      { role: 'user', content: 'Say hello' }
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 350
  };

const body = JSON.stringify(payload);
const options = {
    hostname: 'openrouter.ai',
    path: '/api/v1/chat/completions',
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mindbloom.app',
        'X-Title': 'Mind Bloom',
        'Content-Length': Buffer.byteLength(body)
    }
};

const req = https.request(options, (res) => {
    console.log('Status:', res.statusCode);
    res.on('data', d => process.stdout.write(d));
});
req.write(body);
req.end();
