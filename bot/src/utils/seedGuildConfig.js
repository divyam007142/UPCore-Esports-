const GuildConfig = require('../models/GuildConfig');

const LOG_CHANNELS = {
  messageLogs:    '1343476104870105100',
  moderationLogs: '1517451780907335680',
  welcomeLogs:    '1343476437788790835',
  voiceLogs:      '1343502935325278208',
  inviteLogs:     '1517452146331619368',
  purgeLogs:      '1431879869054320713',
  automodLogs:    '1342070704023011348',
  commandLogs:    '1343476541254013011',
  channelLogs:    '1343476487726043167',
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
