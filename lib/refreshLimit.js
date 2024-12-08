const cron = require("node-cron");
const AI = require("../db/models/Ai"); // Modelinizi import edin

const resetDailyLimit = () => {
  // Her gün gece 00:00'da çalışır
  cron.schedule("*/2 * * * *", async () => {
    console.log("Günlük limit yenileme işlemi başlatılıyor...");

    try {
      // Tüm kullanıcıların limitini sıfırla
      await AI.bulkWrite([
        {
          updateMany: {
            filter: { limitExist: true }, // Şartlara uyan belgeler
            update: [
              {
                $set: {
                  limit: { $toInt: "$ai_limit" }, // ai_limit değerini limit'e ata
                },
              },
            ],
          },
        },
      ]);
      

      console.log("Günlük limit başarıyla yenilendi!");
    } catch (error) {
      console.error("Günlük limit yenileme sırasında bir hata oluştu:", error);
    }
  });
};

module.exports = resetDailyLimit;
