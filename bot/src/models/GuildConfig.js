const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  logging: {
    messageLogs: { type: String, default: null },
    moderationLogs: { type: String, default: null },
    welcomeLogs: { type: String, default: null },
    voiceLogs: { type: String, default: null },
    inviteLogs: { type: String, default: null },
    purgeLogs: { type: String, default: null },
    automodLogs: { type: String, default: null },
    ticketLogs: { type: String, default: null },
    commandLogs: { type: String, default: null },
    channelLogs: { type: String, default: null },
  },
  welcome: {
    channelId: { type: String, default: null },
    logChannelId: { type: String, default: null },
    dmEnabled: { type: Boolean, default: true },
    message: { type: String, default: 'Welcome to the server!' },
  },
  automod: {
    enabled: { type: Boolean, default: true },
    blockScamLinks: { type: Boolean, default: true },
    blockMassMentions: { type: Boolean, default: true },
    blockSpam: { type: Boolean, default: true },
    blockNsfw: { type: Boolean, default: true },
    maxMentions: { type: Number, default: 5 },
  },
  caseCount: { type: Number, default: 0 },
  ticket: {
    counter:        { type: Number, default: 0 },
    panelMessageId: { type: String, default: null },
    panelChannelId: { type: String, default: null },
  },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
