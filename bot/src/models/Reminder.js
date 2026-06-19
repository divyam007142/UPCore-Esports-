const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  channelId: { type: String, required: true },
  message: { type: String, required: true },
  remindAt: { type: Date, required: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

reminderSchema.index({ active: 1, remindAt: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
