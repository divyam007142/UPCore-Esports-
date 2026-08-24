const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminRole } = require('../../utils/permissions');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot send a message in a channel')
    .addStringOption(o => o.setName('message').setDescription('Message to send').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Channel to send in (default: current)').setRequired(false)),
  cooldown: 10000,

  async execute(interaction, client) {
    if (!await checkAdminRole(interaction)) return;

    const message = interaction.options.getString('message');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    try {
      await channel.send(message);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(colors.success)
          .setTitle(`${emojis.success}  Message Sent`)
          .addFields(
            { name: `${emojis.channel} Channel`, value: `${channel}`, inline: true },
            { name: `${emojis.mod} Sent By`,     value: `<@${interaction.user.id}>`, inline: true },
          )
          .setFooter(makeFooter(client))
          .setTimestamp()],
        ephemeral: true,
      });
    } catch {
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setTitle(`${emojis.error}  Failed to Send`)
          .setDescription(`Could not send a message to ${channel}.\nI may be missing **Send Messages** permission in that channel.`)
          .setFooter(makeFooter(client))
          .setTimestamp()],
        ephemeral: true,
      });
    }
  },
};
