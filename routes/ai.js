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

// router.get("/get-platform-data", async (req, res) => {
//   try {

//     return res.status(_enum.HTTP_CODES.OK).json(
//       Response.successResponse({
//         code: _enum.HTTP_CODES.OK,
//         status: true,
//       })
//     );
//   } catch (error) {
//     console.log("🚀 ~ /get-platform-data ~ error:", error);
//     auditLogs.error("" || "User", "apps-route", "POST /get-platform-data", error);
//     logger.error("" || "User", "apps-route", "POST /get-platform-data", error);
//   }
// });

router.post("/get-ai", async (req, res) => {
  try {
    const { body } = req;
    console.log("🚀 ~ router.get ~ body:", body);

    const findApp = await AI.findOne({ appId: body.appId }).select(
      "limit limitExist"
    );
  
    const getChat = await AI.aggregate([
      { $match: { appId: body.appId } }, // appId'yi filtrele
      { $unwind: "$chat" }, // chat dizisini aç
      { $sort: { "chat.date": -1 } }, // date alanına göre azalan sıralama (en yeni önce)
      { $limit: 1 }, // Sadece en yeni elemanı seç
      { $project: { "chat.messages": 1, "chat._id": 1, _id: 0 } }, // messages ve _id'yi seç
    ]);
    

    const messages = getChat[0].chat.messages;

    return res.status(_enum.HTTP_CODES.OK).json(
      Response.successResponse({
        code: _enum.HTTP_CODES.OK,
        ai: findApp,
        messages:messages,
        chatId: getChat[0].chat._id
      })
    );
  } catch (error) {
    console.log("🚀 ~ /get-ai ~ error:", error);
    auditLogs.error("" || "User", "ai-route", "POST /get-ai", error);
    logger.error("" || "User", "ai-route", "POST /get-ai", error);
  }
});

router.post("/check-platform-data", async (req, res) => {
  try {
    const { body } = req;
    //console.log("🚀 ~ router.get ~ body:", body);

    // const findApp = await AI.findOne({ appId: body.appId }).select("limit limitExist domain");
    const findApp = await App.findOne({ appId: body.appId }).select("domain");
    const result = await getPlatformData(findApp.domain);
    await AI.findOneAndUpdate({ appId: body.appId }, { platform_data: result });

    return res.status(_enum.HTTP_CODES.OK).json(
      Response.successResponse({
        code: _enum.HTTP_CODES.OK,
        status: true,
      })
    );
  } catch (error) {
    console.log("🚀 ~ /check-platform-data ~ error:", error);
    auditLogs.error(
      "" || "User",
      "ai-route",
      "POST /check-platform-data",
      error
    );
    logger.error("" || "User", "ai-route", "POST /check-platform-data", error);
  }
});

router.post("/get-chat-list", async (req, res) => {
  try {
    const { body } = req;
    const chatList = await Ai.aggregate([
      { $match: { appId: body.appId } }, // appId'ye göre filtrele
      { $unwind: "$chat" }, // chat dizisini aç
      { $sort: { "chat.date": -1 } }, // chat.date alanına göre azalan sıralama
      { $replaceRoot: { newRoot: "$chat" } }, // chat içindeki alanları ana seviyeye çıkar
      { $project: { chat_name: 1, _id: 1 } }, // Gerekli alanları seç
    ]);
    
    console.log(chatList)
    return res.status(_enum.HTTP_CODES.OK).json(
      Response.successResponse({
        code: _enum.HTTP_CODES.OK,
        chatList: chatList,
      })
    );
  } catch (error) {
    console.log("🚀 ~ /get-chat-list ~ error:", error);
    auditLogs.error(
      "" || "User",
      "ai-route",
      "POST /get-chat-list",
      error
    );
    logger.error("" || "User", "ai-route", "POST /get-chat-list", error);
  }
});

module.exports = router;
