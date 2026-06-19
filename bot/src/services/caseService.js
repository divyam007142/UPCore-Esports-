const Case = require('../models/Case');
const GuildConfig = require('../models/GuildConfig');

async function getNextCaseId(guildId) {
  const config = await GuildConfig.findOneAndUpdate(
    { guildId },
    { $inc: { caseCount: 1 } },
    { upsert: true, new: true }
  );
  return config.caseCount;
}

async function createCase(guildId, data) {
  const caseId = await getNextCaseId(guildId);
  const newCase = new Case({
    guildId,
    caseId,
    action: data.action,
    userId: data.userId,
    userTag: data.userTag,
    moderatorId: data.moderatorId,
    moderatorTag: data.moderatorTag,
    reason: data.reason || 'No reason provided',
    duration: data.duration || null,
  });
  await newCase.save();
  return newCase;
}

async function getCases(guildId, userId) {
  return Case.find({ guildId, userId }).sort({ caseId: -1 });
}

async function getAllCases(guildId, limit = 10) {
  return Case.find({ guildId }).sort({ caseId: -1 }).limit(limit);
}

async function getCase(guildId, caseId) {
  return Case.findOne({ guildId, caseId });
}

module.exports = { createCase, getCases, getAllCases, getCase };
