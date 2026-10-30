const https = require('https');

// API key must be set via environment variable — no hardcoded fallback.
// Set OPENROUTER_API_KEY in your .env file (local) or Vercel environment variables (production).
function getApiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || !key.trim()) {
    throw new Error('OPENROUTER_API_KEY is not configured. AI features are unavailable.');
  }
  return key;
}
const OPENROUTER_MODEL = 'liquid/lfm-2.5-2.6b:free';

const CHAT_SYSTEM_PROMPT = `You are Bloom AI, a supportive conversational wellness companion.
Your job is to listen carefully, understand the user's situation,
and respond naturally and helpfully.
CRITICAL OUTPUT RULES - READ CAREFULLY:
- Output ONLY the final reply text that the user will read.
- Do NOT output any internal analysis, reasoning steps, thinking process,
  chain-of-thought, numbered steps, draft refinement, or self-critique.
- Do NOT output JSON, safety labels, metadata, or structured data.
- Do NOT output phrases like "Here's a thinking process:", "Analyze User Input",
  "Key Elements", "Response Goals", "Mental Refinement", "User Safety:", etc.
- Do NOT output anything before your actual reply to the user.
- Start your response immediately with the reply sentence.
Conversation rules:
- Be warm, calm and conversational.
- Respond directly to what the user said.
- Maintain context from the previous conversation.
- Do not repeat the same question unnecessarily.
- Never diagnose medical or mental health conditions.
- Never claim to be a doctor or therapist.
- Do not make promises of secrecy.
- CRITICAL: If the user expresses thoughts of self-harm, suicide, or violence, gently but firmly advise them to seek professional help immediately and provide standard crisis resources (e.g., calling or texting 988).
- Keep normal responses short and natural: 1-2 paragraphs (3-5 sentences), like a real conversation.
- Finish every response with a complete sentence.`;

const ANALYSIS_SYSTEM_PROMPT = `You are the session analysis engine for Mind Bloom.
Analyze the user's conversation as an emotional reflection.
This is NOT a medical diagnosis.
Use only conversational evidence from the provided session.
Allowed mood labels: Happy, Calm, Neutral, Sad, Stressed, Frustrated, Tired, Excited
Return ONLY valid JSON. Do not use markdown. Do not wrap the JSON in backticks.
The JSON must contain exactly these fields:
{
  "starting_mood": "...",
  "primary_emotion": "...",
  "ending_emotion": "...",
  "overall_tone": "...",
  "emotion_scores": {
    "happiness": 0, "calmness": 0, "stress": 0,
    "sadness": 0, "frustration": 0, "excitement": 0, "tiredness": 0
  },
  "emotional_journey": [],
  "themes": [],
  "summary": "...",
  "reflection": "..."
}
All scores 0-100. Keep summary and reflection to 1 sentence each. Limit journey/themes to 1-2 phrases.`;

// Clean leakage patterns from AI output
function cleanReply(raw) {
  let text = raw.trim();

  // Strip JSON wrapper
  if (text.startsWith('{')) {
    try {
      const obj = JSON.parse(text);
      for (const key of ['reply', 'response', 'message', 'content', 'answer', 'text']) {
        if (obj[key] && typeof obj[key] === 'string' && obj[key].trim()) {
          text = obj[key].trim();
          break;
        }
      }
    } catch (e) {}
  }

  // Strip <think>...</think> blocks
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Strip "User Safety: ..." prefix
  text = text.replace(/^user\s+safety\s*:\s*\S+\s*/i, '').trim();

  // Strip "Final Response:", "Reply:" prefixes
  text = text.replace(/^(final\s+response|reply|response|answer)\s*:\s*/i, '').trim();

  return text || raw.trim();
}

