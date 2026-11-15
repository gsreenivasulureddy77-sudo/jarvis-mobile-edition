"use strict";

// ==========================================
// J.A.R.V.I.S - GROWTH OS TELUGU
// EPISODE 06 - COMPLETE EDITION
// ==========================================

// 1. HTML ELEMENTS
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");
const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");

// 2. API SETTINGS
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const CHAT_MODEL = "openai/gpt-oss-20b";
const VISION_MODEL = "qwen/qwen3.8-27b";

let GROQ_KEY = localStorage.getItem("jarvis_groq_key");
let conversation = [];

try {
  conversation = JSON.parse(
    localStorage.getItem("jarvis_memory") || "[]"
  );
  if (!Array.isArray(conversation)) conversation = [];
} catch {
  conversation = [];
}

// 3. MEMORY
function saveMemory() {
  localStorage.setItem(
    "jarvis_memory",
    JSON.stringify(conversation)
  );
}

// 4. DISPLAY MESSAGE
function add(message, who) {
  if (!chat) return null;

  const div = document.createElement("div");
  div.className = "msg " + who;
  div.textContent = message;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  return div;
}

// 5. VOICE OUTPUT
function speak(message) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(message);
  speech.lang = "te-IN";
  speech.rate = 1;
  speech.pitch = 0.9;

  window.speechSynthesis.speak(speech);
}

// 6. API KEY
function getGroqKey() {
  if (GROQ_KEY) return true;

  const key = prompt("Enter your Groq API Key:");

  if (!key || !key.trim()) {
    add("Please enter your Groq API Key.", "ai");
    return false;
  }

  GROQ_KEY = key.trim();
  localStorage.setItem("jarvis_groq_key", GROQ_KEY);

  return true;
}

// 7. RESTORE OLD CONVERSATION
conversation.forEach(message => {
  if (message.role === "user") {
    add("YOU: " + message.content, "user");
  } else if (message.role === "assistant") {
    add("J.A.R.V.I.S: " + message.content, "ai");
  }
});

// ==========================================
// EPISODE 06 - 15 TOOLS
// ==========================================

// HELPER: FETCH JSON
async function fetchJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Service unavailable: " + response.status);
  }

  return response.json();
}

// HELPER: LOCATION
function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => resolve({
        lat: position.coords.latitude,
        lon: position.coords.longitude
      }),
      reject,
      { timeout: 10000 }
    );
  });
}

// TOOL 1: TIME
function timeTool() {
  return "ప్రస్తుతం సమయం " +
    new Date().toLocaleTimeString("te-IN") +
    ", Boss.";
}

