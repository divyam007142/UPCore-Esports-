const { Events } = require('discord.js');
const { logVoice } = require('../services/logService');

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState, client) {
    const guild = newState.guild;
    const user = newState.member?.user;
    if (!user || user.bot) return;

    const oldChannel = oldState.channel;
    const newChannel = newState.channel;

    if (!oldChannel && newChannel) {
      await logVoice(client, guild, {
        action: 'Joined',
        user: user.tag,
        userId: user.id,
        channel: newChannel.name,
      });
    } else if (oldChannel && !newChannel) {
      await logVoice(client, guild, {
        action: 'Left',
        user: user.tag,
        userId: user.id,
        channel: oldChannel.name,
      });
    } else if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
      await logVoice(client, guild, {
        action: 'Moved',
        user: user.tag,
        userId: user.id,
        from: oldChannel.name,
        to: newChannel.name,
      });
    }

    if (!oldState.serverMute && newState.serverMute) {
      await logVoice(client, guild, { action: 'Server Muted', user: user.tag, userId: user.id, channel: newChannel?.name || 'N/A' });
    } else if (oldState.serverMute && !newState.serverMute) {
      await logVoice(client, guild, { action: 'Server Unmuted', user: user.tag, userId: user.id, channel: newChannel?.name || 'N/A' });
    }

    if (!oldState.serverDeaf && newState.serverDeaf) {
      await logVoice(client, guild, { action: 'Server Deafened', user: user.tag, userId: user.id, channel: newChannel?.name || 'N/A' });
    } else if (oldState.serverDeaf && !newState.serverDeaf) {
      await logVoice(client, guild, { action: 'Server Undeafened', user: user.tag, userId: user.id, channel: newChannel?.name || 'N/A' });
    }
  },
};
