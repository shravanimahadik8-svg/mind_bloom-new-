/**
 * Mind Bloom — Frontend SPA Client Logic
 */

const API_BASE = '/api';

// State
let token = localStorage.getItem('mb_token') || null;
let currentUser = null;
try {
  currentUser = JSON.parse(localStorage.getItem('mb_user')) || null;
} catch (e) {
  currentUser = null;
}

let selectedMoodData = {
  mood: 'Okay',
  score: 3,
  emoji: '😐'
};

const PROMPT_LIST = [
  "What is one small thing that brought you a moment of comfort today?",
  "Write down three things currently within your control, and one thing you can gently release.",
  "If a close friend felt the way you do right now, what kind words would you offer them?",
  "What is one boundary you can set today to protect your peace?",
  "Describe a challenge you navigated in the past that proved your resilience.",
  "What does your mind or body need most in this exact moment?",
  "What is a small victory from this week you haven't celebrated yet?"
];
let currentPromptIndex = 0;

// Breathing Exercise Timer State
let breathingInterval = null;
let isBreathingActive = false;

// =========================================================
// Initialization
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  if (token && currentUser) {
    showAppUI();
    navigateTo('dashboard');
  } else {
    showAuthUI();
  }
});

// =========================================================
// Auth Functions
// =========================================================

function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabSignupBtn = document.getElementById('tabSignupBtn');

  if (tab === 'login') {
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    tabLoginBtn.classList.add('active');
    tabSignupBtn.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    tabLoginBtn.classList.remove('active');
    tabSignupBtn.classList.add('active');
  }
}

function fillDemoAccount() {
  switchAuthTab('login');
  document.getElementById('loginEmail').value = 'demo@mindbloom.com';
  document.getElementById('loginPassword').value = 'bloom123';
  showToast('Filled demo account details! Click "Sign In"', 'success');
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const submitBtn = document.getElementById('loginSubmitBtn');

  submitBtn.disabled = true;
  submitBtn.innerText = 'Signing In...';

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to login');
    }

    token = data.token;
    currentUser = data.user;
    localStorage.setItem('mb_token', token);
    localStorage.setItem('mb_user', JSON.stringify(currentUser));

    showToast(`Welcome back, ${currentUser.name}! 🌸`, 'success');
    showAppUI();
    navigateTo('dashboard');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = 'Sign In to Mind Bloom';
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const submitBtn = document.getElementById('signupSubmitBtn');

  submitBtn.disabled = true;
  submitBtn.innerText = 'Creating Account...';

  try {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to create account');
    }

    token = data.token;
    currentUser = data.user;
    localStorage.setItem('mb_token', token);
    localStorage.setItem('mb_user', JSON.stringify(currentUser));

    showToast(`Welcome to Mind Bloom, ${currentUser.name}! 🌱`, 'success');
    showAppUI();
    navigateTo('dashboard');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = 'Create My Account';
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('mb_token');
  localStorage.removeItem('mb_user');
  closeProfileModal();
  showToast('Logged out safely. Take care!', 'success');
  showAuthUI();
}

function showAuthUI() {
  document.body.classList.remove('logged-in');
  document.getElementById('appNavbar').style.display = 'none';
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.getElementById('view-auth').classList.add('active');
}

function showAppUI() {
  document.body.classList.add('logged-in');
  document.getElementById('appNavbar').style.display = 'block';
  if (currentUser) {
    document.getElementById('navUserName').innerText = currentUser.name.split(' ')[0];
    document.getElementById('navAvatar').innerText = currentUser.name.charAt(0).toUpperCase();
  }
  initLayout();
}

// =========================================================
// View Navigation
// =========================================================

function navigateTo(viewName) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  const targetSection = document.getElementById(`view-${viewName}`);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  const activeNavItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (activeNavItem) {
    activeNavItem.classList.add('active');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Load view data
  if (viewName === 'dashboard') loadDashboardData();
  if (viewName === 'journal') loadJournals();
  if (viewName === 'chat') loadChatHistory();
  if (viewName === 'emergency') loadEmergencyContacts();
}

