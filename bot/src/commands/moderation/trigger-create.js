const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminRole } = require('../../utils/permissions');
const Trigger = require('../../models/Trigger');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trigger-create')
    .setDescription('Create an auto-response trigger')
    .addStringOption(o => o.setName('trigger').setDescription('The trigger phrase').setRequired(true))
    .addStringOption(o => o.setName('response').setDescription('The bot response').setRequired(true)),
  cooldown: 3000,

  async execute(interaction) {
    if (!await checkAdminRole(interaction)) return;

    const trigger  = interaction.options.getString('trigger').toLowerCase();
    const response = interaction.options.getString('response');
    const client   = interaction.client;

    try {
      await Trigger.create({
        guildId:   interaction.guildId,
        trigger,
        response,
        createdBy: interaction.user.username,
      });

      const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setTitle(`${emojis.check}  Trigger Created`)
        .addFields(
          { name: `${emojis.trigger}  Trigger`,  value: `\`${trigger}\``,         inline: true },
          { name: `${emojis.note}  Response`,    value: response.slice(0, 512),   inline: false },
        )
        .setFooter(makeFooter(client))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      if (err.code === 11000) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(colors.error)
              .setTitle(`${emojis.cross}  Already Exists`)
              .setDescription(`A trigger for \`${trigger}\` already exists.`)
              .setFooter(makeFooter(client))
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }
      throw err;
    }
  },
};
