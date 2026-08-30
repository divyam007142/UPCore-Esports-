const mongoose = require('mongoose');

const animeSaveSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  imageUrl: { type: String, required: true },
  type: { type: String, required: true, enum: ['neko', 'waifu'] },
  dmMessageId: { type: String },
  createdAt: { type: Date, default: Date.now },
});

animeSaveSchema.index({ userId: 1, imageUrl: 1 }, { unique: true });

module.exports = mongoose.model('AnimeSave', animeSaveSchema);
