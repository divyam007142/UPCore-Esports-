const { Events } = require('discord.js');
const { logMessage } = require('../services/logService');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild) return;
    if (newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    // Store for edited snipe
    client.editedSniped.set(newMessage.channelId, {
      before:       oldMessage.content || null,
      after:        newMessage.content || null,
      author:       newMessage.author?.tag || 'Unknown',
      authorId:     newMessage.author?.id  || null,
      authorAvatar: newMessage.author?.displayAvatarURL({ dynamic: true }) || null,
      timestamp:    new Date(),
      messageUrl:   newMessage.url,
    });

    setTimeout(() => client.editedSniped.delete(newMessage.channelId), 5 * 60 * 1000);

    await logMessage(client, newMessage.guild, 'edit', {
      author:       newMessage.author?.tag || 'Unknown',
      authorId:     newMessage.author?.id  || 'Unknown',
      authorAvatar: newMessage.author?.displayAvatarURL({ dynamic: true }) || null,
      channelId:    newMessage.channelId,
      before:       oldMessage.content,
      after:        newMessage.content,
      messageLink:  newMessage.url,
    });
  },
};
