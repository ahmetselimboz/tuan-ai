const mongoose = require("mongoose");
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
        const { text, appId, selectedChat } = data;

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

        // Kullanıcı mesajını ilgili sohbetin "chat.messages" alanına ekliyoruz.
        let newChatId = selectedChat; // Eğer yeni bir sohbet oluşturulursa ID'sini burada tutuyoruz.

        console.log("🚀 ~ socket.on ~ selectedChat:", selectedChat);
        console.log("🚀 ~ socket.on ~ selectedChat:", typeof selectedChat);
        const isSaveHistory = await AI.findOne({ appId }).select(
          "save_history"
        );
        console.log("🚀 ~ socket.on ~ isSaveHistory:", isSaveHistory)
        const chatExist = await AI.findOne(
          { appId: appId, "chat._id": selectedChat }, // Filtreleme
          { "chat.$": 1 } // Sadece eşleşen chat dizisinin elemanını getir
        );

        console.log("🚀 ~ socket.on ~ chatExist:", chatExist);
        if (isSaveHistory.save_history) {
          if (!chatExist) {
            const newChat = {
              chat_name: text, // İlk mesaj chat ismi olarak atanıyor.
              messages: [{ message: text, sender: "user" }],
            };
  
            const updatedAI = await AI.findOneAndUpdate(
              { appId },
              { $push: { chat: newChat } },
              { new: true, upsert: true }
            );
  
            // Eklenen son sohbetin ID'sini alıyoruz.
            newChatId = updatedAI.chat[updatedAI.chat.length - 1]._id;
          } else {
        
            const addedmessage = await AI.findOneAndUpdate(
              { appId, "chat._id": selectedChat },
              {
                $push: { "chat.$.messages": { message: text, sender: "user" } },
              },
              { new: true }
            );
        
          }
        }
      

        console.log("Received prompt:", text);

        const result = await AI.findOne({ appId: appId }).select(
          "platform_data"
        );

        if (!result.platform_data) {
          const platformDatas = await getPlatformData(findApp.domain);
          await AI.findOneAndUpdate(
            { appId: appId },
            { platform_data: platformDatas },
            { new: true, upsert: true }
          );
        }

        const getChat = await AI.aggregate([
          { $match: { appId: appId } }, // appId'yi filtrele
          { $unwind: "$chat" }, // chat dizisini aç
          { $match: { "chat._id": newChatId } }, // chat_name'i eşleştir
          { $project: { "chat.history": 1, _id: 0 } }, // Sadece messages'ı seç
        ]);
        //console.log("🚀 ~ socket.on ~ getChat:", getChat);
        const history = getChat[0]?.chat?.history;
       // console.log("🚀 ~ socket.on ~ newChatId:", newChatId);

        // AI yanıtını stream ederek gönder
        const status= await generateAnalysis(
          appId,
          result.platform_data,
          text,
          getUser.name,
          findApp.project_name,
          socket,
          ai.wordLimit,
          history,
          newChatId
        );

        const rights = await getLimit(appId);
        
        socket.emit("ai_rights", rights);
        
        console.log("🚀 ~ socket.on ~ result:", status)
        console.log("🚀 ~ socket.on ~ rights:", rights)
        
      } catch (error) {
        socket.emit("ai_response_error", "AI response generation failed.");
        console.log("🚀 ~ socket - send_message ~ error:", error);
        auditLogs.error("" || "User", "socket", "send_message", error);
        logger.error("" || "User", "socket", "send_message", error);
      }
    });


    async function getLimit(appId) {
      try {
        const data = await AI.findOne({ appId }).select("limit");
        return data.limit;
      } catch (error) {
        console.error("Error saving response to database:", error);
      }
    }

    socket.on("disconnect", (reason) => {
      try {
        connectedClients.delete(socket.id);
        console.log(
          `Client disconnected: ${socket.id}, Total clients: ${connectedClients.size}, Reason: ${reason}`
        );
        socket.emit("disconnected", reason);
      } catch (error) {
        console.log("🚀 ~ socket - disconnect ~ error:", error);
        auditLogs.error("" || "User", "socket", "disconnect", error);
        logger.error("" || "User", "socket", "disconnect", error);
      }
    });
  });
};