// =========================================================
// Dashboard Module
// =========================================================

async function loadDashboardData() {
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) { logout(); return; }
    const data = await res.json();

    // 1. Update Greeting
    const hour = new Date().getHours();
    let timeGreeting = 'Good Day';
    if (hour < 12) timeGreeting = 'Good Morning';
    else if (hour < 17) timeGreeting = 'Good Afternoon';
    else timeGreeting = 'Good Evening';

    const firstName = data.user.name.split(' ')[0];
    document.getElementById('dashGreeting').innerText = `${timeGreeting}, ${firstName} 🌿`;

    // 2. Today's Mood
    const todayCard = data.todayMood;
    const todayEmojiEl = document.getElementById('todayMoodEmoji');
    const todayTitleEl = document.getElementById('todayMoodTitle');
    const todayNoteEl = document.getElementById('todayMoodNote');
    const btnLogToday = document.getElementById('btnLogToday');
    const statTodayMoodEl = document.getElementById('statTodayMood');

    if (todayCard) {
      const emojiMap = { 'Happy': '😊', 'Good': '😌', 'Okay': '😐', 'Sad': '😔', 'Angry': '😡', 'Anxious': '😰' };
      const emo = emojiMap[todayCard.mood] || '🌿';
      todayEmojiEl.innerText = emo;
      todayTitleEl.innerText = `Today's Mood: ${todayCard.mood} (${todayCard.moodScore}/5)`;
      todayNoteEl.innerText = todayCard.note ? `"${todayCard.note}"` : 'Logged with no note.';
      statTodayMoodEl.innerText = `${emo} ${todayCard.moodScore}/5`;
      btnLogToday.innerText = 'Update Today\'s Mood';
    } else {
      todayEmojiEl.innerText = '🤔';
      todayTitleEl.innerText = "Today's Mood: Not logged yet";
      todayNoteEl.innerText = 'Take a 30-second pause to reflect on how you feel today.';
      statTodayMoodEl.innerText = '- / 5';
      btnLogToday.innerText = 'Log Today\'s Mood';
    }

    // 3. Stats
    document.getElementById('statJournalCount').innerText = data.journalCount || 0;
    
    // Calculate 7-day average
    const weekMoods = data.weekMoods || [];
    if (weekMoods.length > 0) {
      const sum = weekMoods.reduce((acc, m) => acc + m.moodScore, 0);
      const avg = (sum / weekMoods.length).toFixed(1);
      document.getElementById('statWeekAvg').innerText = `${avg} / 5`;
    } else {
      document.getElementById('statWeekAvg').innerText = '0.0';
    }

    // Total moods logged
    document.getElementById('statMoodCount').innerText = (data.recentMoods || []).length;

    // 4. Render 7-Day Trend Graph
    renderMoodGraph(weekMoods);

    // 5. Render Recent Mood History List
    renderRecentMoods(data.recentMoods || []);

  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