// TOOL 2: WEATHER
async function weatherTool() {
  try {
    const location = await getLocation();

    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${location.lat}` +
      `&longitude=${location.lon}` +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature" +
      "&timezone=auto";

    const data = await fetchJSON(url);
    const current = data.current;

    return `ప్రస్తుత ఉష్ణోగ్రత ${current.temperature_2m}°C.
తేమ ${current.relative_humidity_2m}%.
అనుభూతి ఉష్ణోగ్రత ${current.apparent_temperature}°C.`;

  } catch {
    return "Weather సమాచారం పొందలేకపోయాను. Location Permission ఇవ్వండి, Boss.";
  }
}

// TOOL 3: TIMER
function timerTool(text) {
  const match = text.match(
    /(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/i
  );

  if (!match) {
    return "ఉదాహరణకు Set timer for 2 minutes అని చెప్పండి.";
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multiplier =
    /^(seconds?|secs?)/.test(unit) ? 1000 :
    /^(hours?|hrs?)/.test(unit) ? 3600000 :
    60000;

  const duration = amount * multiplier;

  if (duration > 86400000) {
    return "గరిష్టంగా 24 గంటల Timer మాత్రమే పెట్టగలను.";
  }

  setTimeout(() => {
    const message = "Boss, మీ Timer పూర్తయింది!";
    add("J.A.R.V.I.S: " + message, "ai");
    speak(message);
  }, duration);

  return `${amount} ${unit} Timer సెట్ చేశాను, Boss.`;
}

// TOOL 4: DICE / COIN
function diceCoinTool(text) {
  const t = text.toLowerCase();

  if (/coin|flip|కాయిన్/.test(t)) {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    return "Coin Flip Result: " + result;
  }

  const result = Math.floor(Math.random() * 6) + 1;
  return "Dice Result: " + result;
}

// TOOL 5: RANDOM JOKE
async function jokeTool() {
  try {
    const data = await fetchJSON(
      "https://v2.jokeapi.dev/joke/Any?safe-mode"
    );

    return data.type === "single"
      ? data.joke
      : data.setup + "\n" + data.delivery;

  } catch {
    return "Joke service ప్రస్తుతం పనిచేయడం లేదు.";
  }
}

// TOOL 6: DAILY QUOTE
async function quoteTool() {
  try {
    const data = await fetchJSON(
      "https://dummyjson.com/quotes/random"
    );

    return `Daily Quote: ${data.quote}
Author: ${data.author}`;

  } catch {
    return "Quote పొందలేకపోయాను.";
  }
}

// TOOL 7: TECH NEWS
async function newsTool() {
  try {
    const data = await fetchJSON(
      "https://hn.algolia.com/api/v1/search?tags=front_page"
    );

    const stories = data.hits.slice(0, 5);

    if (!stories.length) return "News అందుబాటులో లేదు.";

    return "Top Tech News:\n" +
      stories.map((item, index) =>
        `${index + 1}. ${item.title}`
      ).join("\n");

  } catch {
    return "Tech News పొందలేకపోయాను.";
  }
}

// TOOL 8: TELUGU TRANSLATOR
async function translateTool(text) {
  const query = text.replace(
    /^(translate|translate this|అనువదించు)\s*/i,
    ""
  ).trim();

  if (!query) {
    return "అనువదించాల్సిన వాక్యం చెప్పండి.";
  }

  try {
    const url =
      "https://api.mymemory.translated.net/get?q=" +
      encodeURIComponent(query) +
      "&langpair=en|te";

    const data = await fetchJSON(url);

    return "తెలుగు అనువాదం: " +
      data.responseData.translatedText;

  } catch {
    return "Translation service error.";
  }
}

// TOOL 9: CURRENCY EXCHANGE
async function currencyTool(text) {
  const match = text.match(
    /(\d+(?:\.\d+)?)\s*(USD|INR|EUR|GBP|JPY)\s*(?:to|in|into)\s*(USD|INR|EUR|GBP|JPY)/i
  );

  if (!match) {
    return "ఉదాహరణ: 100 USD to INR అని అడగండి.";
  }

  const amount = Number(match[1]);
  const from = match[2].toUpperCase();
  const to = match[3].toUpperCase();

  try {
    const data = await fetchJSON(
      `https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`
    );

    return `${amount} ${from} = ${(amount * data.rates[to]).toFixed(2)} ${to}`;

  } catch {
    return "Currency service error.";
  }
}

// TOOL 10: WORD MEANING
async function meaningTool(text) {
  const word = text.replace(
    /^(meaning of|define|meaning|word meaning)\s*/i,
    ""
  ).trim();

  if (!word) return "ఏ పదానికి అర్థం కావాలో చెప్పండి.";

  try {
    const data = await fetchJSON(
      "https://api.dictionaryapi.dev/api/v2/entries/en/" +
      encodeURIComponent(word)
    );

    const meanings = data[0].meanings || [];

    return word + ":\n" +
      meanings.slice(0, 2).map(item =>
        item.partOfSpeech + ": " +
        (item.definitions[0]?.definition || "")
      ).join("\n");

  } catch {
    return "Word meaning కనుగొనలేకపోయాను.";
  }
}

// TOOL 11: PASSWORD GENERATOR
function passwordTool(text) {
  const match = text.match(/\b(\d{1,2})\b/);

  const length = match
    ? Math.min(64, Math.max(8, Number(match[1])))
    : 16;

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
    "abcdefghijklmnopqrstuvwxyz" +
    "0123456789!@#$%^&*";

  const random = new Uint32Array(length);
  crypto.getRandomValues(random);

  let password = "";

  for (let i = 0; i < length; i++) {
    password += chars[random[i] % chars.length];
  }

  return "Generated Password: " + password;
}

// TOOL 12: WIKIPEDIA SEARCH
async function wikipediaTool(text) {
  const query = text.replace(
    /^(wikipedia|search wikipedia|search)\s*/i,
    ""
  ).trim();

  if (!query) {
    return "Wikipediaలో ఏ విషయం వెతకాలో చెప్పండి.";
  }

  try {
    const data = await fetchJSON(
      "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
      encodeURIComponent(query) +
      "&format=json&origin=*"
    );

    const result = data.query.search[0];

    if (!result) return "ఫలితాలు లభించలేదు.";

    const details = await fetchJSON(
      "https://en.wikipedia.org/api/rest_v1/page/summary/" +
      encodeURIComponent(result.title)
    );

    return `${result.title}
${details.extract || "వివరాలు లేవు."}
https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, "_"))}`;

  } catch {
    return "Wikipedia service error.";
  }
}

// TOOL 13: OPEN APPS
function openAppTool(text) {
  const t = text.toLowerCase().trim();

  if (/youtube|యూట్యూబ్/.test(t)) {
    window.location.href = "https://www.youtube.com/";
    return "YouTube తెరుస్తున్నాను, Boss.";
  }

  if (/google|గూగుల్/.test(t)) {
    window.location.href = "https://www.google.com/";
    return "Google తెరుస్తున్నాను, Boss.";
  }

  return null;
}

// TOOL 14: YOUTUBE SONG SEARCH
function youtubeTool(text) {
  let query = text.trim();

  query = query.replace(
    /^(play|youtube|search youtube|ప్లే)\s*/i,
    ""
  );

  query = query.replace(
    /^(a song|song|పాట)\s*/i,
    ""
  );

  query = query.replace(
    /^(and play song|play song|పాట ప్లే చేయి)\s*/i,
    ""
  );

  query = query.trim();

  if (!query) {
    return "ఏ పాట వెతకాలో చెప్పండి, Boss.";
  }

  window.location.href =
    "https://www.youtube.com/results?search_query=" +
    encodeURIComponent(query);

  return `${query} కోసం YouTubeలో వెతుకుతున్నాను.`;
}

// TOOL 15: CRYPTO PRICE
async function cryptoTool(text) {
  const t = text.toLowerCase();

  let coin = "bitcoin";

  if (/\b(ethereum|eth)\b/.test(t)) {
    coin = "ethereum";
  } else if (/\b(dogecoin|doge)\b/.test(t)) {
    coin = "dogecoin";
  } else if (/\b(solana|sol)\b/.test(t)) {
    coin = "solana";
  }

  try {
    const data = await fetchJSON(
      "https://api.coingecko.com/api/v3/simple/price?ids=" +
      coin + "&vs_currencies=usd,inr"
    );

    if (!data[coin]) {
      return "Crypto price అందుబాటులో లేదు.";
    }

    return `${coin.toUpperCase()} Price:
