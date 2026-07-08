const mongoose = require('mongoose');

const starboardConfigSchema = new mongoose.Schema({
  guildId:      { type: String, required: true, unique: true },
  channelId:    { type: String, required: true },
  minSkulls:    { type: Number, required: true, default: 3 },
  configuredBy: { type: String, required: true },
  configuredAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('StarboardConfig', starboardConfigSchema);
