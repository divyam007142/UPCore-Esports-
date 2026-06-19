const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  caseId: { type: Number, required: true },
  action: { type: String, required: true, enum: ['BAN', 'UNBAN', 'KICK', 'MUTE', 'UNMUTE', 'WARN', 'UNWARN', 'VC_MUTE', 'VC_UNMUTE', 'VC_DEAFEN', 'VC_UNDEAFEN', 'VC_KICK', 'VC_MOVE', 'TIMEOUT', 'NOTE'] },
  userId: { type: String, required: true },
  userTag: { type: String, required: true },
  moderatorId: { type: String, required: true },
  moderatorTag: { type: String, required: true },
  reason: { type: String, default: 'No reason provided' },
  duration: { type: Number, default: null },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

caseSchema.index({ guildId: 1, caseId: 1 }, { unique: true });
caseSchema.index({ guildId: 1, userId: 1 });

module.exports = mongoose.model('Case', caseSchema);
