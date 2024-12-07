const _enum = require("../config/enum");
const Ai = require("../db/models/Ai");
const App = require("../db/models/App");
const auditLogs = require("../lib/auditLogs");
const logger = require("../lib/logger/logger");
const Response = require("../lib/response");
const config = require("../config/environments");

const {
  findTopPage,
  newVisitors,
  calculateSessionDuration,
  lineCard,
  deviceCard,
  pageCard,
  locationCard,
  sourcesCard,
  languagesCard,
} = require("../services/appServices");
const axios = require("axios");
const puppeteer = require("puppeteer");
const generateAnalysis = require("../lib/tuan-ai");
const getPlatformData = require("../lib/playwright");
const User = require("../db/models/User");
const AI = require("../db/models/Ai");

const router = require("express").Router();

router.post("/prompt", async (req, res) => {
  try {
    const { body, query } = req;
    console.log("🚀 ~ router.get ~ body:", body);

    const findApp = await App.findOne({ appId: body.appId }).select("domain");

    const result = await getPlatformData(findApp.domain);
    const response = await generateAnalysis(result, body.prompt);

    return res.status(_enum.HTTP_CODES.OK).json(
      Response.successResponse({
        code: _enum.HTTP_CODES.OK,
        response,
      })
    );
  } catch (error) {
    console.log("🚀 ~ /prompt ~ error:", error);
    auditLogs.error("" || "User", "ai-route", "POST /prompt", error);
    logger.error("" || "User", "ai-route", "POST /prompt", error);
  }
});

router.get("/get-platform-data", async (req, res) => {
  try {
    // AI modelinizi burada çağırın

    // const newData = {
    //   userId: "user123",
    //   appId: "app456",
    //   chat: [
    //     {
    //       chat_name: "Genel Sohbet",
    //       messages: [
    //         {
    //           message: "Merhaba, size nasıl yardımcı olabilirim?",
    //           sender: "bot",
    //           date: new Date("2024-12-07T10:00:00Z"),
    //         },
    //         {
    //           message: "Bana hava durumu hakkında bilgi verebilir misin?",
    //           sender: "user",
    //           date: new Date("2024-12-07T10:01:00Z"),
    //         },
    //       ],
    //       date: new Date("2024-12-07T10:00:00Z"),
    //       history: [
    //         {
    //           prompt: "Hava durumu nedir?",
    //           response: "Bugün hava güneşli ve sıcaklık 25°C.",
    //           timestamp: new Date("2024-12-07T10:02:00Z"),
    //         },
    //         {
    //           prompt: "Bu hafta sonu hava durumu nasıl olacak?",
    //           response: "Hafta sonu yağmurlu bir hava bekleniyor.",
    //           timestamp: new Date("2024-12-07T10:03:00Z"),
    //         },
    //       ],
    //     },
    //   ],
    //   devicesData: [
    //     {
    //       deviceType: "mobile",
    //       os: "iOS",
    //       browser: "Safari",
    //       version: "17.0",
    //     },
    //   ],
    //   pagesData: [
    //     {
    //       pageUrl: "https://example.com/home",
    //       viewCount: 42,
    //     },
    //   ],
    //   locationsData: [
    //     {
    //       country: "Germany",
    //       city: "Berlin",
    //       visitCount: 5,
    //     },
    //   ],
    //   sourcesData: [
    //     {
    //       source: "Facebook",
    //       visitCount: 10,
    //     },
    //   ],
    //   languagesData: [
    //     {
    //       language: "de",
    //       percentage: 60,
    //     },
    //     {
    //       language: "en",
    //       percentage: 40,
    //     },
    //   ],
    //   limitExist: true,
    //   limit: 500,
    //   wordLimit: 4096,
    // };

    // Ai.create(newData)
    //   .then((doc) => {
    //     console.log("Veri başarıyla eklendi:", doc);
    //   })
    //   .catch((err) => {
    //     console.error("Veri eklenirken hata oluştu:", err);
    //   });

    const result = await Ai.updateMany(
      {}, // Tüm belgeler için
      {
        $set: {
          ai_limit: 10,
         
        },
      }
    );

    return res.status(_enum.HTTP_CODES.OK).json(
      Response.successResponse({
        code: _enum.HTTP_CODES.OK,
        status: true,
      })
    );
  } catch (error) {
    console.log("🚀 ~ /new-visitor ~ error:", error);
    auditLogs.error("" || "User", "apps-route", "POST /new-visitor", error);
    logger.error("" || "User", "apps-route", "POST /new-visitor", error);
  }
});

router.post("/get-ai", async (req, res) => {
  try {
    const { body } = req;
    console.log("🚀 ~ router.get ~ body:", body);

    const findApp = await AI.findOne({ appId: body.appId }).select("limit limitExist");



    return res.status(_enum.HTTP_CODES.OK).json(
      Response.successResponse({
        code: _enum.HTTP_CODES.OK,
        ai:findApp,
      })
    );
  } catch (error) {
    console.log("🚀 ~ /prompt ~ error:", error);
    auditLogs.error("" || "User", "ai-route", "POST /prompt", error);
    logger.error("" || "User", "ai-route", "POST /prompt", error);
  }
});

module.exports = router;
