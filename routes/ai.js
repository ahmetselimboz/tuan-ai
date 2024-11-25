const _enum = require("../config/enum");
const Ai = require("../db/models/Ai");

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
const generateAnalysis = require("../lib/gemini-ai");

const router = require("express").Router();

router.get("/prompt", async (req, res) => {
  try {


    const response = await generateAnalysis()

    return res.status(_enum.HTTP_CODES.OK).json(
      Response.successResponse({
        code: _enum.HTTP_CODES.OK,
        response
      })
    );

  } catch (error) {
    console.log("🚀 ~ /new-visitor ~ error:", error);
    auditLogs.error("" || "User", "apps-route", "POST /new-visitor", error);
    logger.error("" || "User", "apps-route", "POST /new-visitor", error);
  }
});

module.exports = router
