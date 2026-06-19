const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("Display a user's avatar")
    .addUserOption(o => o.setName('user').setDescription('The user (defaults to you)').setRequired(false)),
  cooldown: 3000,

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') ?? interaction.user;
    const avatarUrl  = targetUser.displayAvatarURL({ size: 1024 });

    const embed = new EmbedBuilder()
      .setColor(colors.primary)
      .setAuthor({ name: targetUser.username, iconURL: targetUser.displayAvatarURL({ size: 64 }) })
      .setTitle(`${emojis.member}  ${targetUser.username}'s Avatar`)
      .setImage(avatarUrl)
      .addFields(
        { name: `${emojis.link} PNG`,  value: `[Download](${targetUser.displayAvatarURL({ extension: 'png',  size: 1024 })})`, inline: true },
        { name: `${emojis.link} JPG`,  value: `[Download](${targetUser.displayAvatarURL({ extension: 'jpg',  size: 1024 })})`, inline: true },
        { name: `${emojis.link} WEBP`, value: `[Download](${targetUser.displayAvatarURL({ extension: 'webp', size: 1024 })})`, inline: true },
      )
      .setFooter(makeFooter(client, `Requested by ${interaction.user.username}`))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
