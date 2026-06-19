const mongoose = require('mongoose');

const warningSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  userTag: { type: String, required: true },
  warnings: [{
    warnId: Number,
    moderatorId: String,
    moderatorTag: String,
    reason: String,
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  }],
});

warningSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Warning', warningSchema);
