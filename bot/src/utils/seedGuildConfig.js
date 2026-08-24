const GuildConfig = require('../models/GuildConfig');

const LOG_CHANNELS = {
  messageLogs:    '1393289211397804224',
  moderationLogs: '1522153801753034824',
  welcomeLogs:    '1522124941170966528',
  voiceLogs:      '1393289302921838592',
  inviteLogs:     '1393289372786495548',
  purgeLogs:      '1522154277374660700',
  commandLogs:    '1393290804197331158',
  channelLogs:    '1395064433159569419',
};

async function seedGuildConfig() {
  const guildId = process.env.GUILD_ID;
  if (!guildId) {
    console.warn('  ⚠ seedGuildConfig: GUILD_ID not set, skipping log channel seed.');
    return;
  }

  const update = {};
  for (const [key, id] of Object.entries(LOG_CHANNELS)) {
    update[`logging.${key}`] = id;
  }

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: update },
    { upsert: true, new: true }
  );

  console.log('  ✔ Log channels seeded into MongoDB for guild', guildId);
}

module.exports = { seedGuildConfig };
