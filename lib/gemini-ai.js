/*
 * Install the Generative AI SDK
 *
 * $ npm install @google/generative-ai
 *
 * See the getting started guide for more information
 * https://ai.google.dev/gemini-api/docs/get-started/node
 */

const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

async function generateWithAI() {
  const chatSession = model.startChat({
    generationConfig,
    history: [],
  });

  const result = await chatSession.sendMessage(
    `Sen, Tuana adlı bir yapay zeka destekli analiz platformundaki bir sanal asistansın. Görevin, kullanıcıların web sitesi performansını anlamalarına ve iyileştirmelerine yardımcı olmak. Kullanıcıların sorularına kibar ve net bir dilde yanıt vererek, elde edilen verilerden somut öneriler sun ve kapsamlı ama hızlı uygulanabilir çözümler öner. İşte bir kullanıcı sorusu: 'Web sitemin hemen çıkma oranı %40. Bu oranı nasıl düşürebilirim? Lütfen bana 3 öneriyle yanıt ver.'`
  );

  const aiResponse = await result.response.text();



  return aiResponse;
}

module.exports = generateWithAI;
