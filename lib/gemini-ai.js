const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Çevre değişkeninden API anahtarını alıyoruz.
});

// async function generateAnalysis() {
//   try {
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini", // Daha güçlü bir model kullanılıyor.
//       messages: [
//         {
//           role: "system",
//           content: `Sen Tuana platformunun yapay zeka asistanısın. Tuana platformu; kullanıcılara, kendi kullanıcılarının davranışını anlamakta ve bu verilerden doğru aksiyonları almakta yardımcı olan yapay destekli bir platform. Senin görevin kullanıcıların nerelerde zorlandığını ve neden dönüşüm kaybı yaşadığını otomatik olarak tespit etmek, bağlama uygun analizler yapmak ve kullanıcılara uygulanabilir, kişiselleştirilmiş öneriler sunmak. Sadece "ne olduğunu" değil aynı zamanda kullanıcılara "ne yapmaları" gerektiğini de söylemelisin. Kullanıcıların projelerini derinden önemseyen ve başarılı olmalarına yardımcı olmaya kendini adamış bir yapay zeka asistanısın. Sadece bir araç değil, aynı zamanda empati kuran, motive eden ve ilerlemelerini kutlayan bir ortaksın. Ses tonun arkadaş canlısı, motive edici ve anlayışlı. Kullanıcıların her zaman desteklendiklerini ve anlaşıldıklarını hissetmelerini sağla.`,
//         },
//         {
//           role: "user",
//           content: `İşte tuanalytics.com web sitesine ait yapman gerekenler:

//           - Siteyi incele ve gördüğün eksiklikleri de söyle.

//           Kullanıcı etkileşimini ve dönüşüm oranını artırmak için neler yapılabilir?  Her öneriyi kısa ve net bir şekilde açıkla.`,
//         },
//       ],
//     });

//     // Yanıtı konsola yazdırıyoruz.
//     console.log(completion.choices[0].message.content);

//     return completion.choices[0].message.content;
//   } catch (error) {
//     console.error("Error generating completion:", error);
//   }
// }

async function generateAnalysis(result, prompt) {
  try {
    const jsonBody = {
      model: "accounts/fireworks/models/llama-v3p2-11b-vision-instruct",
      messages: [
        {
          role: "system",
          content: `
You are Tuana Assistant, a friendly, professional, and highly intelligent assistant designed to support users of the Tuana platform. Your primary role is to provide actionable recommendations and data-driven insights to help improve website and app performance. You always deliver concise, solution-oriented answers focused on optimizing user experience and achieving measurable results.

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

        // {
        //   role: "user",
        //   content: `${prompt}
        //   `,
        // },
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

    const res = await response.json();
    // console.log("🚀 ~ generateAnalysis ~ res:", res);
    // console.log("🚀 ~ generateAnalysis ~ message:", res.choices[0].message);
    console.log("🚀 ~ generateAnalysis ~ result:", result);
    console.log("🚀 ~ generateAnalysis ~ prompt:", prompt);
    // console.log(
    //   "🚀 ~ generateAnalysis ~ content:",
    //   res.choices[0].message.content
    // );

    return res.choices[0].message.content;
  } catch (error) {
    console.error("Error generating completion:", error);
  }
}

module.exports = generateAnalysis;
