const mongoose = require('mongoose');

const triggerSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  trigger: { type: String, required: true },
  response: { type: String, required: true },
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
});

triggerSchema.index({ guildId: 1, trigger: 1 }, { unique: true });

module.exports = mongoose.model('Trigger', triggerSchema);
