
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");

let GROQ_KEY = localStorage.getItem("jarvis_groq_key");

function add(message, who) {
  const div = document.createElement("div");
  div.className = "msg " + who;
  div.textContent = message;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function speak(message) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(message);
  speech.lang = "en-US";
  speech.rate = 1;

  window.speechSynthesis.speak(speech);
}

async function askGroq(question) {
  if (!GROQ_KEY) {
    const key = prompt("Enter your Groq API Key:");

    if (!key || !key.trim()) {
      add("Please enter your Groq API Key.", "ai");
      return;
    }

    GROQ_KEY = key.trim();
    localStorage.setItem("jarvis_groq_key", GROQ_KEY);
  }

  const loading = document.createElement("div");
  loading.className = "msg ai";
  loading.textContent = "J.A.R.V.I.S: Thinking...";
  chat.appendChild(loading);

  sendBtn.disabled = true;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + GROQ_KEY
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [
            {
              role: "system",
              content: "You are J.A.R.V.I.S, a friendly intelligent AI assistant. Address the user as Boss."
            },
            {
              role: "user",
              content: question
            }
          ],
          temperature: 0.7,
          max_completion_tokens: 1024
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.message || "Groq API request failed"
      );
    }

    const answer = data.choices[0].message.content;

    loading.textContent = "J.A.R.V.I.S: " + answer;
    speak(answer);

  } catch (error) {
    loading.textContent =
      "J.A.R.V.I.S ERROR: " + error.message;

  } finally {
    sendBtn.disabled = false;
  }
}

// ===== MICROPHONE VOICE INPUT =====

const micBtn = document.getElementById("mic-btn");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition && micBtn) {
  const rec = new SpeechRecognition();

  rec.lang = "te-IN";
  rec.continuous = false;
  rec.interimResults = false;

  rec.onstart = () => {
    micBtn.textContent = "🔴 Listening...";
    micBtn.disabled = true;
  };

  rec.onresult = (event) => {
    const spokenText = event.results[0][0].transcript;

    add("YOU: " + spokenText, "user");
    askGroq(spokenText);
  };

  rec.onerror = (event) => {
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
  add("Speech recognition is not supported in this browser.", "ai");
}

// ===== TEXT SEND BUTTON =====

sendBtn.addEventListener("click", () => {
  const question = input.value.trim();

  if (!question) return;

  add("YOU: " + question, "user");
  input.value = "";

  askGroq(question);
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendBtn.click();
  }
});

add(
  "J.A.R.V.I.S: Groq AI initialized. How may I assist you, Boss?",
  "ai"
);
