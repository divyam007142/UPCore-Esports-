const mongoose = require('mongoose');

const starboardEntrySchema = new mongoose.Schema({
  guildId:            { type: String, required: true },
  originalMessageId:  { type: String, required: true, unique: true },
  starboardMessageId: { type: String, required: true },
  postedAt:           { type: Date, default: Date.now },
});

starboardEntrySchema.index({ guildId: 1, originalMessageId: 1 }, { unique: true });

module.exports = mongoose.model('StarboardEntry', starboardEntrySchema);
