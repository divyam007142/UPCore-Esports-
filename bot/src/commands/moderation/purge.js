const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { checkAdminRole, checkBotPermissions } = require('../../utils/permissions');
const { logPurge } = require('../../services/logService');
const { colors, emojis } = require('../../config/config');
const { e } = require('../../utils/emoji');
const { makeFooter } = require('../../utils/embeds');

function successEmbed(text) {
  return new EmbedBuilder().setColor(colors.success).setDescription(text);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge-all')
    .setDescription('Purge all selected messages in this channel')
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages to delete (1–100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption(o => o.setName('user').setDescription('Only delete messages from this user').setRequired(false)),
  cooldown: 10000,

  async execute(interaction, client) {
    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ManageMessages])) return;

    const amount     = interaction.options.getInteger('amount');
    const filterUser = interaction.options.getUser('user');

    const confirmEmbed = new EmbedBuilder()
      .setColor(colors.warning)
      .setTitle(`${emojis.purge}  Confirm Purge`)
      .setDescription(
        `You are about to delete **${amount}** message${amount !== 1 ? 's' : ''}` +
        (filterUser ? ` from **${filterUser.tag}**` : '') +
        ` in ${interaction.channel}.\n\n` +
        `${emojis.warning} **This action cannot be undone.**\n` +
        `> Messages older than 14 days cannot be bulk deleted.`
      )
      .addFields(
        { name: `${emojis.channel} Channel`,    value: `${interaction.channel}`, inline: true },
        { name: `${emojis.purge} Amount`,        value: `\`${amount}\``, inline: true },
        { name: `${emojis.member} User Filter`,  value: filterUser ? filterUser.tag : 'All users', inline: true },
      )
      .setFooter(makeFooter(client, 'Confirmation required'))
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('purge_confirm').setLabel('Delete Messages').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('purge_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    const { resource } = await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true, withResponse: true });
    const reply = resource.message;
    const collector = reply.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== interaction.user.id) {
        return btn.reply({ content: 'This confirmation is not for you.', ephemeral: true });
      }

      if (btn.customId === 'purge_cancel') {
        collector.stop();
        return btn.update({
          embeds: [new EmbedBuilder()
            .setColor(colors.info)
            .setTitle(`${emojis.info}  Purge Cancelled`)
            .setDescription('No messages were deleted.')
            .setFooter(makeFooter(client))
            .setTimestamp()],
          components: [],
        });
      }

      if (btn.customId === 'purge_confirm') {
        collector.stop();
        try {
          let messages = await interaction.channel.messages.fetch({ limit: 100 });
          if (filterUser) messages = messages.filter(m => m.author.id === filterUser.id);
          messages = messages.first(amount);

          const deleted = await interaction.channel.bulkDelete(messages, true);

          await logPurge(client, interaction.guild, {
            moderator: interaction.user.tag, moderatorId: interaction.user.id,
            channelId: interaction.channelId, count: deleted.size,
             filterUser: filterUser?.tag,
             messages: [...deleted.values()],
          });

          await btn.update({
            embeds: [successEmbed(`${e('check')} Successfully purged **${deleted.size}** message${deleted.size !== 1 ? 's' : ''}.`)],
            components: [],
          });
        } catch {
          await btn.update({
            embeds: [new EmbedBuilder()
              .setColor(colors.error)
              .setTitle(`${emojis.error}  Purge Failed`)
              .setDescription('Could not delete messages.\n> Messages older than **14 days** cannot be bulk deleted.')
              .setFooter(makeFooter(client))
              .setTimestamp()],
            components: [],
          });
        }
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(colors.neutral)
            .setTitle(`${emojis.clock}  Confirmation Timed Out`)
            .setDescription('The purge confirmation expired. No messages were deleted.')
            .setFooter(makeFooter(client))
            .setTimestamp()],
          components: [],
        }).catch(() => { });
      }
    });
  },
};