USD: $${data[coin].usd}
INR: ₹${data[coin].inr}`;

  } catch {
    return "Crypto service error.";
  }
}

// ==========================================
// 8. MAIN TOOL ROUTER
// ==========================================

async function handleTools(text) {
  const t = text.toLowerCase().trim();

  try {

    // TIME
    if (
      /\b(what time|current time|time now|time)\b/.test(t) ||
      /సమయం|టైమ్/.test(t)
    ) return timeTool();

    // WEATHER
    if (
      /\b(weather|temperature)\b/.test(t) ||
      /వాతావరణం/.test(t)
    ) return await weatherTool();

    // TIMER
    if (/\btimer\b/.test(t) || /టైమర్/.test(t)) {
      return timerTool(text);
    }

    // DICE / COIN
    if (
      /\b(dice|roll dice|coin|flip coin)\b/.test(t) ||
      /డైస్|కాయిన్/.test(t)
    ) return diceCoinTool(text);

    // JOKE
    if (
      /\b(joke|tell me a joke)\b/.test(t) ||
      /జోక్/.test(t)
    ) return await jokeTool();

    // QUOTE
    if (
      /\b(quote|daily quote|motivation quote)\b/.test(t) ||
      /కోట్|ప్రేరణ/.test(t)
    ) return await quoteTool();

    // TECH NEWS
    if (
      /\b(tech news|technology news)\b/.test(t) ||
      /టెక్ న్యూస్/.test(t)
    ) return await newsTool();

    // TRANSLATOR
    if (
      /^translate\b/.test(t) ||
      /^(అనువదించు|తెలుగులోకి అనువదించు)/.test(t)
    ) return await translateTool(text);

    // CURRENCY
    if (/\b(usd|inr|eur|gbp|jpy)\b.*\b(to|in|into)\b/i.test(t)) {
      return await currencyTool(text);
    }

    // WORD MEANING
    if (/^(meaning of|define|meaning|word meaning)\b/.test(t)) {
      return await meaningTool(text);
    }

    // PASSWORD
    if (
      /\b(generate password|create password|password generator)\b/.test(t) ||
      /పాస్‌వర్డ్/.test(t)
    ) return passwordTool(text);

    // WIKIPEDIA
    if (/^(wikipedia|search wikipedia)\b/.test(t)) {
      return await wikipediaTool(text);
    }

    // OPEN YOUTUBE / GOOGLE
    if (
      /^(open|launch)\s+(youtube|google)\b/.test(t) ||
      /^(ఓపెన్|తెరవు)\s*(యూట్యూబ్|గూగుల్)/.test(t)
    ) {
      return openAppTool(text);
    }

    // YOUTUBE SONGS
    if (
      /^(play|youtube|search youtube)\b/.test(t) ||
      /^(ప్లే|పాట ప్లే)/.test(t)
    ) {
      return youtubeTool(text);
    }

    // CRYPTO
    if (
      /\b(crypto price|bitcoin|ethereum|dogecoin|solana)\b/.test(t)
    ) return await cryptoTool(text);

    // NO TOOL MATCH
    return null;

  } catch (error) {
    console.error("Tool Error:", error);

    return "క్షమించండి Boss, ఆ Tool ప్రస్తుతం పనిచేయడం లేదు.";
  }
}

// ==========================================
// 9. NORMAL GROQ AI CHAT
// ==========================================

async function askGroq(question) {
  const toolResult = await handleTools(question);

  if (toolResult !== null) {
    add("J.A.R.V.I.S: " + toolResult, "ai");

    conversation.push(
      { role: "user", content: question },
      { role: "assistant", content: toolResult }
    );

    saveMemory();
    speak(toolResult);
    return;
  }

  if (!getGroqKey()) return;

  const loading = add("J.A.R.V.I.S: Thinking...", "ai");

  if (sendBtn) sendBtn.disabled = true;

  conversation.push({
    role: "user",
    content: question
  });

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + GROQ_KEY
      },

      body: JSON.stringify({
        model: CHAT_MODEL,

        messages: [
          {
            role: "system",
            content:
              "You are J.A.R.V.I.S, a friendly intelligent AI assistant. Address the user as Boss. Reply in Telugu when the user speaks Telugu."
          },
          ...conversation
        ],

        temperature: 0.7,
        max_completion_tokens: 1024
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.message || "Groq API request failed"
      );
    }

    const answer = data.choices[0].message.content;

    conversation.push({
      role: "assistant",
      content: answer
    });

    saveMemory();

    loading.textContent = "J.A.R.V.I.S: " + answer;

    speak(answer);

  } catch (error) {
    loading.textContent = "J.A.R.V.I.S ERROR: " + error.message;

    conversation.pop();
    saveMemory();

  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

// ==========================================
// 10. MICROPHONE - FIXED VERSION
// ==========================================

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (SpeechRecognition && micBtn) {
  const rec = new SpeechRecognition();

  rec.lang = "te-IN";
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    micBtn.textContent = "🔴 Listening...";
    micBtn.disabled = true;
    add("J.A.R.V.I.S: వింటున్నాను Boss...", "ai");
  };

  rec.onresult = event => {
    const spokenText =
      event.results[0][0].transcript.trim();

    if (!spokenText) {
      add("ఏమీ వినిపించలేదు Boss.", "ai");
      return;
    }

    add("YOU: " + spokenText, "user");
    askGroq(spokenText);
  };

  rec.onerror = event => {
    console.error("Microphone Error:", event.error);

    const errors = {
      "not-allowed":
        "Microphone Permission ఇవ్వండి Boss.",
      "service-not-allowed":
        "Speech Recognition Permission లేదు.",
      "no-speech":
        "మీ మాట వినిపించలేదు Boss. మళ్ళీ ప్రయత్నించండి.",
      "audio-capture":
        "Microphone కనుగొనబడలేదు.",
      "network":
        "Internet లేదా Speech Service సమస్య ఉంది.",
      "aborted":
        "Microphone ఆగిపోయింది."
    };

    add(
      "MIC ERROR: " +
      (errors[event.error] || event.error),
      "ai"
    );
  };

  rec.onend = () => {
    micBtn.textContent = "🎙️";
    micBtn.disabled = false;
  };

  micBtn.addEventListener("click", () => {
    try {
      rec.start();
    } catch (error) {
      console.error(error);
      add("MIC START ERROR: " + error.message, "ai");
    }
  });

} else if (micBtn) {
  micBtn.disabled = true;
  add(
    "మీ Browser Speech Recognition కు Support ఇవ్వడం లేదు.",
    "ai"
  );
}


// ==========================================
// 11. SEND BUTTON
// ==========================================

if (sendBtn && input) {

  sendBtn.addEventListener("click", () => {

    const question = input.value.trim();

    if (!question || sendBtn.disabled) return;

    add("YOU: " + question, "user");

    input.value = "";

    askGroq(question);
  });
}

// ==========================================
// 12. ENTER KEY
// ==========================================

if (input && sendBtn) {

  input.addEventListener("keydown", event => {

    if (event.key === "Enter") {
      event.preventDefault();
      sendBtn.click();
    }

  });
}

// ==========================================
// 13. CLEAR MEMORY
// ==========================================

if (clearBtn) {

  clearBtn.addEventListener("click", () => {

    const confirmClear = confirm(
      "Are you sure you want to clear JARVIS memory?"
    );

    if (!confirmClear) return;

    conversation = [];

    localStorage.removeItem("jarvis_memory");

    if (chat) chat.innerHTML = "";

    add(
      "J.A.R.V.I.S: Memory cleared successfully, Boss!",
      "ai"
    );

    window.speechSynthesis?.cancel();

  });
}

// ==========================================
// 14. GROQ AI VISION
// ==========================================

async function askVision(base64, mimeType, question) {

  if (!getGroqKey()) return;

  const loading = add(
    "J.A.R.V.I.S: Looking at your photo...",
    "ai"
  );

  if (sendBtn) sendBtn.disabled = true;

  try {

    const response = await fetch(GROQ_URL, {

      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + GROQ_KEY
      },

      body: JSON.stringify({

        model: VISION_MODEL,

        messages: [
          {
            role: "system",
            content:
              "You are J.A.R.V.I.S. Look carefully at the image and explain what you see in simple Telugu. Address the user as Boss. If something is unclear, say so honestly."
          },

          {
            role: "user",

            content: [
              {
                type: "text",
                text: question
              },

              {
                type: "image_url",

                image_url: {
                  url: "data:" + mimeType + ";base64," + base64
                }
              }
            ]
          }
        ],

        temperature: 0.4,
        max_completion_tokens: 1024

      })

    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.message || "Vision request failed"
      );
    }

    const answer = data.choices[0].message.content;

    conversation.push(
      {
        role: "user",
        content: "[Photo question] " + question
      },
      {
        role: "assistant",
        content: answer
      }
    );

    saveMemory();

    loading.textContent = "J.A.R.V.I.S: " + answer;

    speak(answer);

  } catch (error) {

    loading.textContent = "VISION ERROR: " + error.message;

  } finally {

    if (sendBtn) sendBtn.disabled = false;

  }
}

// ==========================================
// 15. CAMERA BUTTON
// ==========================================

if (camBtn && imgInput) {

  camBtn.addEventListener("click", () => {
    imgInput.click();
  });

  imgInput.addEventListener("change", () => {

    const file = imgInput.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {

      add("Please select an image file.", "ai");

      imgInput.value = "";

      return;
    }

    if (file.size > 10 * 1024 * 1024) {

      add(
        "Boss, please select a photo smaller than 10 MB.",
        "ai"
      );

      imgInput.value = "";

      return;
    }

    const reader = new FileReader();

    reader.onload = () => {

      const base64 = reader.result.split(",")[1];

      cons
