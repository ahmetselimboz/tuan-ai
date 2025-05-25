const AI = require("../../db/models/Ai");

async function generateSEOAI(appId, seoData, whatsFor) {
  try {
    //console.log("🚀 ~ generateSEOAI ~ seoData:", seoData);
    //console.log("🚀 ~ generateSEOAI ~ appId:", appId);

    // Get word limit and other properties from database
    const dbProperties = await getProperties(appId);

    // Construct the payload for the Fireworks API
    const jsonBody = createJsonBody(seoData, dbProperties.wordLimit, whatsFor);

    const options = {
      method: "POST",
      headers: {
        Authorization: "Bearer fw_3ZeaCKuQbxdKn8GADq9rSoa7",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jsonBody),
    };

    // Send request to Fireworks API
    const response = await fetch(
      "https://api.fireworks.ai/inference/v1/chat/completions",
      options
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const jsonResponse = await response.json();
    const message = jsonResponse.choices[0]?.message?.content
    console.log("🚀 ~ generateSEOAI ~ message:", message)
    const aiMessage = parseAIMessage(message);
    //const aiMessage = message

    if (!aiMessage) {
      throw new Error("AI message content not found in the response.");
    }

    console.log("AI Message:", aiMessage);

    return aiMessage;
  } catch (error) {
    console.error("Error generating AI response:", error);
    throw error;
  }
}

function parseAIMessage(message) {
  try {
    // Gelen JSON'u doğrudan parse etmeye çalış
    return JSON.parse(message);
  } catch (error) {
    console.warn("Invalid JSON. Attempting to normalize...");

    const jsonStart = message.indexOf("{");
    const jsonEnd = message.lastIndexOf("}");

    // JSON yapısını ayıklayın
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Message does not contain valid JSON structure.");
    }

    let possibleJson = message.slice(jsonStart, jsonEnd + 1);

    // İçerideki HTML'i düzelt ve JSON için uygun hale getir
    possibleJson = possibleJson.replace(/"([^"]*?)"(?!:)/g, (match) => {
      // İçerideki çift tırnakları kaçış karakteriyle değiştir
      return match.replace(/"/g, '\\"');
    });

    // JSON'u tekrar parse etmeye çalış
    try {
      return JSON.parse(possibleJson);
    } catch (innerError) {
      console.error("Failed to parse normalized JSON:", innerError);
      throw innerError;
    }
  }
}

async function getProperties(appId) {
  try {
    const aiRecord = await AI.findOne({ appId }).select("wordLimit");
    return {
      wordLimit: aiRecord?.wordLimit || 1024, // Default to 1024 if no record found
    };
  } catch (error) {
    console.error("Error fetching properties from database:", error);
    throw error;
  }
}

// Helper function to construct the JSON body for the API request
function createJsonBody(seoData, wordLimit, whatsFor) {
  return {
    model: "accounts/fireworks/models/llama-v3p2-11b-vision-instruct",
    messages: [
      {
        role: "system",
        content: `
Your name is Tuan-AI, and you are an AI SEO expert. Your role is to analyze meta descriptions provided by users and deliver suggestions to improve SEO performance. You communicate in a friendly, warm, yet professional tone. 

When analyzing the provided meta description:
1. If there are issues, clearly identify the problems, explain why they are important to address, and suggest improvements. 
2. If there are no issues, respond by confirming that there are no problems.

Your response must always follow this format:

If there is a problem:
{
  "response": "...........",
  "problem": true,
  "code": "<meta></meta>" 
}

If there is no problem:
{
  "response": "...........",
  "problem": false,
  "code": null
}

Except for these:
{
  "response": "...........",
}

- The "response" field must contain concise feedback in 3-4 sentences.
- If "problem" is true, provide an optimized HTML meta tag in the "code" field.
- If "problem" is false, set "code" to null.



Always ensure your answers are solution-oriented and focused on optimizing user experience and achieving measurable results.

        `,
      },
      {
        role: "user",
        content: `It's for ${whatsFor}. ${seoData}, this is the data. Do you have any suggestion?`,
      },
    ],
    response_format: { type: "text" },
    //max_tokens: wordLimit,
    max_tokens: 1024,
    top_p: 1,
    top_k: 40,
    presence_penalty: 0,
    frequency_penalty: 0,
    temperature: 0.2,
  };
}

module.exports = generateSEOAI;
