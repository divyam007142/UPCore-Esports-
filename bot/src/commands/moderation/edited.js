const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminRole } = require('../../utils/permissions');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edited')
    .setDescription('Show the last edited message in this channel'),
  cooldown: 3000,

  async execute(interaction, client) {
    if (!await checkAdminRole(interaction)) return;

    const edited = client.editedSniped?.get(interaction.channelId);
    if (!edited) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.info)
            .setTitle(`${emojis.snipe}  Nothing to Show`)
            .setDescription('No recently edited messages found in this channel.')
            .setFooter(makeFooter(client))
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(colors.warning)
      .setTitle(`${emojis.snipe}  Last Edited Message`)
      .setAuthor({ name: edited.author, iconURL: edited.authorAvatar || undefined })
      .addFields(
        { name: `${emojis.cross}  Before`, value: edited.before?.slice(0, 1024) || '*No text*',  inline: false },
        { name: `${emojis.check}  After`,  value: edited.after?.slice(0, 1024)  || '*No text*',  inline: false },
        { name: `${emojis.channel}  Channel`,   value: `<#${interaction.channelId}>`,             inline: true  },
        { name: `${emojis.clock}  Edited`,      value: `<t:${Math.floor(edited.timestamp / 1000)}:R>`, inline: true },
      )
      .setFooter(makeFooter(client))
      .setTimestamp();

    if (edited.messageUrl) {
      embed.addFields({ name: `${emojis.link}  Jump to Message`, value: `[Click Here](${edited.messageUrl})`, inline: true });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
