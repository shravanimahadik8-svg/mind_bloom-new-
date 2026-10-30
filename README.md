# 🌸 Mind Bloom — Mental Wellness & Mood Tracker MVP

> **"Nurture your mind, one day at a time."**  
> A lightweight, full-stack, zero-dependency mental wellness web application designed as an exemplary college project MVP.

---

## 📌 Executive Summary

**Mind Bloom** focuses strictly on the highest-value core user journey for mental wellness tracking:
1. **🔐 Authentication & User Profile**: Secure Sign Up, Login, Token generation, and basic profile.
2. **🧠 Daily Mood Tracking**: Log mood (Happy 😊, Okay 😐, Sad 😔, Angry 😡, Anxious 😰), score (1–5), note, and timestamp.
3. **📔 Simple Daily Journal**: Write reflections with inspiration prompts, view past entries, and delete them.
4. **🤖 Basic AI Friend Chat ("Bloom")**: Real-time supportive conversational companion offering empathetic responses and journaling suggestions.
5. **📊 Real-time Dashboard**: Today's mood status, 7-day mood graph, journal count, and recent logs.
6. **🚨 Emergency Help Hub**: Instant contact dialing (Mom, Friend, Campus Helpline, 911/112) + interactive 4-7-8 breathing de-escalation tool.

---

## 🗄️ Database Architecture (SQLite)

The application uses an embedded SQLite database (`mood_bloom.db`) matching the exact database classes specified:

### 1. `users` Table
| Column | Type | Description |
|---|---|---|
| `userId` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Unique identifier for each student |
| `name` | `TEXT NOT NULL` | Student full name |
| `email` | `TEXT UNIQUE NOT NULL` | Login email address |
| `password` | `TEXT NOT NULL` | Scrypt salted password hash |
| `salt` | `TEXT NOT NULL` | Cryptographic salt |
| `createdAt` | `TEXT NOT NULL` | Account registration timestamp |

### 2. `moods` Table
| Column | Type | Description |
|---|---|---|
| `moodId` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Unique log ID |
| `userId` | `INTEGER NOT NULL` | Foreign key referencing `users(userId)` |
| `moodScore` | `INTEGER NOT NULL (1 to 5)` | 1 = Struggling, 5 = Great |
| `mood` | `TEXT NOT NULL` | Happy, Good, Okay, Sad, Angry, Anxious |
| `note` | `TEXT` | Short description (e.g., "Feeling stressed about college") |
| `date` | `TEXT NOT NULL` | Log date (`YYYY-MM-DD`) |
| `time` | `TEXT NOT NULL` | Log time (`HH:MM AM/PM`) |

### 3. `journals` Table
| Column | Type | Description |
|---|---|---|
| `journalId` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Unique entry ID |
| `userId` | `INTEGER NOT NULL` | Foreign key referencing `users(userId)` |
| `title` | `TEXT` | Entry title |
| `text` | `TEXT NOT NULL` | Reflection content |
| `date` | `TEXT NOT NULL` | Entry date (`YYYY-MM-DD`) |
| `time` | `TEXT NOT NULL` | Entry time (`HH:MM AM/PM`) |
| `createdAt` | `TEXT NOT NULL` | ISO timestamp |

### 4. `emergency_contacts` Table
| Column | Type | Description |
|---|---|---|
| `contactId` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Unique contact ID |
| `userId` | `INTEGER NOT NULL` | Foreign key referencing `users(userId)` |
| `name` | `TEXT NOT NULL` | Contact name (Mom, Sam, Campus Counselor) |
| `phone` | `TEXT NOT NULL` | Dialable phone number |
| `relationship` | `TEXT` | Contact relation / label |

### 5. `chats` Table
| Column | Type | Description |
|---|---|---|
| `chatId` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Unique chat message ID |
| `userId` | `INTEGER NOT NULL` | Foreign key referencing `users(userId)` |
| `message` | `TEXT NOT NULL` | User input message |
| `response` | `TEXT NOT NULL` | AI Friend's supportive response |
| `date` | `TEXT NOT NULL` | Conversation date |
| `time` | `TEXT NOT NULL` | Timestamp |

---

## 🚀 How to Run the Application

### Option A: 1-Click Launch (Windows)
Double-click `start.bat` located inside the project folder.  
It automatically finds Node.js, starts the server on `http://localhost:3000`, and opens your default browser!

### Option B: Terminal Command
Run in PowerShell:
```powershell
& "C:\Users\LAB-02-PC-06\AppData\Local\Programs\RStudio\resources\app\bin\node\node.exe" server.js
```
Then navigate to `http://localhost:3000`.

---

## 🧑‍💻 Pre-loaded Demo Account for Viva / Presentation

To demonstrate the application without typing new accounts during a viva or presentation:
- **Email**: `demo@mindbloom.com`
- **Password**: `bloom123`
- **Student Name**: Alex Rivera

The demo account includes:
- A realistic **7-day mood history** showing student ups and downs (pre-populating the 7-day mood graph)
- **3 Journal reflections** (College overwhelm, group presentation, morning walk)
- **4 Emergency Contacts** (Mom, Roommate Sam, Campus Helpline, 911)
- Previous supportive **AI chat history**

---

## 🎓 College Viva Voce Defense Guide

Here are common questions faculty members ask during project defense and how to explain Mind Bloom:

#### Q1: "Why choose SQLite instead of MongoDB or external MySQL for this MVP?"
> **Answer**: "SQLite is a zero-configuration, serverless, ACID-compliant relational database. For an MVP focusing on user journals, mood logs, and personal health metrics, data is strictly relational (1:N from User to Moods, Journals, Contacts). SQLite embeds directly into the runtime without requiring a running database daemon, eliminating single points of failure during project demonstrations."

#### Q2: "How does the AI Friend Chat work?"
> **Answer**: "The AI Friend module uses rule-based emotional classification, keyword intent routing, and crisis safety filters. When a student expresses academic stress (e.g. 'Feeling stressed about college'), the engine extracts the sentiment, provides empathetic normalization, suggests a low-friction grounding action, and recommends a focused journaling prompt."

#### Q3: "How is user authentication secured?"
> **Answer**: "Passwords are encrypted using Node's cryptographic `scrypt` hashing algorithm with unique salts per user to prevent rainbow-table attacks. Sessions use HMAC-SHA256 signed tokens containing user identification and expiration timestamps."

#### Q4: "How does the 7-day mood graph work?"
> **Answer**: "The dashboard queries the user's most recent mood entries grouped by date. The frontend renders them onto an HTML5 Canvas element using linear interpolation, drawing grid lines for scores 1 to 5, an area gradient, and interactive data nodes."

---

## 📂 Project Directory Structure

```text
mood-bloom/
├── server.js               # Node.js HTTP server & REST API
├── database.js             # SQLite schema, tables & seed data
├── auth.js                 # Authentication & token verification
├── ai_friend.js            # Supportive AI companion & emotion engine
├── package.json            # Project manifest
├── start.bat               # 1-click Windows launcher
├── README.md               # Documentation & viva guide
└── public/                 # Modern responsive frontend SPA
    ├── index.html          # Clean semantic UI with view routing
    ├── styles.css          # Restorative floral aesthetic & animations
    ├── app.js              # State manager, Canvas chart, API client
    └── favicon.svg         # Mind Bloom flower logo
```
