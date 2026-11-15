// =====================================================
// J.A.R.V.I.S — GROWTH OS TELUGU
// EPISODES 03–06 | SINGLE CONSOLIDATED script.js
// Groq API only — no Gemini API
// =====================================================
"use strict";

// 1. HTML ELEMENTS
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");
const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");

function add(message, who = "ai") {
  if (!chat) {
    console.error("JARVIS: #chat element not found.");
    return null;
  }
  const div = document.createElement("div");
  div.className = "msg " + who;
  div.textContent = message;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

// 2. GROQ API SETTINGS
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const CHAT_MODEL = "openai/gpt-oss-20b";
const VISION_MODEL = "qwen/qwen3.8-27b";

let GROQ_KEY =
  localStorage.getItem("jarvis_groq_key") ||
  localStorage.getItem("jarvis_key") ||
  "";

function getGroqKey() {
  if (GROQ_KEY) return true;
  const entered = prompt("Enter your Groq API Key:");
  if (!entered || !entered.trim()) {
    add("Groq API Key ఇవ్వండి Boss.", "ai");
    return false;
  }
  GROQ_KEY = entered.trim();
  localStorage.setItem("jarvis_groq_key", GROQ_KEY);
  return true;
}

// 3. MEMORY
function loadMemory() {
  let saved;
  try {
    saved = JSON.parse(
      localStorage.getItem("jarvis_memory") ||
      localStorage.getItem("jarvis_memory_v1") ||
      "[]"
    );
  } catch {
    saved = [];
  }
  if (!Array.isArray(saved)) return [];

  return saved.map(item => {
    if (item && typeof item.text === "string") {
      return {
        role: item.role === "user" ? "user" : "assistant",
        content: item.text
      };
    }
    if (
      item &&
      (item.role === "user" || item.role === "assistant") &&
      typeof item.content === "string"
    ) {
      return { role: item.role, content: item.content };
    }
    return null;
  }).filter(Boolean);
}

let conversation = loadMemory();

function saveMemory() {
  try {
    localStorage.setItem("jarvis_memory", JSON.stringify(conversation));
  } catch (error) {
    console.error("Could not save JARVIS memory:", error);
    add("Memory save కాలేదు. Browser storage space చెక్ చేయండి, Boss.", "ai");
  }
}

function restoreConversation() {
  if (!chat) return;
  conversation.slice(-30).forEach(message => {
    add(
      (message.role === "user" ? "YOU: " : "J.A.R.V.I.S: ") +
      message.content,
      message.role === "user" ? "user" : "ai"
    );
  });
}
restoreConversation();

// 4. TEXT TO SPEECH
function speak(message) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(String(message));
  utterance.lang = "te-IN";
  utterance.rate = 1;
  utterance.pitch = 0.95;
  window.speechSynthesis.speak(utterance);
}

// 5. COMMON GROQ REQUEST
async function groqRequest(model, messages, options = {}) {
  if (!getGroqKey()) throw new Error("Groq API Key missing.");

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + GROQ_KEY
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_completion_tokens: options.max_completion_tokens ?? 1024
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data.error?.message ||
      "Groq API request failed with HTTP " + response.status
    );
  }
  const answer = data.choices?.[0]?.message?.content;
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("Groq returned an empty response.");
  }
  return answer.trim();
}

// 6. HELPER FUNCTIONS / TOOLS
async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Service unavailable: " + response.status);
  }
  return response.json();
}

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => resolve({
        lat: position.coords.latitude,
        lon: position.coords.longitude
      }),
      error => reject(error),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  });
}

// TOOL 1 — TIME
function timeTool() {
  return "ప్రస్తుతం సమయం " +
    new Date().toLocaleTimeString("te-IN") + ", Boss.";
}

