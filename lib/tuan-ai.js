async function generateAnalysis(result, prompt, username, project_name, socket) {
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

Response Guidelines:

Platform-related Questions:
When users ask about their platform, base your answers strictly on the provided data:

Data: ${JSON.stringify(result)}
Carefully review all detected issues in the data.
Accurately identify specific problems.
Provide definitive, actionable, and relevant recommendations.
Ensure that your responses are data-driven and never speculative. Avoid any assumptions beyond the provided dataset.

Casual or Friendly Questions:
If users ask casual questions (e.g., "How are you?"), respond warmly and cheerfully to maintain a positive connection. 

Unrelated or Off-topic Questions:
Politely decline to answer non-Tuana-related questions. 

            -Give your answers body in html format
            -Don't use the <html>, <head> and <body> tags
            -Don't use "style" attribute in tags ever!
            `,
        },

        {
          role: "user",
          content: `${prompt}

       
                  `,
        },
      ],
      response_format: {
        type: "text",
      },
      max_tokens: 4096,
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

    const response = await fetch(
      "https://api.fireworks.ai/inference/v1/chat/completions",
      options
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let done = false;
    let partialResponse = "";

    // Streaming yanıtlarını oku
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        //console.log("Raw chunk:", chunk);

        // Gelen veriyi satırlara ayır ve boş satırları temizle
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        lines.forEach((line) => {
          if (line === "data: [DONE]") {
            console.log("Response completed.");
            socket.emit("ai_response_complete", partialResponse); // Tam yanıt gönder
            partialResponse = ""; // Birleştirilmiş yanıtı sıfırla
            return;
          }

          if (line.startsWith("data:")) {
            // "data:" kısmını kaldır ve JSON'u kontrol et
            const jsonString = line.replace("data: ", "").trim();

            try {
              // JSON verisini parse etmeye çalış
              const parsedChunk = JSON.parse(jsonString);

              const delta = parsedChunk?.choices?.[0]?.delta;

              if (delta?.content) {
                // İçeriği birleştir ve socket ile gönder
                partialResponse += delta.content;
                console.log("🚀 ~ lines.forEach ~ delta.content:", delta.content)
                socket.emit("ai_response", delta.content);
              } else if (delta?.role) {
                // Eğer sadece "role" varsa, bu içeriği atla
                console.log(
                  "Role detected, no content to process:",
                  delta.role
                );
              }
            } catch (err) {
              // JSON.parse hatalarını yakala
              console.error(
                "Chunk JSON parse error:",
                err.message,
                "Raw data:",
                jsonString
              );

              // Hatalı JSON verisini kaydet veya düzeltme ekle
              if (!jsonString.endsWith("}")) {
                console.warn("Incomplete JSON detected. Attempting to fix...");
                // Kapatma süslü parantez ekleyerek düzeltme yap
                try {
                  const fixedJsonString = jsonString + "}";
                  const fixedParsedChunk = JSON.parse(fixedJsonString);
                  console.log(
                    "Fixed JSON parsed successfully:",
                    fixedParsedChunk
                  );
                } catch (fixErr) {
                  console.error("Failed to fix JSON:", fixErr.message);
                }
              }
            }
          }
        });
      }
    }
  } catch (error) {
    console.error("Error generating completion:", error);

    // Hata durumunda socket'e hata mesajı gönder
    socket.emit("ai_response_error", "AI response generation failed.");
  }
}

module.exports = generateAnalysis;