function renderRecentMoods(moodList) {
  const container = document.getElementById('recentMoodsList');
  if (!moodList || moodList.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">No mood entries recorded yet.</p>`;
    return;
  }

  const emojiMap = { 'Happy': '😊', 'Good': '😌', 'Okay': '😐', 'Sad': '😔', 'Angry': '😡', 'Anxious': '😰' };

  container.innerHTML = moodList.map(item => {
    const emo = emojiMap[item.mood] || '🌿';
    const noteText = item.note ? `"${item.note}"` : 'No note provided';
    return `
      <div class="mood-history-item">
        <div class="mood-item-left">
          <span class="emoji">${emo}</span>
          <div class="mood-item-info">
            <div class="title">${item.mood} (${item.moodScore}/5)</div>
            <div class="note">${escapeHtml(noteText)}</div>
          </div>
        </div>
        <div class="mood-item-right">
          <div>${item.date}</div>
          <div>${item.time}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderMoodGraph(weekMoods) {
  const canvas = document.getElementById('moodChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Handle high-DPI displays
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.parentElement.clientWidth || 500;
  const height = 200;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  if (!weekMoods || weekMoods.length === 0) {
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No mood data available for this week yet.', width / 2, height / 2);
    return;
  }

  const paddingLeft = 45;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 35;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Draw Horizontal Gridlines (1 to 5)
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '11px Outfit, sans-serif';
  ctx.textAlign = 'right';

  for (let score = 1; score <= 5; score++) {
    const y = paddingTop + chartHeight - ((score - 1) / 4) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();
    ctx.fillText(`${score}`, paddingLeft - 8, y + 4);
  }

  // Calculate points
  const points = weekMoods.map((m, i) => {
    const x = weekMoods.length === 1 
      ? paddingLeft + chartWidth / 2 
      : paddingLeft + (i / (weekMoods.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((m.moodScore - 1) / 4) * chartHeight;
    return { x, y, score: m.moodScore, mood: m.mood, date: m.date };
  });

  // Draw Gradient Fill under line
  if (points.length > 1) {
    const grad = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
    grad.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineTo(points[points.length - 1].x, paddingTop + chartHeight);
    ctx.lineTo(points[0].x, paddingTop + chartHeight);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Draw Connecting Line
  ctx.beginPath();
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // Draw Circles & Labels
  ctx.textAlign = 'center';
  points.forEach((p) => {
    // Outer white circle
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#0f1016';
    ctx.fill();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Date label at bottom
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px Inter, sans-serif';
    const dayName = formatDateShort(p.date);
    ctx.fillText(dayName, p.x, height - 12);
  });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
}

// =========================================================
// Mood Tracking Module
// =========================================================

function selectMood(moodName, score, emoji) {
  selectedMoodData = { mood: moodName, score: Number(score), emoji };
  
  // Highlight card
  document.querySelectorAll('.mood-option-card').forEach(card => {
    if (card.getAttribute('data-mood') === moodName) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  // Sync slider
  const slider = document.getElementById('moodScoreSlider');
  if (slider) slider.value = score;
  updateScoreFromSlider(score);
}

function updateScoreFromSlider(val) {
  const scoreNum = Number(val);
  selectedMoodData.score = scoreNum;
  document.getElementById('sliderScoreDisplay').innerText = `${scoreNum} / 5`;
}

function appendTag(tag) {
  const noteInput = document.getElementById('moodNoteInput');
  if (!noteInput.value.includes(tag)) {
    noteInput.value = (noteInput.value + ' ' + tag).trim();
  }
}

async function saveMoodEntry() {
  if (!token) return;
  const note = document.getElementById('moodNoteInput').value.trim();

  try {
    const res = await fetch(`${API_BASE}/moods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        moodScore: selectedMoodData.score,
        mood: selectedMoodData.mood,
        note
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to save mood');
    }

    showToast(`Mood saved: ${selectedMoodData.mood} (${selectedMoodData.score}/5)! 🌸`, 'success');
    document.getElementById('moodNoteInput').value = '';
    
    // Jump to dashboard to see updated graph & status
    navigateTo('dashboard');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =========================================================
// Journal Module
// =========================================================

function cycleJournalPrompt() {
  currentPromptIndex = (currentPromptIndex + 1) % PROMPT_LIST.length;
  document.getElementById('journalPromptText').innerText = PROMPT_LIST[currentPromptIndex];
}

async function loadJournals() {
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/journals`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) { logout(); return; }
    const journals = await res.json();

    document.getElementById('journalCountBadge').innerText = `${journals.length} ${journals.length === 1 ? 'Entry' : 'Entries'}`;
    const listEl = document.getElementById('journalEntriesList');

    if (!journals || journals.length === 0) {
      listEl.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">No journal entries yet. Start by writing your first reflection on the left!</p>`;
      return;
    }

    listEl.innerHTML = journals.map(j => `
      <div class="journal-card-item">
        <div class="journal-item-header">
          <span class="journal-item-title">${escapeHtml(j.title || 'Daily Reflection')}</span>
          <span class="journal-item-date">${j.date} • ${j.time}</span>
        </div>
        <div class="journal-item-body">${escapeHtml(j.text)}</div>
        <div class="journal-item-actions">
          <button class="btn btn-sm btn-outline-danger" onclick="deleteJournal(${j.journalId})">
            🗑️ Delete
          </button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error loading journals:', err);
  }
}

async function handleSaveJournal(e) {
  e.preventDefault();
  if (!token) return;

  const title = document.getElementById('journalTitleInput').value.trim();
  const text = document.getElementById('journalTextInput').value.trim();

  try {
    const res = await fetch(`${API_BASE}/journals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, text })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to save journal');
    }

    showToast('Journal entry saved! 📔', 'success');
    document.getElementById('journalTitleInput').value = '';
    document.getElementById('journalTextInput').value = '';
    loadJournals();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteJournal(journalId) {
  if (!confirm('Are you sure you want to delete this journal entry?')) return;
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/journals/${journalId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to delete entry');
    showToast('Entry deleted.', 'success');
    loadJournals();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =========================================================
// AI Friend Chat Module
// =========================================================

async function loadChatHistory() {
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) { logout(); return; }
    const history = await res.json();

    const messagesEl = document.getElementById('chatMessages');
    messagesEl.innerHTML = '';

    // Welcome greeting bubble
    appendChatBubble('ai', `Hello ${currentUser ? currentUser.name.split(' ')[0] : 'friend'}! 🌸 I'm Bloom, your supportive companion. How is your day going? Feel free to share anything on your mind.`);

    if (history && history.length > 0) {
      history.forEach(item => {
        appendChatBubble('user', item.message, item.time);
        appendChatBubble('ai', item.response, item.time);
      });
    }

    scrollChatToBottom();
  } catch (err) {
    console.error('Error loading chat:', err);
  }
}