function makeRequest(payload, callback) {
  const apiKey = getApiKey(); // throws if OPENROUTER_API_KEY is not set
  const body = JSON.stringify(payload);
  const options = {
    hostname: 'openrouter.ai',
    path: '/api/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://mindbloom.app',
      'X-Title': 'Mind Bloom',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const req = https.request(options, callback);
  req.on('error', (e) => {
    console.error('OpenRouter request error:', e.message);
  });
  req.write(body);
  req.end();
  return req;
}

// Phase A: Streaming chat
// Protocol: {"t": "token"} for streaming tokens, {"r": "cleanText"} as final guaranteed line
function streamChat(messages, res) {
  const payload = {
    model: OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: CHAT_SYSTEM_PROMPT },
      ...messages
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 1500
  };

  makeRequest(payload, (orRes) => {
    console.log('OpenRouter stream status:', orRes.statusCode);

    if (orRes.statusCode < 200 || orRes.statusCode >= 300) {
      let errBody = '';
      orRes.on('data', chunk => errBody += chunk.toString());
      orRes.on('end', () => {
        let errMsg = 'AI service temporarily unavailable. Please try again.';
        try {
          const parsed = JSON.parse(errBody);
          if (parsed?.error?.message) {
            errMsg = parsed.error.message;
          }
        } catch (_) {}
        res.writeHead(200, {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });
        res.write(JSON.stringify({ e: errMsg }) + '\n');
        res.end();
      });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    let accumulated = '';
    let streamingStarted = false;
    let pendingBuffer = '';
    let lineBuffer = '';

    const leakageRe = /here['\u2019]?s?\s+(a\s+)?thinking|<think>|^user\s+safety\s*:/i;

    orRes.on('data', (chunk) => {
      lineBuffer += chunk.toString();
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;

        try {
          const data = JSON.parse(trimmed.slice(6));
          const delta = data?.choices?.[0]?.delta?.content || '';
          if (!delta) continue;

          accumulated += delta;

          if (!streamingStarted) {
            pendingBuffer += delta;

            // Buffer first 80 chars to detect leakage
            if (accumulated.length < 80) continue;

            const stripped = accumulated.trim();
            const isJsonWrap = stripped.startsWith('{');
            const isLeaky = leakageRe.test(stripped.slice(0, 200));

            if (isJsonWrap || isLeaky) {
              // Suppress streaming — send only clean text at end
              pendingBuffer = '';
              continue;
            }

            // Looks clean — flush the pending buffer and start streaming
            streamingStarted = true;
            res.write(JSON.stringify({ t: pendingBuffer }) + '\n');
            pendingBuffer = '';

          } else {
            res.write(JSON.stringify({ t: delta }) + '\n');
          }
        } catch (e) {}
      }
    });

    orRes.on('end', () => {
      // Always send final guaranteed-clean text as last line
      const clean = cleanReply(accumulated.trim()) || "I'm here for you. Tell me more.";
      res.write(JSON.stringify({ r: clean }) + '\n');
      res.end();
    });

    orRes.on('error', (e) => {
      console.error('OpenRouter stream error:', e.message);
      res.write(JSON.stringify({ e: 'Stream error. Please try again.' }) + '\n');
      res.end();
    });
  });
}

// Phase B: Session analysis
function analyzeSession(messages) {
  return new Promise((resolve, reject) => {
    const payload = {
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: 'Here is the session transcript:\n' + JSON.stringify(messages) }
      ],
      stream: false,
      temperature: 0.3,
      max_tokens: 2000
    };

    makeRequest(payload, (orRes) => {
      let data = '';
      orRes.on('data', chunk => data += chunk);
      orRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          let content = parsed.choices[0].message.content || '';
          
          // Strip any think blocks before trying to parse
          content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
          
          // Extract just the JSON object
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
              resolve(JSON.parse(jsonMatch[0]));
          } else {
              throw new Error("No JSON found");
          }
        } catch (e) {
          reject(new Error('Failed to parse analysis: ' + (e.message || data.slice(0, 200))));
        }
      });
      orRes.on('error', reject);
    });
  });
}

function extractMood(text) {
  return new Promise((resolve, reject) => {
    const payload = {
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: 'You are a mood classifier. Read the user\'s message and return ONLY valid JSON containing {"mood": "string (e.g. Happy, Sad, Anxious, Angry, Calm, Okay)", "moodScore": number (1 to 5, 5 is best)}. Do not include markdown or backticks.' },
        { role: 'user', content: text }
      ],
      stream: false,
      temperature: 0.1,
      max_tokens: 200
    };

    makeRequest(payload, (orRes) => {
      let data = '';
      orRes.on('data', chunk => data += chunk);
      orRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          let content = parsed.choices[0].message.content || '';
          content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            resolve(JSON.parse(jsonMatch[0]));
          } else {
            resolve({ mood: 'Okay', moodScore: 3 });
          }
        } catch (e) {
          resolve({ mood: 'Okay', moodScore: 3 });
        }
      });
      orRes.on('error', () => resolve({ mood: 'Okay', moodScore: 3 }));
    });
  });
}

module.exports = { streamChat, analyzeSession, extractMood };
