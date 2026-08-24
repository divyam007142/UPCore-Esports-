const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkAdminRole, checkBotPermissions } = require('../../utils/permissions');
const { logMessage } = require('../../services/logService');
const { colors, emojis } = require('../../config/config');
const { e } = require('../../utils/emoji');
const { makeFooter } = require('../../utils/embeds');

function getMessageId(value) {
  const input = String(value || '').trim();
  const linkMatch = input.match(/\/channels\/\d+\/\d+\/(\d{17,20})$/);
  if (linkMatch) return linkMatch[1];
  return /^\d{17,20}$/.test(input) ? input : null;
}

module.exports = {
  category: 'moderation',
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete one message in this channel')
    .addStringOption(option => option
      .setName('message')
      .setDescription('Message ID or Discord message link')
      .setRequired(true)),
  cooldown: 10000,

  async execute(interaction, client) {
    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ManageMessages])) return;

    const input = interaction.options.getString('message');
    const messageId = getMessageId(input);
    if (!messageId) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setDescription(`${e('error')} Please provide a valid Discord message ID or message link.`)],
        ephemeral: true,
      });
    }

    try {
      const message = await interaction.channel.messages.fetch(messageId);
      const snapshot = {
        author: message.author,
        content: message.content,
        channelId: message.channelId,
        attachments: [...message.attachments.values()].map(attachment => ({
          url: attachment.url,
          name: attachment.name || 'attachment',
          contentType: attachment.contentType || null,
        })),
      };

      client.suppressedMessageDeleteLogs.add(message.id);
      await message.delete();

      await logMessage(client, interaction.guild, 'delete', {
        author: snapshot.author?.tag || snapshot.author?.username || 'Unknown',
        authorId: snapshot.author?.id || 'Unknown',
        authorAvatar: snapshot.author?.displayAvatarURL({ dynamic: true }) || null,
        channelId: snapshot.channelId,
        content: snapshot.content,
        attachments: snapshot.attachments,
        deletedBy: interaction.user.tag,
        deletedById: interaction.user.id,
      });

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(colors.success)
          .setDescription(`${emojis.success} Message deleted successfully.`)
          .setFooter(makeFooter(client))
          .setTimestamp()],
        ephemeral: true,
      });
    } catch {
      client.suppressedMessageDeleteLogs.delete(messageId);
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setDescription(`${emojis.error} I could not find or delete that message in this channel.`)
          .setFooter(makeFooter(client))
          .setTimestamp()],
        ephemeral: true,
      });
    }
  },
};
