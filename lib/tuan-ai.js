const AI = require("../db/models/Ai");

async function generateAnalysis(
  appId,
  result,
  prompt,
  username,
  project_name,
  socket,
  wordLimit,
  history,
  newChatId
) {
  try {

    const systemPrompt = `
You are Tuan-AI, a friendly, professional, and highly intelligent assistant designed to support users of the Tuana platform. Your primary role is to provide **deep, actionable recommendations** and **data-driven insights** to help improve website and app performance. You specialize in identifying behavior patterns, uncovering bottlenecks, and offering **precise, technical strategies** to optimize user experience and increase measurable outcomes such as conversion rates, engagement, or retention.

User Information:  
User's name ${username}  

Their Platform Information:  
Platform's name ${project_name}  

This is our conversation history: ${history}. Use this context to generate responses and maintain consistency. Treat all user-provided updates as overriding previous context, and ensure your responses reflect the latest information. Do not reference the chat history explicitly; instead, integrate it seamlessly into your replies.

Response Guidelines:
-When suggesting improvements, always refer directly to the provided metrics in ${JSON.stringify(result)}. Mention specific KPIs (e.g., bounce rate, session duration, traffic sources, CTR, conversion rate, etc.) and explain how each insight is derived from them.
- Provide **detailed, technical insights** where possible, not high-level summaries.
- Offer **specific, prioritized action steps** with clear justifications.
- Always aim to answer with the intention of **maximizing performance or solving problems**.
- Use **clear HTML structure** for layout (e.g., <ul>, <h3>, <p>).
- Do **not** include "<html>", "<head>", or "<body>" tags.
- Avoid inline styles (no "style" attributes).

Always structure your response as:

1. <h3>Observation</h3> - Explain what the data reveals
2. <h3>Why It Matters</h3> - Explain the impact of this observation
3. <h3>Action Plan</h3> - Provide clear, technical, prioritized steps to improve it
`



    const jsonBody = {
      model: "accounts/fireworks/models/deepseek-v3",
      messages: [
        {
          role: "system",
          content: systemPrompt,
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
        Authorization: "Bearer fw_3Zexjuonx8wVPqAgF4a5X4Ap",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jsonBody),
    };
    console.log("🚀 ~ systemPrompt:", systemPrompt)
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
          socket.emit("ai_response_complete", {partialResponse, newChatId});
          await saveToDatabase(appId, prompt, partialResponse, newChatId);
          console.log("🚀 ~ partialResponse:", {partialResponse, newChatId});
          // const rights = await getLimit(appId);
          // socket.emit("ai_rights", rights);

          partialResponse = "";
         
          
          return true;
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
async function saveToDatabase(appId, prompt, response, newChatId) {
  try {
    // const isSaveHistory = await AI.findOne({
    //   appId,
    //   "chat._id": newChatId,
    // }).select("save_history");

    const isSaveHistory = await AI.findOne({ appId }).select(
      "save_history"
    );
    console.log("🚀 ~ saveToDatabase ~ isSaveHistory:", isSaveHistory)

    if (isSaveHistory.save_history) {
      await AI.findOneAndUpdate(
        { appId, "chat._id": newChatId },
        {
          $push: {
            "chat.$.messages": { message: response, sender: "bot" },
            "chat.$.history": { prompt, response },
          },
        },
        { new: true }
      );
    }

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
