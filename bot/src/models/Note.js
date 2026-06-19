const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  userTag: { type: String, required: true },
  notes: [{
    noteId: Number,
    moderatorId: String,
    moderatorTag: String,
    content: String,
    createdAt: { type: Date, default: Date.now },
  }],
});

noteSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Note', noteSchema);