function appendChatBubble(sender, text, timeStr = null) {
  const messagesEl = document.getElementById('chatMessages');
  const nowStr = timeStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const row = document.createElement('div');
  row.className = `message-row ${sender}`;
  row.innerHTML = `
    <div class="message-bubble">
      ${escapeHtml(text)}
      <div class="message-time">${nowStr}</div>
    </div>
  `;
  messagesEl.appendChild(row);
  scrollChatToBottom();
}

function showTypingIndicator() {
  const messagesEl = document.getElementById('chatMessages');
  const row = document.createElement('div');
  row.className = 'message-row ai';
  row.id = 'aiTypingIndicator';
  row.innerHTML = `
    <div class="message-bubble" style="background: var(--bg-muted);">
      <div class="typing-dots">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>
  `;
  messagesEl.appendChild(row);
  scrollChatToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById('aiTypingIndicator');
  if (el) el.remove();
}

function scrollChatToBottom() {
  const messagesEl = document.getElementById('chatMessages');
  messagesEl.scrollTop = messagesEl.scrollHeight;
}


let currentChatHistory = [];

async function handleSendChat(e) {
  e.preventDefault();
  const inputEl = document.getElementById('chatInputField');
  const message = inputEl.value.trim();
  if (!message) return;

  inputEl.value = '';
  appendChatBubble('user', message);
  showTypingIndicator();
  
  // Maintain context
  currentChatHistory.push({ role: 'user', content: message });
  // Keep last 8 messages
  if (currentChatHistory.length > 8) {
      currentChatHistory = currentChatHistory.slice(currentChatHistory.length - 8);
  }

  try {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ messages: currentChatHistory })
    });

    if (!res.ok) throw new Error('Failed to stream');
    
    removeTypingIndicator();
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    
    const messagesEl = document.getElementById('chatMessages');
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const row = document.createElement('div');
    row.className = 'message-row ai';
    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = 'message-bubble-wrapper';
    
    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar-sm';
    avatar.innerText = '🌸';
    
    const contentBox = document.createElement('div');
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    const timeSpan = document.createElement('div');
    timeSpan.className = 'message-time';
    timeSpan.innerText = nowStr;
    
    contentBox.appendChild(bubble);
    contentBox.appendChild(timeSpan);
    bubbleWrapper.appendChild(avatar);
    bubbleWrapper.appendChild(contentBox);
    row.appendChild(bubbleWrapper);
    messagesEl.appendChild(row);
    scrollChatToBottom();

    let fullAiResponse = '';
    let lineBuffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || '';
      
      for (const line of lines) {
          if (line.trim()) {
              try {
                  const data = JSON.parse(line.trim());
                  if (data.t !== undefined) {
                      fullAiResponse += data.t;
                      bubble.innerText = fullAiResponse;
                      scrollChatToBottom();
                  } else if (data.r !== undefined) {
                      fullAiResponse = data.r;
                      bubble.innerText = fullAiResponse;
                      scrollChatToBottom();
                  } else if (data.e !== undefined) {
                      fullAiResponse = data.e;
                      bubble.innerText = fullAiResponse;
                  }
              } catch (err) {}
          }
      }
    }
    currentChatHistory.push({ role: 'assistant', content: fullAiResponse });
    setTimeout(() => { if (typeof loadDashboardData === "function") loadDashboardData(); }, 5000);

  } catch (err) {
    removeTypingIndicator();
    appendChatBubble('ai', 'I am here for you, but had trouble sending my thought. Please try again.');
  }
}


    


