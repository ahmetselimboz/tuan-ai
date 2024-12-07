const App = require("../db/models/App");
const User = require("../db/models/User");
const auditLogs = require("../lib/auditLogs");
const logger = require("../lib/logger/logger");
const getPlatformData = require("../lib/playwright");
const generateAnalysis = require("../lib/tuan-ai");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("user_message", async (data) => {
      try {
        const { text, appId } = data;

        const findApp = await App.findOne({ appId: appId }).select(
          "domain userId project_name"
        );

        const getUser = await User.findOne({ _id: findApp.userId }).select(
          "name"
        );

        //console.log("🚀 ~ socket.on ~ getUser:", getUser);
        console.log("Received prompt:", text);

        const result = await getPlatformData(findApp.domain);
        // AI yanıtını stream ederek gönder
        await generateAnalysis(result, text, getUser.name, findApp.project_name, socket);
      } catch (error) {
        console.log("🚀 ~ socket - send_message ~ error:", error);
        auditLogs.error("" || "User", "socket", "send_message", error);
        logger.error("" || "User", "socket", "send_message", error);
      }
    });

    socket.on("disconnect", () => {
      try {
        console.log("Client disconnected:", socket.id);
      } catch (error) {
        console.log("🚀 ~ socket - disconnect ~ error:", error);
        auditLogs.error("" || "User", "socket", "disconnect", error);
        logger.error("" || "User", "socket", "disconnect", error);
      }
    });
  });
};
