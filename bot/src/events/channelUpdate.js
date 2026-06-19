const { Events } = require('discord.js');
const { logChannel } = require('../services/logService');

module.exports = {
  name: Events.ChannelUpdate,
  async execute(oldChannel, newChannel, client) {
    if (!newChannel.guild) return;
    if (oldChannel.name === newChannel.name) return;
    await logChannel(client, newChannel.guild, 'update', {
      name: `${oldChannel.name} → ${newChannel.name}`,
      type: newChannel.type?.toString(),
    });
  },
};
