const mongoose = require('mongoose');

const commandLogSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  userTag: { type: String, required: true },
  command: { type: String, required: true },
  channelId: { type: String },
  channelName: { type: String },
  guildName: { type: String },
  interactionId: { type: String },
  status: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' },
  durationMs: { type: Number },
  errorMessage: { type: String },
  args: { type: Object, default: {} },
  executedAt: { type: Date, default: Date.now },
});

commandLogSchema.index({ guildId: 1, executedAt: -1 });

module.exports = mongoose.model('CommandLog', commandLogSchema);