function sendQuickPrompt(promptText) {
  document.getElementById('chatInputField').value = promptText;
  handleSendChat(new Event('submit'));
}

async function clearChatHistory() {
  if (!confirm('Clear your conversation with Bloom?')) return;
  if (!token) return;

  try {
    await fetch(`${API_BASE}/chat`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    showToast('Chat history cleared.', 'success');
    loadChatHistory();
  } catch (err) {
    showToast('Failed to clear chat', 'error');
  }
}

// =========================================================
// Emergency Support Module
// =========================================================

async function loadEmergencyContacts() {
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/emergency-contacts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) { logout(); return; }
    const contacts = await res.json();

    const listEl = document.getElementById('emergencyContactsList');
    if (!contacts || contacts.length === 0) {
      listEl.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">No emergency contacts saved yet. Click "+ Add Contact" above.</p>`;
      return;
    }

    listEl.innerHTML = contacts.map(c => `
      <div class="emergency-contact-card">
        <div class="contact-left">
          <div class="contact-avatar">📞</div>
          <div class="contact-info">
            <div class="contact-name">${escapeHtml(c.name)}</div>
            <div class="contact-sub">${escapeHtml(c.relationship || 'Contact')} • ${escapeHtml(c.phone)}</div>
          </div>
        </div>
        <div class="contact-actions">
          <a href="tel:${escapeHtml(c.phone)}" class="btn-call">
            Call
          </a>
          <button class="btn-icon" onclick="deleteContact(${c.contactId})" title="Remove contact">
            &times;
          </button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error loading emergency contacts:', err);
  }
}

function openAddContactModal() {
  document.getElementById('addContactModal').classList.add('active');
}

function closeAddContactModal() {
  document.getElementById('addContactModal').classList.remove('active');
}

async function handleSaveContact(e) {
  e.preventDefault();
  if (!token) return;

  const name = document.getElementById('contactNameInput').value.trim();
  const phone = document.getElementById('contactPhoneInput').value.trim();
  const relationship = document.getElementById('contactRelInput').value.trim();

  try {
    const res = await fetch(`${API_BASE}/emergency-contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, phone, relationship })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to save contact');
    }

    showToast('Emergency contact saved!', 'success');
    closeAddContactModal();
    document.getElementById('contactNameInput').value = '';
    document.getElementById('contactPhoneInput').value = '';
    document.getElementById('contactRelInput').value = '';
    loadEmergencyContacts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteContact(contactId) {
  if (!confirm('Remove this emergency contact?')) return;
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/emergency-contacts/${contactId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to remove contact');
    showToast('Contact removed.', 'success');
    loadEmergencyContacts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 4-7-8 Breathing Exercise
function toggleBreathing() {
  const circle = document.getElementById('breathCircle');
  const label = document.getElementById('breathText');
  const toggleBtn = document.getElementById('btnBreathingToggle');

  if (isBreathingActive) {
    clearInterval(breathingInterval);
    isBreathingActive = false;
    toggleBtn.innerText = 'Start Exercise';
    label.innerText = 'Breathe';
    circle.className = 'breathing-circle';
    return;
  }

  isBreathingActive = true;
  toggleBtn.innerText = 'Stop Exercise';

  let step = 0; // 0 = inhale 4s, 1 = hold 7s, 2 = exhale 8s
  let secondsLeft = 4;

  const runPhase = () => {
    if (step === 0) {
      circle.className = 'breathing-circle inhale';
      label.innerText = `Inhale (${secondsLeft})`;
      if (secondsLeft <= 0) {
        step = 1;
        secondsLeft = 7;
      }
    } else if (step === 1) {
      circle.className = 'breathing-circle hold';
      label.innerText = `Hold (${secondsLeft})`;
      if (secondsLeft <= 0) {
        step = 2;
        secondsLeft = 8;
      }
    } else if (step === 2) {
      circle.className = 'breathing-circle exhale';
      label.innerText = `Exhale (${secondsLeft})`;
      if (secondsLeft <= 0) {
        step = 0;
        secondsLeft = 4;
      }
    }
    secondsLeft--;
  };

  runPhase();
  breathingInterval = setInterval(runPhase, 1000);
}

// =========================================================
// Profile & Modal
// =========================================================

async function openProfileModal() {
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      document.getElementById('profileModalName').innerText = data.user.name;
      document.getElementById('profileModalEmail').innerText = data.user.email;
      document.getElementById('profileModalAvatar').innerText = data.user.name.charAt(0).toUpperCase();
      document.getElementById('profileUserId').innerText = `#${data.user.userId}`;
      document.getElementById('profileMoodCount').innerText = data.stats.totalMoods;
      document.getElementById('profileJournalCount').innerText = data.stats.totalJournals;
      
      const joined = new Date(data.user.createdAt).toLocaleDateString();
      document.getElementById('profileJoinedDate').innerText = joined;
    }
  } catch (e) {
    console.error('Error fetching profile:', e);
  }

  document.getElementById('profileModal').classList.add('active');
}

