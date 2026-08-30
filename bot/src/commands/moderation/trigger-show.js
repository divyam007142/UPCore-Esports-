const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminRole } = require('../../utils/permissions');
const Trigger = require('../../models/Trigger');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trigger-show')
    .setDescription('Show all auto-response triggers'),
  cooldown: 3000,

  async execute(interaction) {
    if (!await checkAdminRole(interaction)) return;

    const client   = interaction.client;
    await interaction.deferReply({ ephemeral: true });

    const triggers = await Trigger.find({ guildId: interaction.guildId }).sort({ trigger: 1 });

    const embed = new EmbedBuilder()
      .setColor(colors.info)
      .setTitle(`${emojis.trigger}  Auto-Response Triggers`)
      .setFooter(makeFooter(client))
      .setTimestamp();

    if (triggers.length === 0) {
      embed.setDescription(`${emojis.info}  No triggers configured for this server.`);
    } else {
      embed.setDescription(`${emojis.check}  **${triggers.length}** trigger(s) configured:`);
      triggers.slice(0, 20).forEach(t => {
        embed.addFields({
          name:   `${emojis.trigger}  \`${t.trigger}\``,
          value:  t.response.slice(0, 100),
          inline: false,
        });
      });
      if (triggers.length > 20) {
        embed.addFields({ name: `${emojis.info}  More`, value: `+${triggers.length - 20} more triggers not shown.`, inline: false });
      }
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
