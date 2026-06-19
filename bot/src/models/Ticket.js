const mongoose = require('mongoose');

const categoryHistorySchema = new mongoose.Schema({
  action:   { type: String },
  category: { type: String },
  movedBy:  { type: String },
  movedAt:  { type: String },
}, { _id: false });

const ticketSchema = new mongoose.Schema({
  channelId:             { type: String, required: true, unique: true },
  guildId:               { type: String, required: true },
  ticketId:              { type: String, required: true },
  ticketNumber:          { type: Number, required: true },
  userId:                { type: String, required: true },
  username:              { type: String, required: true },
  category:              { type: String, required: true },
  status:                { type: String, default: 'open', enum: ['open', 'closed'] },
  claimedBy:             { type: String, default: null },
  locked:                { type: Boolean, default: false },
  lockedBy:              { type: String, default: null },
  lockedAt:              { type: String, default: null },
  lockExpiresAt:         { type: Number, default: null },
  addedUsers:            [{ type: String }],
  openedAt:              { type: String, required: true },
  closedAt:              { type: String, default: null },
  closedBy:              { type: String, default: null },
  formData:              { type: mongoose.Schema.Types.Mixed, default: {} },
  transcriptGeneratedAt: { type: String, default: null },

  originalCategoryId: { type: String, default: null },

  isSpecial:    { type: Boolean, default: false },
  specialAt:    { type: String, default: null },
  specialBy:    { type: String, default: null },

  isEscalated:  { type: Boolean, default: false },
  escalatedAt:  { type: String, default: null },
  escalatedBy:  { type: String, default: null },

  categoryHistory: { type: [categoryHistorySchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