function closeProfileModal() {
  document.getElementById('profileModal').classList.remove('active');
}

// =========================================================
// Toast Notification Utility
// =========================================================

function showToast(message, type = 'success') {
  const hub = document.getElementById('toastHub');
  if (!hub) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '🌸' : '⚠️'}</span> <span>${escapeHtml(message)}</span>`;

  hub.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


// =========================================================
// Layout Toggle (Desktop / Mobile View)
// =========================================================

function toggleLayout() {
  const body = document.body;
  const btn = document.getElementById('layoutToggleBtn');
  const label = document.getElementById('layoutToggleLabel');

  const isDesktop = body.classList.toggle('layout-desktop');

  if (isDesktop) {
    label.textContent = 'Mobile View';
    btn.style.color = '#6366f1';
    btn.style.borderColor = '#6366f1';
    localStorage.setItem('mindbloom_layout', 'desktop');
  } else {
    label.textContent = 'Desktop View';
    btn.style.color = '';
    btn.style.borderColor = '';
    localStorage.setItem('mindbloom_layout', 'mobile');
  }
}

function initLayout() {
  const saved = localStorage.getItem('mindbloom_layout');
  if (saved === 'desktop') {
    document.body.classList.add('layout-desktop');
    const label = document.getElementById('layoutToggleLabel');
    const btn = document.getElementById('layoutToggleBtn');
    if (label) label.textContent = 'Mobile View';
    if (btn) { btn.style.color = '#6366f1'; btn.style.borderColor = '#6366f1'; }
  }
}
