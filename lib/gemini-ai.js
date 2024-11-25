const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Çevre değişkeninden API anahtarını alıyoruz.
});

async function generateAnalysis() {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Daha güçlü bir model kullanılıyor.
      messages: [
        { 
          role: "system", 
          content: `You are Tuana, an AI assistant specialized in analyzing user behavior on websites and providing actionable insights to improve performance. Your tone is professional, insightful, and concise. Always focus on practical solutions and user-friendly advice.` 
        },
        {
          role: "user",
          content: `Here are some details about a website's performance:

          - Average time on site: 1 minute 30 seconds.
          - Cart abandonment rate: 65%.
          - 40% of users leave directly from the homepage.
          - Most viewed page: Product listing page.

          Based on this data, provide 3 actionable recommendations to improve user engagement and conversion rates. Please explain each recommendation briefly.`,
        },
      ],
    });

    // Yanıtı konsola yazdırıyoruz.
    console.log(completion.choices[0].message.content);

    return completion.choices[0].message.content
  } catch (error) {
    console.error("Error generating completion:", error);
  }
}

module.exports = generateAnalysis
