const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminRole } = require('../../utils/permissions');
const Trigger = require('../../models/Trigger');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trigger-remove')
    .setDescription('Remove an auto-response trigger')
    .addStringOption(o =>
      o.setName('trigger').setDescription('The trigger phrase to remove').setRequired(true),
    ),
  cooldown: 3000,

  async execute(interaction) {
    if (!await checkAdminRole(interaction)) return;

    const trigger = interaction.options.getString('trigger').toLowerCase();
    const client  = interaction.client;
    const deleted = await Trigger.findOneAndDelete({ guildId: interaction.guildId, trigger });

    if (!deleted) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.error)
            .setTitle(`${emojis.cross}  Not Found`)
            .setDescription(`No trigger found for \`${trigger}\`.`)
            .setFooter(makeFooter(client))
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(colors.success)
      .setTitle(`${emojis.check}  Trigger Removed`)
      .addFields(
        { name: `${emojis.trigger}  Trigger`, value: `\`${trigger}\``, inline: true },
      )
      .setFooter(makeFooter(client))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
