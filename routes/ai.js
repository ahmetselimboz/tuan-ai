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

const router = require("express").Router();

router.post("/prompt", async (req, res) => {
  try {
    const { body, query } = req;
    console.log("🚀 ~ router.get ~ body:", body);

    const findApp = await App.findOne({ appId: body.appId }).select("domain");


    const result = await getPlatformData(findApp.domain)
    const response = await generateAnalysis(result, body.prompt)

    return res.status(_enum.HTTP_CODES.OK).json(
      Response.successResponse({
        code: _enum.HTTP_CODES.OK,
        response
        
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
    const { link } = req.query;
    const result = await getPlatformData(link);

    return res.status(_enum.HTTP_CODES.OK).json(
      Response.successResponse({
        code: _enum.HTTP_CODES.OK,
        result,
      })
    );
  } catch (error) {
    console.log("🚀 ~ /new-visitor ~ error:", error);
    auditLogs.error("" || "User", "apps-route", "POST /new-visitor", error);
    logger.error("" || "User", "apps-route", "POST /new-visitor", error);
  }
});

module.exports = router;
