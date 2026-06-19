const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription("Display a user's banner")
    .addUserOption(o => o.setName('user').setDescription('The user (defaults to you)').setRequired(false)),
  cooldown: 3000,

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') ?? interaction.user;
    const fetched    = await targetUser.fetch();
    const bannerUrl  = fetched.bannerURL({ size: 1024 });

    const embed = new EmbedBuilder()
      .setColor(fetched.accentColor ? `#${fetched.accentColor.toString(16).padStart(6, '0')}` : colors.primary)
      .setAuthor({ name: targetUser.username, iconURL: targetUser.displayAvatarURL({ size: 64 }) })
      .setTitle(`${emojis.member}  ${targetUser.username}'s Banner`)
      .setFooter(makeFooter(client, `Requested by ${interaction.user.username}`))
      .setTimestamp();

    if (!bannerUrl) {
      embed.setDescription(`${emojis.cross}  This user does not have a banner set.`);
    } else {
      embed
        .setImage(bannerUrl)
        .addFields(
          { name: `${emojis.link} PNG`,  value: `[Download](${fetched.bannerURL({ extension: 'png',  size: 1024 })})`, inline: true },
          { name: `${emojis.link} WEBP`, value: `[Download](${fetched.bannerURL({ extension: 'webp', size: 1024 })})`, inline: true },
        );
    }

    await interaction.reply({ embeds: [embed] });
  },
};
