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
        const { text, appId, chatId } = data;

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
          { appId: appId, "chat._id": chatId },
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
        let newChatId = null
        if (!aiRes) {
         
          const newChat = {
            chat_name: text,
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
          const addedChat = updatedAI.chat[updatedAI.chat.length - 1]; // Son eklenen eleman
          newChatId = addedChat._id;
          console.log("🚀 ~ socket.on ~ newChatId:", newChatId)
      
        }

       

        console.log("Received prompt:", text);

        const result = await AI.findOne({appId:appId}).select("platform_data")
    

        if(!result.platform_data){
          const platformDatas = await getPlatformData(findApp.domain);
          await AI.findOneAndUpdate({appId:appId}, {platform_data:platformDatas}, {new:true, upsert: true})
        }

        const getChat = await AI.aggregate([
          { $match: { appId: appId } }, // appId'yi filtrele
          { $unwind: "$chat" }, // chat dizisini aç
          { $match: { "chat._id": newChatId } }, // chat_name'i eşleştir
          { $project: { "chat.history": 1, _id: 0 } }, // Sadece messages'ı seç
        ]);
        console.log("🚀 ~ socket.on ~ getChat:", getChat)
        const history = getChat[0].chat.history;
    
        // AI yanıtını stream ederek gönder
        await generateAnalysis(
          appId,
          result.platform_data,
          text,
          getUser.name,
          findApp.project_name,
          socket,
          ai.wordLimit,
          history
        );
      } catch (error) {
        socket.emit("ai_response_error", "AI response generation failed.");
        console.log("🚀 ~ socket - send_message ~ error:", error);
        auditLogs.error("" || "User", "socket", "send_message", error);
        logger.error("" || "User", "socket", "send_message", error);
      }
    });

   

    socket.on("disconnect", (reason) => {
      try {
        connectedClients.delete(socket.id);
        console.log(
          `Client disconnected: ${socket.id}, Total clients: ${connectedClients.size}, Reason: ${reason}`
        );
        socket.emit("disconnected", reason)
      } catch (error) {
        console.log("🚀 ~ socket - disconnect ~ error:", error);
        auditLogs.error("" || "User", "socket", "disconnect", error);
        logger.error("" || "User", "socket", "disconnect", error);
      }
    });
  });
};
