const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: String, required: true },
  appId: { type: String, required: true },
  message: { type: String, required: true },
  sender: { type: String, enum: ['user', 'bot'], required: true }, // Mesajın kimden geldiği
},
{ versionKey: false, timestamps: true });

const AI = mongoose.model('AI', schema);
module.exports = AI;
