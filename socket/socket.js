const AI = require("../db/models/Ai");
const App = require("../db/models/App");
const User = require("../db/models/User");
const auditLogs = require("../lib/auditLogs");
const logger = require("../lib/logger/logger");
const getPlatformData = require("../lib/playwright");
const generateAnalysis = require("../lib/tuan-ai");

const connectedClients = new Map();

module.exports = (io) => {
  io.on("connection", (socket) => {
    if (!connectedClients.has(socket.id)) {
      connectedClients.set(socket.id, { connectedAt: new Date() });
      console.log(
        `Client connected: ${socket.id}, Total clients: ${connectedClients.size}`
      );
    }
    socket.on("user_message", async (data) => {
      try {
        const { text, appId } = data;

        const findApp = await App.findOne({ appId: appId }).select(
          "domain userId project_name userId"
        );

        const getUser = await User.findOne({ _id: findApp.userId }).select(
          "name plans"
        );
        const ai = await AI.findOne({ appId: appId }).select(
          "limitExist limit wordLimit"
        );

        //console.log("🚀 ~ socket.on ~ ai:", ai);
        //console.log("🚀 ~ socket.on ~ getUser:", getUser);

        const planValues = {
          free: 5,
          mini: 10,
          pro: 20,
          premium: 0,
        };

        const tokenValues = {
          free: 1024,
          mini: 2048,
          pro: 3072,
          premium: 4096,
        };

        if (ai) {
          if (ai.limitExist == true && ai.limit == 0) {
            socket.emit("ai_response_error", "You don't have limit");
            return true;
          }
        } else {
          const newAI = await AI({
            userId: findApp.userId,
            appId: appId,
            limitExist: getUser.plans == "free" ? true : false,
            limit: planValues[getUser.plans] ?? null,
            wordLimit: tokenValues[getUser.plans] ?? null,
            ai_limit: planValues[getUser.plans] ?? null,
          }).save();

          console.log("🚀 ~ socket.on ~ newAI:", newAI);
        }



        const aiRes = await AI.findOneAndUpdate(
          { appId: appId, "chat.chat_name": "Genel Sohbet" },
          {
            $push: {
              "chat.$.messages": {
                message: text,
                sender: "user",
              },
            },
          },
          { new: true }
        );

        if (!aiRes) {
         
          const newChat = {
            chat_name: "Genel Sohbet",
            messages: [
              {
                message: text,
                sender: "user",
              },
            ],
          };
        
          const updatedAI = await AI.findOneAndUpdate(
            { appId: appId },
            {
              $push: { chat: newChat },
            },
            { new: true, upsert: true }
          );
        
      
        }

        // if (aiRes) {
        //   await AI.findOneAndUpdate(
        //     { appId }, // Şartlara uyan belgeyi bulun
        //     {
        //       $inc: { limit: -1 }, // limit değerini 1 azalt
        //     },
        //     { new: true } // Güncellenmiş belgeyi döndür
        //   );
        // }

        // if (!aiRes) {
        //   await AI.findOneAndUpdate(
        //     { appId }, // Şartlara uyan belgeyi bulun
        //     {
        //       $push: {
        //         chat: { chat_name: text }, // chat dizisine yeni bir nesne ekle
        //       },
        //     },
        //     { new: true, upsert: true } // Belgeyi güncelledikten sonra döndür ve belge yoksa oluştur
        //   );

        // }

        //console.log("🚀 ~ socket.on ~ data:", aiRes);

        console.log("Received prompt:", text);

        const result = await getPlatformData(findApp.domain);
        // AI yanıtını stream ederek gönder
        await generateAnalysis(
          appId,
          result,
          text,
          getUser.name,
          findApp.project_name,
          socket,
          ai.wordLimit
        );
      } catch (error) {
        socket.emit("ai_response_error", "AI response generation failed.");
        console.log("🚀 ~ socket - send_message ~ error:", error);
        auditLogs.error("" || "User", "socket", "send_message", error);
        logger.error("" || "User", "socket", "send_message", error);
      }
    });

    socket.on("disconnect", () => {
      try {
        connectedClients.delete(socket.id);
        console.log(
          `Client disconnected: ${socket.id}, Total clients: ${connectedClients.size}`
        );
      } catch (error) {
        console.log("🚀 ~ socket - disconnect ~ error:", error);
        auditLogs.error("" || "User", "socket", "disconnect", error);
        logger.error("" || "User", "socket", "disconnect", error);
      }
    });
  });
};
