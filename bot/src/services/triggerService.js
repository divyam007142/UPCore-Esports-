const Trigger = require('../models/Trigger');

async function checkTriggers(message, client) {
  try {
    const content = message.content.toLowerCase();
    const trigger = await Trigger.findOne({
      guildId: message.guildId,
      trigger: { $regex: new RegExp(`\\b${escapeRegex(content)}\\b`, 'i') },
    });
    if (trigger) {
      await message.reply(trigger.response);
    }
  } catch { }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { checkTriggers };
