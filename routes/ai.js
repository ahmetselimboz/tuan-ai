const _enum = require("../config/enum");
const Ai = require("../db/models/Ai");
const App = require("../db/models/App");
const auditLogs = require("../lib/auditLogs");
const logger = require("../lib/logger/logger");
const Response = require("../lib/response");
const config = require("../config/environments");

// const {
//   findTopPage,
//   newVisitors,
//   calculateSessionDuration,
//   lineCard,
//   deviceCard,
//   pageCard,
//   locationCard,
//   sourcesCard,
//   languagesCard,
// } = require("../services/appServices");

const {
  getMetaTitle,
  getMetaDescription,
  getMetaKeywords,
  getMetaAuthor,
  getMetaRobots,
  getMetaPublisher,
  getTwitterCard,
  getFacebookOG,
  getMetaCharset,
  getLanguage,
  getExternalLinks,
  getHeadingStructure,
  getFontSizes,
  getStructuredData,
  check404,
  getCanonical,
  getIframes,
  getTables,
  checkAMP,
  getFaviconFunc,
  checkResponsive,
  checkMobileCompatibility,
  getImagesWithoutAlt,
  getLinksWithoutTitle,
  getServerConfiguration,
  analyzeKeywords,
  getResourceCounts,
  analyzePageSpeed,
  getCodeToTextRatio,
  analyzeDomain,
  getRobotsTxt,
  verifyRedirects,
  checkBrokenLinks,
  findBacklinkOpportunities
} = require("../lib/SEO/seo");


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
  
    //const getChat = await AI.findOne({ appId: body.appId, "chat._id": body.selectedChat } ).select("chat.messages")
    const getChat = await AI.findOne({ appId: body.appId, "chat._id": body.selectedChat }, { "chat.$": 1 }); // Sadece eşleşen chat'i getirir
    const messages = getChat?.chat[0]?.messages || [];
    
    console.log("🚀 ~ router.post ~ getChat:", getChat)

    //const messages = getChat[0]?.chat?.messages;

    return res.status(_enum.HTTP_CODES.OK).json(
      Response.successResponse({
        code: _enum.HTTP_CODES.OK,
        ai: findApp,
        messages:messages,
       
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
    
    //console.log(chatList)
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



router.post("/get-seo", async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const { body } = req;
    const { appId, query } = body;
    console.log("🚀 ~ router.post ~ appId:", appId)
    const { firstdate, lastdate } = query;

    // Fetch the domain from the database
    const result = await App.findOne({ appId: appId }).select("domain");

    if (!result || !result.domain) {
      return res
        .status(_enum.HTTP_CODES.NOT_FOUND)
        .json(Response.errorResponse("Domain not found for the given appId"));
    }

    const url = "https://" + result.domain;
    const domain = result.domain;
    console.log("🚀 ~ router.post ~ url:", url);
    console.log("🚀 ~ router.post ~ domain:", domain);

    const data = {
      metaTitle: await getMetaTitle(appId,url),
      metaDescription: await getMetaDescription(appId, url),
      metaKeywords: await getMetaKeywords(url),
      metaAuthor: await getMetaAuthor(url),
      metaRobots: await getMetaRobots(url),
      metaPublisher: await getMetaPublisher(url),
      twitterCard: await getTwitterCard(url),
      facebookOG: await getFacebookOG(url),
      metaCharset: await getMetaCharset(url),
      language: await getLanguage(url),
      externalLinks: await getExternalLinks(url),
      headingStructure: await getHeadingStructure(url),
      fontSizes: await getFontSizes(url),
      structuredData: await getStructuredData(url),
      notFoundPage: await check404(url),
      canonicalTag: await getCanonical(url),
      iframeUsage: await getIframes(url),
      tableUsage: await getTables(url),
      ampUsage: await checkAMP(url),
      faviconUsage: await getFaviconFunc(url),
      responsiveDesign: await checkResponsive(url),
      mobileCompatibility: await checkMobileCompatibility(url),
      imagesWithoutAlt: await getImagesWithoutAlt(url),
      linksWithoutTitle: await getLinksWithoutTitle(url),
      serverConfig: await getServerConfiguration(url),
      keywordAnalysis: await analyzeKeywords(url),
      resourceSummary: await getResourceCounts(url),
      pageSpeed: await analyzePageSpeed(domain, url),
      codeToTextRatio: await getCodeToTextRatio(url),
      //domainAnalysis: await analyzeDomain(domain),
      robotsTxt: await getRobotsTxt(url),
      redirectionValidation: await verifyRedirects(url),
      brokenLinks: await checkBrokenLinks(url),
      //backlinkOpportunities: await findBacklinkOpportunities(url),
    };

    return res.status(_enum.HTTP_CODES.OK).json(
      Response.successResponse({
        code: _enum.HTTP_CODES.OK,
        data,
      })
    );
  } catch (error) {
    console.log("🚀 ~ router.post ~ error:", error);
    auditLogs.error("" || "User", "ai-route", "/get-seo", error);
    logger.error("" || "User", "ai-route", "/get-seo", error);
    res
      .status(_enum.HTTP_CODES.INT_SERVER_ERROR)
      .json(Response.errorResponse(error));
  }
});

module.exports = router;
