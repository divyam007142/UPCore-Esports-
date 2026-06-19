const { Events } = require('discord.js');
const { logChannel } = require('../services/logService');

module.exports = {
  name: Events.ChannelCreate,
  async execute(channel, client) {
    if (!channel.guild) return;
    await logChannel(client, channel.guild, 'create', {
      name: channel.name,
      type: channel.type?.toString(),
    });
  },
};
