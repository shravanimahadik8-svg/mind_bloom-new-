/**
 * AI Friend ("Bloom") Engine for Mind Bloom MVP
 * Provides supportive, non-judgmental, empathetic responses and journaling prompts.
 */

const JOURNALING_PROMPTS = [
  "What is one small thing that brought you a moment of comfort today?",
  "Write down three things currently within your control, and one thing you can gently release.",
  "If a close friend felt the way you do right now, what kind words would you offer them?",
  "What is one boundary you can set today to protect your peace?",
  "Describe a challenge you navigated in the past that proved your resilience.",
  "What does your mind or body need most in this exact moment?"
];

function generateSupportiveResponse(message, userName = 'Friend') {
  const msg = (message || '').toLowerCase().trim();

  // 1. Extreme Crisis / Emergency Safety Detection
  if (
    msg.includes('kill myself') ||
    msg.includes('end my life') ||
    msg.includes('suicide') ||
    msg.includes('hurt myself') ||
    msg.includes('want to die')
  ) {
    return {
      reply: `Please know that you are not alone, and your life has deep value. I care about your safety. If you are having thoughts of hurting yourself, please reach out immediately to our Emergency Support tab, or connect with a 24/7 crisis counselor:\n\n• Tele-MANAS (India): Call 14416 or 1800-891-4416\n• National Crisis Lifeline (US/Canada): Call or Text 988\n• Emergency Services: Call 112 or 911\n\nPlease reach out to someone who can help right now. You matter.`,
      suggestEmergency: true
    };
  }

  // 2. College & Academic Stress (Core focus of user prompt)
  if (
    msg.includes('stressed about college') ||
    msg.includes('college') ||
    msg.includes('exam') ||
    msg.includes('assignment') ||
    msg.includes('midterm') ||
    msg.includes('deadline') ||
    msg.includes('grades') ||
    msg.includes('study') ||
    msg.includes('project')
  ) {
    const responses = [
      `I'm sorry you're having a difficult time with college pressure, ${userName}. College deadlines and exams can feel genuinely overwhelming. Want to tell me what specific part is feeling the heaviest right now?`,
      `College expectations can be so heavy to carry. Remember: your grades do not define your worth or potential. Have you taken a short 5-minute break to step away from your screen today?`,
      `It is completely natural to feel stressed about college. When everything piles up, try picking just ONE small task to focus on for 15 minutes, then rest. How does that sound?`
    ];
    return {
      reply: responses[Math.floor(Math.random() * responses.length)],
      prompt: "Journaling suggestion: 'What is one academic task I can finish today, and what can wait until tomorrow?'"
    };
  }

  // 3. Stressed / Overwhelmed general
  if (
    msg.includes('stressed') ||
    msg.includes('stress') ||
    msg.includes('overwhelm') ||
    msg.includes('too much') ||
    msg.includes('pressure')
  ) {
    return {
      reply: `I'm sorry you're having a difficult day, ${userName}. It sounds like a lot is weighing on your shoulders. Want to tell me what's making you feel stressed? I'm here to listen.`,
      prompt: "Would you like to write a quick entry in your Daily Journal to get those racing thoughts out of your head?"
    };
  }

  // 4. Sadness / Feeling Down / Crying
  if (
    msg.includes('sad') ||
    msg.includes('crying') ||
    msg.includes('depressed') ||
    msg.includes('lonely') ||
    msg.includes('down') ||
    msg.includes('heartbroken') ||
    msg.includes('empty')
  ) {
    const responses = [
      `I'm sending you warmth, ${userName}. It's okay not to be okay today. You don't have to force yourself to smile or fix everything right now. What feels like the hardest part today?`,
      `I'm sitting with you in this moment. Sadness can be heavy and exhausting. Be gentle with yourself. Can you do one soft, comforting thing for yourself right now, like drinking a warm tea or wrapping in a blanket?`
    ];
    return {
      reply: responses[Math.floor(Math.random() * responses.length)],
      prompt: "Journal prompt: 'What is one thing that felt gentle or comforting recently?'"
    };
  }

  // 5. Anxiety / Panic / Worry
  if (
    msg.includes('anxious') ||
    msg.includes('anxiety') ||
    msg.includes('panic') ||
    msg.includes('nervous') ||
    msg.includes('scared') ||
    msg.includes('worry') ||
    msg.includes('fear')
  ) {
    return {
      reply: `I can sense how unsettling that feeling is. Let's do a quick grounding exercise together right now:\n\n1. Take a slow breath in for 4 seconds.\n2. Hold gently for 4 seconds.\n3. Release slowly for 6 seconds.\n\nLook around your room: name 3 blue things you can see. You are safe in this present moment.`,
      exercise: "4-7-8 Breathing"
    };
  }

  // 6. Anger / Frustration
  if (
    msg.includes('angry') ||
    msg.includes('mad') ||
    msg.includes('furious') ||
    msg.includes('annoyed') ||
    msg.includes('hate') ||
    msg.includes('frustrated')
  ) {
    return {
      reply: `It makes total sense that you're feeling frustrated. Anger is often a sign that our boundaries were crossed or expectations weren't met. It's healthy to acknowledge that feeling. What triggered this frustration?`,
      prompt: "Journal prompt: 'What boundary was crossed, and what do I need to feel respected?'"
    };
  }

  // 7. Tired / Exhausted / Burnout
  if (
    msg.includes('tired') ||
    msg.includes('exhausted') ||
    msg.includes('burnout') ||
    msg.includes('sleepy') ||
    msg.includes('drained')
  ) {
    return {
      reply: `You sound emotionally and physically drained, ${userName}. Rest is not a reward you have to earn—it's a fundamental human need. Can you give yourself permission to rest tonight without guilt?`,
      prompt: "Journal prompt: 'What can I safely take off my to-do list for this evening?'"
    };
  }

  // 8. Positive / Happy / Good News
  if (
    msg.includes('happy') ||
    msg.includes('good') ||
    msg.includes('great') ||
    msg.includes('excited') ||
    msg.includes('passed') ||
    msg.includes('proud') ||
    msg.includes('wonderful') ||
    msg.includes('yay') ||
    msg.includes('awesome')
  ) {
    return {
      reply: `That brings a genuine smile to my screen! 🎉 I am so happy for you, ${userName}! Moments like this are so special. What was the highlight of this experience? Make sure to celebrate your win!`,
      prompt: "Journal prompt: 'Capture this feeling! What went right, and how did I contribute to this success?'"
    };
  }

  // 9. Greeting / Check-in
  if (
    msg === 'hi' ||
    msg === 'hello' ||
    msg === 'hey' ||
    msg.startsWith('hi ') ||
    msg.startsWith('hello ')
  ) {
    return {
      reply: `Hello ${userName}! 🌸 I'm Bloom, your supportive AI companion. How is your heart and mind feeling today? You can share whatever is on your mind—I'm here for you.`,
      prompt: null
    };
  }

  // 10. Prompt request
  if (msg.includes('prompt') || msg.includes('journaling') || msg.includes('what should i write')) {
    const randomPrompt = JOURNALING_PROMPTS[Math.floor(Math.random() * JOURNALING_PROMPTS.length)];
    return {
      reply: `Here is a thoughtful prompt for you today:\n\n✨ "${randomPrompt}"\n\nTake your time with it, there is no right or wrong answer!`,
      prompt: randomPrompt
    };
  }

  // Default compassionate response
  const generalResponses = [
    `Thank you for sharing that with me, ${userName}. Whatever you're navigating right now, please know that your feelings are valid. Would you like to tell me a little more, or would you like to explore a calming prompt?`,
    `I'm listening closely, ${userName}. Sometimes just putting our thoughts into words helps lighten the mental load. How are you holding up right now?`,
    `I appreciate your honesty with me. It takes courage to tune in to your emotions. What is one thing that might bring you a tiny bit of comfort today?`
  ];

  return {
    reply: generalResponses[Math.floor(Math.random() * generalResponses.length)],
    prompt: JOURNALING_PROMPTS[Math.floor(Math.random() * JOURNALING_PROMPTS.length)]
  };
}

module.exports = {
  generateSupportiveResponse,
  JOURNALING_PROMPTS
};
