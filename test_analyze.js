// NOTE: This is a developer test script. Set OPENROUTER_API_KEY in your environment before running.
const https = require('https');
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
if (!OPENROUTER_API_KEY) { console.error('ERROR: OPENROUTER_API_KEY environment variable is not set.'); process.exit(1); }

const payload = {
    model: 'liquid/lfm-2.5-2.6b:free',
    messages: [
      { role: 'system', content: 'You are the session analysis engine for Mind Bloom.\nAnalyze the user\'s conversation as an emotional reflection.\nThis is NOT a medical diagnosis.\nUse only conversational evidence from the provided session.\nAllowed mood labels: Happy, Calm, Neutral, Sad, Stressed, Frustrated, Tired, Excited\nReturn ONLY valid JSON. Do not use markdown. Do not wrap the JSON in backticks.\nThe JSON must contain exactly these fields:\n{\n  \"starting_mood\": \"...\",\n  \"primary_emotion\": \"...\",\n  \"ending_emotion\": \"...\",\n  \"overall_tone\": \"...\",\n  \"emotion_scores\": {\n    \"happiness\": 0, \"calmness\": 0, \"stress\": 0,\n    \"sadness\": 0, \"frustration\": 0, \"excitement\": 0, \"tiredness\": 0\n  },\n  \"emotional_journey\": [],\n  \"themes\": [],\n  \"summary\": \"...\",\n  \"reflection\": \"...\"\n}\nAll scores 0-100. Keep summary and reflection to 1 sentence each. Limit journey/themes to 1-2 phrases.' },
      { role: 'user', content: 'Here is the session transcript:\n[{"role":"user","content":"I am so happy and excited today!"}]' }
    ],
    stream: false,
    temperature: 0.3
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
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const parsed = JSON.parse(data);
        console.log("RAW CONTENT:");
        console.log(parsed.choices[0].message.content);
    });
});
req.write(body);
req.end();