// TOOL 2 — WEATHER
async function weatherTool() {
  try {
    const location = await getLocation();
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${location.lat}&longitude=${location.lon}` +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature" +
      "&timezone=auto";
    const data = await fetchJSON(url);
    const current = data.current;
    return `ప్రస్తుత ఉష్ణోగ్రత ${current.temperature_2m}°C.
తేమ ${current.relative_humidity_2m}%.
అనుభూతి ఉష్ణోగ్రత ${current.apparent_temperature}°C.`;
  } catch (error) {
    return "Weather కోసం Location Permission మరియు Internet అవసరం, Boss. (" +
      (error.message || "Location error") + ")";
  }
}

// TOOL 3 — TIMER
function timerTool(command) {
  const match = command.match(
    /(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/i
  );
  if (!match) {
    return "ఉదాహరణ: Set timer for 2 minutes అని చెప్పండి.";
  }
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = /^(seconds?|secs?)/.test(unit) ? 1000 :
    /^(hours?|hrs?)/.test(unit) ? 3600000 : 60000;
  const duration = amount * multiplier;
  if (!Number.isFinite(duration) || duration <= 0 || duration > 86400000) {
    return "1 millisecond నుంచి 24 గంటల లోపు Timer పెట్టండి, Boss.";
  }
  setTimeout(() => {
    const message = `Boss, మీ ${amount} ${unit} Timer పూర్తయింది!`;
    add("J.A.R.V.I.S: " + message, "ai");
    speak(message);
  }, duration);
  return `${amount} ${unit} Timer సెట్ చేశాను, Boss.`;
}

// TOOL 4 — DICE / COIN
function diceCoinTool(command) {
  const t = command.toLowerCase();
  if (/coin|flip|కాయిన్/.test(t)) {
    return "Coin Flip Result: " +
      (Math.random() < 0.5 ? "Heads" : "Tails");
  }
  return "Dice Result: " + (Math.floor(Math.random() * 6) + 1);
}

// TOOL 5 — RANDOM JOKE
async function jokeTool() {
  try {
    const data = await fetchJSON("https://v2.jokeapi.dev/joke/Any?safe-mode");
    return data.type === "single"
      ? data.joke
      : data.setup + "\n" + data.delivery;
  } catch {
    return "Joke service ప్రస్తుతం పనిచేయడం లేదు.";
  }
}

// TOOL 6 — DAILY QUOTE
async function quoteTool() {
  try {
    const data = await fetchJSON("https://dummyjson.com/quotes/random");
    return `Daily Quote: ${data.quote}\nAuthor: ${data.author}`;
  } catch {
    return "Quote పొందలేకపోయాను.";
  }
}

// TOOL 7 — TECH NEWS
async function newsTool() {
  try {
    const data = await fetchJSON(
      "https://hn.algolia.com/api/v1/search?tags=front_page"
    );
    const stories = (data.hits || []).slice(0, 5);
    if (!stories.length) return "News అందుబాటులో లేదు.";
    return "Top Tech News:\n" +
      stories.map((item, index) => `${index + 1}. ${item.title}`).join("\n");
  } catch {
    return "Tech News పొందలేకపోయాను.";
  }
}

// TOOL 8 — TELUGU TRANSLATOR
async function translateTool(command) {
  let query = command.replace(
    /^(translate(?:\s+this)?|అనువదించు|తెలుగులోకి అనువదించు)\s*/i,
    ""
  ).trim();
  query = query.replace(/\s+to\s+(telugu|te)\s*$/i, "").trim();
  if (!query) return "అనువదించాల్సిన వాక్యం చెప్పండి, Boss.";
  try {
    const url =
      "https://api.mymemory.translated.net/get?q=" +
      encodeURIComponent(query) + "&langpair=en|te";
    const data = await fetchJSON(url);
    return "తెలుగు అనువాదం: " + data.responseData.translatedText;
  } catch {
    return "Translation service error.";
  }
}

// TOOL 9 — CURRENCY EXCHANGE
async function currencyTool(command) {
  const match = command.match(
    /(\d+(?:\.\d+)?)\s*(USD|INR|EUR|GBP|JPY)\s*(?:to|in|into)\s*(USD|INR|EUR|GBP|JPY)/i
  );
  if (!match) return "ఉదాహరణ: 100 USD to INR అని అడగండి.";
  const amount = Number(match[1]);
  const from = match[2].toUpperCase();
  const to = match[3].toUpperCase();
  try {
    const data = await fetchJSON(
      `https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`
    );
    if (!data.rates?.[to]) return "Exchange rate అందుబాటులో లేదు.";
    return `${amount} ${from} = ${(amount * data.rates[to]).toFixed(2)} ${to}`;
  } catch {
    return "Currency service error.";
  }
}

// TOOL 10 — WORD MEANING
async function meaningTool(command) {
  const word = command.replace(
    /^(meaning of|define|meaning|word meaning)\s*/i,
    ""
  ).trim();
  if (!word) return "ఏ పదానికి అర్థం కావాలో చెప్పండి.";
  try {
    const data = await fetchJSON(
      "https://api.dictionaryapi.dev/api/v2/entries/en/" +
      encodeURIComponent(word)
    );
    const meanings = data[0]?.meanings || [];
    if (!meanings.length) return "Word meaning కనుగొనలేకపోయాను.";
    return word + ":\n" + meanings.slice(0, 2).map(item =>
      item.partOfSpeech + ": " +
      (item.definitions?.[0]?.definition || "")
    ).join("\n");
  } catch {
    return "Word meaning కనుగొనలేకపోయాను.";
  }
}

// TOOL 11 — PASSWORD GENERATOR
function passwordTool(command) {
  const match = command.match(/\b(\d{1,2})\b/);
  const length = match
    ? Math.min(64, Math.max(8, Number(match[1])))
    : 16;
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const random = new Uint32Array(length);
  crypto.getRandomValues(random);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars[random[i] % chars.length];
  }
  return "Generated Password: " + password;
}

// TOOL 12 — WIKIPEDIA SEARCH
async function wikipediaTool(command) {
  const query = command.replace(
    /^(wikipedia|search wikipedia|search)\s*/i,
    ""
  ).trim();
  if (!query) return "Wikipediaలో ఏ విషయం వెతకాలో చెప్పండి.";
  try {
    const url =
      "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
      encodeURIComponent(query) + "&format=json&origin=*";
    const data = await fetchJSON(url);
    const result = data.query?.search?.[0];
    if (!result) return "ఫలితాలు లభించలేదు.";
    const details = await fetchJSON(
      "https://en.wikipedia.org/api/rest_v1/page/summary/" +
      encodeURIComponent(result.title)
    );
    return `${result.title}\n${details.extract || "వివరాలు లేవు."}\n` +
      `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, "_"))}`;
  } catch {
    return "Wikipedia service error.";
  }
}

// TOOL 13 — OPEN APPS
function openAppTool(command) {
  const t = command.toLowerCase().trim();
  if (/youtube|యూట్యూబ్/.test(t)) {
    window.open("https://www.youtube.com/", "_blank", "noopener");
    return "YouTube తెరుస్తున్నాను, Boss.";
  }
  if (/google|గూగుల్/.test(t)) {
    window.open("https://www.google.com/", "_blank", "noopener");
    return "Google తెరుస్తున్నాను, Boss.";
  }
  return null;
}

// TOOL 14 — YOUTUBE SONG SEARCH
function youtubeTool(command) {
  let query = command.trim();
  query = query.replace(
    /^(play|youtube|search youtube|ప్లే|పాట ప్లే చేయి)\s*/i,
    ""
  );
  query = query.replace(/^(a song|song|పాట)\s*/i, "").trim();
  if (!query) return "ఏ పాట వెతకాలో చెప్పండి, Boss.";
  window.open(
    "https://www.youtube.com/results?search_query=" +
      encodeURIComponent(query),
    "_blank",
    "noopener"
  );
  return `${query} కోసం YouTubeలో వెతుకుతున్నాను.`;
}

// TOOL 15 — CRYPTO PRICE
async function cryptoTool(command) {
  const t = command.toLowerCase();
  let coin = "bitcoin";
  if (/\b(ethereum|eth)\b/.test(t)) coin = "ethereum";
  else if (/\b(dogecoin|doge)\b/.test(t)) coin = "dogecoin";
  else if (/\b(solana|sol)\b/.test(t)) coin = "solana";
  try {
    const data = await fetchJSON(
      "https://api.coingecko.com/api/v3/simple/price?ids=" +
      coin + "&vs_currencies=usd,inr"
    );
    if (!data[coin]) return "Crypto price అందుబాటులో లేదు.";
    return `${coin.toUpperCase()} Price:\nUSD: $${data[coin].usd}\nINR: ₹${data[coin].inr}`;
  } catch {
    return "Crypto service error.";
  }
}

// 7. TOOL ROUTER
async function handleTools(command) {
  const t = command.toLowerCase().trim();

  if (/\b(what time|current time|time now|time)\b/.test(t) ||
      /సమయం|టైమ్/.test(t)) return timeTool();

  if (/\b(weather|temperature)\b/.test(t) || /వాతావరణం/.test(t))
    return await weatherTool();

  if (/\btimer\b/.test(t) || /టైమర్/.test(t))
    return timerTool(command);

  if (/\b(dice|roll dice|coin|flip coin)\b/.test(t) || /డైస్|కాయిన్/.test(t))
    return diceCoinTool(command);

  if (/\b(joke|tell me a joke)\b/.test(t) || /జోక్/.test(t))
    return await jokeTool();

  if (/\b(quote|daily quote|motivation quote)\b/.test(t) || /కోట్|ప్రేరణ/.test(t))
    return await quoteTool();

  if (/\b(tech news|technology news)\b/.test(t) || /టెక్ న్యూస్/.test(t))
    return await newsTool();

  if (/^translate\b/.test(t) || /^(అనువదించు|తెలుగులోకి అనువదించు)/.test(t))
    return await translateTool(command);

  if (/\b(usd|inr|eur|gbp|jpy)\b.*\b(to|in|into)\b/i.test(t))
    return await currencyTool(command);

  if (/^(meaning of|define|meaning|word meaning)\b/.test(t))
    return await meaningTool(command);

  if (/\b(generate password|create password|password generator)\b/.test(t) ||
      /పాస్‌వర్డ్/.test(t)) return passwordTool(command);

  if (/^(wikipedia|search wikipedia)\b/.test(t))
    return await wikipediaTool(command);

  if (/^(open|launch)\s+(youtube|google)\b/.test(t) ||
      /^(ఓపెన్|తెరవు)\s*(యూట్యూబ్|గూగుల్)/.test(t))
    return openAppTool(command);

  if (/^(play|youtube|search youtube)\b/.test(t) ||
      /^(ప్లే|పాట ప్లే)/.test(t)) return youtubeTool(command);

  if (/\b(crypto price|bitcoin|ethereum|dogecoin|solana)\b/.test(t))
    return await cryptoTool(command);

  return null;
}

// 8. NORMAL GROQ CHAT
async function askGroq(question) {
  const cleanQuestion = String(question || "").trim();
  if (!cleanQuestion) return;

  if (sendBtn) sendBtn.disabled = true;
  let loading = null;

  try {
    const toolResult = await handleTools(cleanQuestion);
    if (toolResult !== null) {
      add("J.A.R.V.I.S: " + toolResult, "ai");
      conversation.push(
        { role: "user", content: cleanQuestion },
        { role: "assistant", content: toolResult }
      );
      conversation = conversation.slice(-40);
      saveMemory();
      speak(toolResult);
      return;
    }

    if (!getGroqKey()) return;

    loading = add("J.A.R.V.I.S: Thinking...", "ai");
    const history = conversation.slice(-12).map(message => ({
      role: message.role,
      content: message.content
    }));

    const answer = await groqRequest(
      CHAT_MODEL,
      [
        {
          role: "system",
          content:
            "You are J.A.R.V.I.S, a friendly intelligent AI assistant. " +
            "Address the user as Boss. Reply in Telugu when the user speaks Telugu. " +
            "Be accurate, concise, and admit uncertainty."
        },
        ...history,
        { role: "user", content: cleanQuestion }
      ],
      { temperature: 0.7, max_completion_tokens: 1024 }
    );

    conversation.push(
      { role: "user", content: cleanQuestion },
      { role: "assistant", content: answer }
    );
    conversation = conversation.slice(-40);
    saveMemory();

    if (loading) loading.textContent = "J.A.R.V.I.S: " + answer;
    speak(answer);
  } catch (error) {
    const message = "J.A.R.V.I.S ERROR: " + error.message;
    if (loading) loading.textContent = message;
    else add(message, "ai");
    console.error(error);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

// 9. GROQ VISION
async function askVision(base64, mimeType, question) {
  if (!getGroqKey()) return;
  const loading = add("J.A.R.V.I.S: Looking at your photo...", "ai");
  if (sendBtn) sendBtn.disabled = true;

  try {
    const imageDataUrl = `data:${mimeType};base64,${base64}`;
    const answer = await groqRequest(
      VISION_MODEL,
      [
        {
          role: "system",
          content:
            "You are J.A.R.V.I.S. Analyze the image carefully. " +
            "Explain what you see in simple Telugu. Address the user as Boss. " +
            "Do not guess details that are not visible."
        },
        {
          role: "user",
          content: [
            { type: "text", text: question || "ఈ ఫోటోలో ఏముంది? తెలుగులో వివరించండి." },
            { type: "image_url", image_url: { url: imageDataUrl } }
          ]
        }
      ],
      { temperature: 0.4, max_completion_tokens: 1024 }
    );

    conversation.push(
      { role: "user", content: "[Photo question] " + question },
      { role: "assistant", content: answer }
    );
    conversation = conversation.slice(-40);
    saveMemory();
    loading.textContent = "J.A.R.V.I.S: " + answer;
    speak(answer);
  } catch (error) {
    loading.textContent = "VISION ERROR: " + error.message;
    console.error(error);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

// 10. MICROPHONE — TELUGU SPEECH RECOGNITION
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (!micBtn) {
  console.warn("JARVIS: #mic-btn not found. Add the mic button in index.html.");
} else if (!SpeechRecognition) {
  micBtn.disabled = true;
  add("ఈ Browser Speech Recognition support చేయడం లేదు. Android Chromeలో HTTPS link ఓపెన్ చేయండి, Boss.", "ai");
} else {
  const recognition = new SpeechRecognition();
  recognition.lang = "te-IN";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    micBtn.textContent = "🔴";
    micBtn.disabled = true;
    add("J.A.R.V.I.S: వింటున్నాను Boss...", "ai");
  };

  recognition.onresult = event => {
    const spokenText = event.results?.[0]?.[0]?.transcript?.trim();
    if (!spokenText) {
      add("మీ మాట వినిపించలేదు Boss. మళ్ళీ ప్రయత్నించండి.", "ai");
      return;
    }
    add("YOU: " + spokenText, "user");
    askGroq(spokenText);
  };

  recognition.onerror = event => {
    const errors = {
      "not-allowed": "Microphone Permission Allow చేయండి.",
      "service-not-allowed": "Speech Recognition permission లేదు.",
      "no-speech": "మీ మాట వినిపించలేదు. మళ్ళీ ప్రయత్నించండి.",
      "audio-capture": "Microphone కనుగొనబడలేదు.",
      "network": "Speech Recognition network సమస్య.",
      "aborted": "Microphone ఆగిపోయింది."
    };
    add("MIC ERROR: " + (errors[event.error] || event.error), "ai");
  };

  recognition.onend = () => {
    micBtn.textContent = "🎙️";
    micBtn.disabled = false;
  };

  micBtn.addEventListener("click", () => {
    try {
      recognition.start();
    } catch (error) {
      add("MIC START ERROR: " + error.message, "ai");
    }
  });
}

// 11. SEND BUTTON + ENTER KEY
if (sendBtn && input) {
  sendBtn.addEventListener("click", () => {
    const question = input.value.trim();
    if (!question || sendBtn.disabled) return;
    add("YOU: " + question, "user");
    input.value = "";
    askGroq(question);
  });
}

if (input && sendBtn) {
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendBtn.click();
    }
  });
}

// 12. CLEAR MEMORY
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    if (!confirm("Are you sure you want to clear JARVIS memory?")) return;
    conversation = [];
    localStorage.removeItem("jarvis_m
