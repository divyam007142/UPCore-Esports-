const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkAdminRole, checkBotPermissions } = require('../../utils/permissions');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nick')
    .setDescription("Change or reset a member's nickname")
    .addUserOption(o => o.setName('user').setDescription('The user').setRequired(true))
    .addStringOption(o =>
      o.setName('nickname').setDescription('New nickname (leave empty to reset)').setMaxLength(32).setRequired(false),
    ),
  cooldown: 3000,

  async execute(interaction, client) {
    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ManageNicknames])) return;

    const targetUser = interaction.options.getUser('user');
    const nickname   = interaction.options.getString('nickname') ?? null;

    let member;
    try {
      member = await interaction.guild.members.fetch(targetUser.id);
    } catch {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.error)
            .setTitle(`${emojis.cross}  User Not Found`)
            .setDescription('That user is not in this server.')
            .setFooter(makeFooter(client))
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }

    const oldNick = member.nickname ?? member.user.username;
    const newNick = nickname ?? member.user.username;

    await member.setNickname(nickname, `Nickname change by ${interaction.user.username}`);

    const embed = new EmbedBuilder()
      .setColor(colors.info)
      .setTitle(`${emojis.nick}  Nickname ${nickname ? 'Updated' : 'Reset'}`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
      .addFields(
        { name: `${emojis.member}  User`,       value: `<@${targetUser.id}>\n\`${targetUser.username}\``, inline: true },
        { name: `${emojis.mod}  Changed By`,    value: `<@${interaction.user.id}>`,                       inline: true },
        { name: `${emojis.cross}  Before`,      value: `\`${oldNick}\``,                                  inline: true },
        { name: `${emojis.check}  After`,       value: `\`${newNick}\``,                                  inline: true },
      )
      .setFooter(makeFooter(client))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
