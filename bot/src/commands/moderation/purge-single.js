const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkAdminRole, checkBotPermissions } = require('../../utils/permissions');
const { logPurge } = require('../../services/logService');
const { colors, emojis } = require('../../config/config');
const { e } = require('../../utils/emoji');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  category: 'moderation',
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete the newest message in this channel'),
  cooldown: 10000,

  async execute(interaction, client) {
    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ManageMessages])) return;

    // Acknowledge before fetching/deleting messages and writing the purge log.
    await interaction.deferReply({ ephemeral: true });

    try {
      const recentMessages = await interaction.channel.messages.fetch({ limit: 1 });
      if (recentMessages.size === 0) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(colors.info)
            .setDescription(`${e('info')} There are no recent messages to delete.`)
            .setFooter(makeFooter(client))
            .setTimestamp()],
        });
      }

      const message = recentMessages.first();
      client.suppressedMessageDeleteLogs.add(message.id);
      let deletedMessages;
      try {
        deletedMessages = [await message.delete()];
      } finally {
        client.suppressedMessageDeleteLogs.delete(message.id);
      }

      await logPurge(client, interaction.guild, {
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
        channelId: interaction.channelId,
        count: deletedMessages.length,
        messages: deletedMessages,
      });

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.success)
          .setDescription(`${emojis.success} Deleted the recent message successfully.`)
          .setFooter(makeFooter(client))
          .setTimestamp()],
      });
    } catch {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setDescription(`${emojis.error} I could not delete the recent message in this channel.`)
          .setFooter(makeFooter(client))
          .setTimestamp()],
      });
    }
  },
};
