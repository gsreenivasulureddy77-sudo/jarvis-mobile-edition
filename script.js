
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");
const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");

const GROQ_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const CHAT_MODEL = "openai/gpt-oss-20b";
const VISION_MODEL = "qwen/qwen3.8-27b";

let GROQ_KEY = localStorage.getItem("jarvis_groq_key");
let conversation = [];

try {
  conversation = JSON.parse(
    localStorage.getItem("jarvis_memory") || "[]"
  );

  if (!Array.isArray(conversation)) {
    conversation = [];
  }
} catch {
  conversation = [];
}

// SAVE MEMORY
function saveMemory() {
  localStorage.setItem(
    "jarvis_memory",
    JSON.stringify(conversation)
  );
}

// SHOW MESSAGE
function add(message, who) {
  const div = document.createElement("div");
  div.className = "msg " + who;
  div.textContent = message;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  return div;
}

// VOICE OUTPUT
function speak(message) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(message);
  speech.lang = "te-IN";
  speech.rate = 1;
  speech.pitch = 0.9;

  window.speechSynthesis.speak(speech);
}

// API KEY
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

// SHOW OLD CONVERSATION
conversation.forEach(message => {
  if (message.role === "user") {
    add("YOU: " + message.content, "user");
  } else if (message.role === "assistant") {
    add("J.A.R.V.I.S: " + message.content, "ai");
  }
});

// NORMAL GROQ CHAT
async function askGroq(question) {
  if (!getGroqKey()) return;

  const loading = add(
    "J.A.R.V.I.S: Thinking...",
    "ai"
  );

  if (sendBtn) sendBtn.disabled = true;

  conversation.push({
    role: "user",
    content: question
  });

  saveMemory();

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
    loading.textContent =
      "J.A.R.V.I.S ERROR: " + error.message;

    conversation.pop();
    saveMemory();

  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

// MICROPHONE
const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (SpeechRecognition && micBtn) {
  const rec = new SpeechRecognition();

  rec.lang = "te-IN";
  rec.continuous = false;
  rec.interimResults = false;

  rec.onstart = () => {
    micBtn.textContent = "🔴 Listening...";
    micBtn.disabled = true;
  };

  rec.onresult = event => {
    const spokenText =
      event.results[0][0].transcript;

    add("YOU: " + spokenText, "user");

    askGroq(spokenText);
  };

  rec.onerror = event => {
    add("MIC ERROR: " + event.error, "ai");
  };

  rec.onend = () => {
    micBtn.textContent = "🎙️";
    micBtn.disabled = false;
  };

  micBtn.addEventListener("click", () => {
    try {
      rec.start();
    } catch (error) {
      add("Microphone is already listening.", "ai");
    }
  });

} else if (micBtn) {
  micBtn.disabled = true;

  add(
    "Speech recognition is not supported in this browser.",
    "ai"
  );
}

// SEND BUTTON
if (sendBtn && input) {
  sendBtn.addEventListener("click", () => {
    const question = input.value.trim();

    if (!question || sendBtn.disabled) return;

    add("YOU: " + question, "user");

    input.value = "";

    askGroq(question);
  });
}

// ENTER KEY
if (input && sendBtn) {
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendBtn.click();
    }
  });
}

// CLEAR MEMORY
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    const confirmClear = confirm(
      "Are you sure you want to clear JARVIS memory?"
    );

    if (!confirmClear) return;

    conversation = [];

    localStorage.removeItem("jarvis_memory");

    chat.innerHTML = "";

    add(
      "J.A.R.V.I.S: Memory cleared successfully, Boss!",
      "ai"
    );

    window.speechSynthesis?.cancel();
  });
}

// ===== GROQ AI VISION =====

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
                  url:
                    "data:" + mimeType + ";base64," + base64
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
    loading.textContent =
      "VISION ERROR: " + error.message;

  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

// CAMERA BUTTON
if (camBtn && imgInput) {
  camBtn.addEventListener("click", () => {
    imgInput.click();
  });

  // WHEN PHOTO IS SELECTED
  imgInput.addEventListener("change", () => {
    const file = imgInput.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      add("Please select an image file.", "ai");
      imgInput.value = "";
      return;
    }

    // Keep image below 10 MB
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

      const question =
        input.value.trim() ||
        "ఈ ఫోటోలో ఏముంది? తెలుగులో వివరించు.";

      input.value = "";

      add(
        "YOU: Photo selected - " + file.name,
        "user"
      );

      askVision(base64, file.type, question);

      imgInput.value = "";
    };

    reader.onerror = () => {
      add("Could not read the selected photo.", "ai");
      imgInput.value = "";
    };

    reader.readAsDataURL(file);
  });
}

// JARVIS START MESSAGE
add(
  "J.A.R.V.I.S: Groq AI initialized. How may I assist you, Boss?",
  "ai"
);
