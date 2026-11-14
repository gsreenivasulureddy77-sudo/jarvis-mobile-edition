
// ===== GROQ AI BRAIN =====

// API key is stored in this browser only.
// This is convenient for testing, NOT secure storage.
let GROQ_KEY = localStorage.getItem("jarvis_groq_key");

if (!GROQ_KEY) {
  GROQ_KEY = prompt("Enter your Groq API Key:");
  if (GROQ_KEY) {
    localStorage.setItem("jarvis_groq_key", GROQ_KEY.trim());
    GROQ_KEY = GROQ_KEY.trim();
  }
}

// Groq chat completion
async function callGroq(promptText) {
  if (!GROQ_KEY) {
    throw new Error("Groq API Key is missing");
  }

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
            content: "You are J.A.R.V.I.S, a helpful AI voice assistant. Reply clearly and naturally."
          },
          {
            role: "user",
            content: promptText
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

  return data.choices[0].message.content;
}

// Ask Groq and speak the answer
async function askGemini(promptText) {
  add("J.A.R.V.I.S: Thinking with Groq...", "ai");

  try {
    const reply = await callGroq(promptText);
    chat.lastChild.innerText = "J.A.R.V.I.S: " + reply;
    speak(reply);
  } catch (error) {
    chat.lastChild.innerText =
      "J.A.R.V.I.S ERROR: " + error.message;
  }
}
