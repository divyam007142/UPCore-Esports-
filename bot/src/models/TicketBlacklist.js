const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  guildId:           { type: String, required: true },
  userId:            { type: String, required: true },
  reason:            { type: String, default: 'No reason provided' },
  blacklistedBy:     { type: String, required: true },
  blacklistedByName: { type: String, required: true },
  blacklistedAt:     { type: String, required: true },
}, { timestamps: true });

schema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('TicketBlacklist', schema);
