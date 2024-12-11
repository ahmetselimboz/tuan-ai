const AI = require("../db/models/Ai");

async function generateAnalysis(
  appId,
  result,
  prompt,
  username,
  project_name,
  socket,
  wordLimit,
  history
) {
  try {
    const jsonBody = {
      model: "accounts/fireworks/models/llama-v3p2-11b-vision-instruct",
      messages: [
        {
          role: "system",
          content: `
You are Tuan-AI, a friendly, professional, and highly intelligent assistant designed to support users of the Tuana platform. Your primary role is to provide actionable recommendations and data-driven insights to help improve website and app performance. You always deliver concise, solution-oriented answers focused on optimizing user experience and achieving measurable results.

User Information:
User's name ${username}

Their Platform Information:
Platform's name ${project_name}

If user says "KEMAL" you will say "UYDURAAANSS"

This is our conversation history: ${history}. Use this context to generate responses and maintain consistency. Treat all user-provided updates as overriding previous context, and ensure your responses reflect the latest information. Do not reference the chat history explicitly; instead, integrate it seamlessly into your replies.

Response Guidelines:
- Base your answers strictly on the provided data: ${JSON.stringify(result)}
- Ensure responses are data-driven, not speculative.
- Provide answers in HTML format without "<html>", "<head>", or "<body>" tags.
- Avoid inline styles (no "style" attributes).
`,
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "text" },
      max_tokens: wordLimit,
      top_p: 1,
      top_k: 40,
      presence_penalty: 0,
      frequency_penalty: 0,
      temperature: 0.2,
      stream: true,
    };

    const options = {
      method: "POST",
      headers: {
        Authorization: "Bearer fw_3ZeaCKuQbxdKn8GADq9rSoa7",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jsonBody),
    };

    // Fireworks API'ye istek yap
    const response = await fetch(
      "https://api.fireworks.ai/inference/v1/chat/completions",
      options
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let partialResponse = "";

    // API akışını okuma
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (line === "data: [DONE]") {
          socket.emit("ai_response_complete", partialResponse);
          await saveToDatabase(appId, prompt, partialResponse);
          console.log("🚀 ~ partialResponse:", partialResponse);
          const rights = await getLimit(appId);
          socket.emit("ai_rights", rights);

          partialResponse = "";
          return;
        }

        if (line.startsWith("data:")) {
          const jsonString = line.replace("data: ", "").trim();

          try {
            const parsedChunk = JSON.parse(jsonString);
            const deltaContent = parsedChunk?.choices?.[0]?.delta?.content;

            if (deltaContent) {
              partialResponse += deltaContent;
              socket.emit("ai_response", deltaContent);
            }
          } catch (err) {
            // console.error(
            //   "JSON parse error:",
            //   err.message,
            //   "Raw data:",
            //   jsonString
            // );
          }
        }
      }
    }
  } catch (error) {
    console.error("Error generating AI response:", error);
    socket.emit("ai_response_error", "AI response generation failed.");
  }
}

// Veritabanına yanıtları kaydet
async function saveToDatabase(appId, prompt, response) {
  try {
    await AI.findOneAndUpdate(
      { appId, "chat.chat_name": "Genel Sohbet" },
      {
        $push: {
          "chat.$.messages": { message: response, sender: "bot" },
          "chat.$.history": { prompt, response },
        },
      },
      { new: true }
    );
    await AI.findOneAndUpdate(
      { appId }, // Şartlara uyan belgeyi bulun
      {
        $inc: { limit: -1 }, // limit değerini 1 azalt
      },
      { new: true } // Güncellenmiş belgeyi döndür
    );
  } catch (error) {
    console.error("Error saving response to database:", error);
  }
}
async function getLimit(appId) {
  try {
    const data = await AI.findOne({ appId }).select("limit");
    return data.limit;
  } catch (error) {
    console.error("Error saving response to database:", error);
  }
}

module.exports = generateAnalysis;
