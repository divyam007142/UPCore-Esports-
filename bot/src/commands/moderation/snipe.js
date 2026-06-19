const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminRole } = require('../../utils/permissions');
const { colors, emojis } = require('../../config/config');
const { formatIST } = require('../../utils/time');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('Show the last deleted message in this channel'),
  cooldown: 3000,

  async execute(interaction, client) {
    if (!await checkAdminRole(interaction)) return;

    const sniped = client.sniped.get(interaction.channelId);
    if (!sniped) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(colors.neutral)
          .setTitle(`${emojis.snipe}  Nothing to Snipe`)
          .setDescription('There are no recently deleted messages in this channel.\nMessages are cached until the bot restarts.')
          .setFooter(makeFooter(client))
          .setTimestamp()],
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(colors.neutral)
      .setTitle(`${emojis.snipe}  Sniped Message`)
      .setAuthor({ name: sniped.author, iconURL: sniped.authorAvatar || undefined })
      .setDescription(sniped.content ? `\`\`\`${sniped.content.slice(0, 900)}\`\`\`` : '*No text content*')
      .addFields(
        { name: `${emojis.channel} Channel`,        value: `<#${interaction.channelId}>`, inline: true },
        { name: `${emojis.member} Author`,          value: sniped.author, inline: true },
        { name: `${emojis.calendar} Deleted At`,    value: formatIST(sniped.timestamp), inline: true },
      );

    if (sniped.attachments?.length > 0) {
      embed.addFields({ name: `${emojis.screenshot} Attachments`, value: sniped.attachments.slice(0, 3).join('\n'), inline: false });
    }

    embed.setFooter(makeFooter(client, 'Message Snipe')).setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
