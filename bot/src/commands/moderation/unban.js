const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkAdminRole, checkBotPermissions } = require('../../utils/permissions');
const { createCase } = require('../../services/caseService');
const { logModAction } = require('../../services/logService');
const { colors, emojis } = require('../../config/config');
const { formatIST } = require('../../utils/time');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their ID or username')
    .addStringOption(o =>
      o.setName('user').setDescription('User ID or username to unban').setRequired(true),
    )
    .addStringOption(o => o.setName('reason').setDescription('Reason for the unban').setRequired(false)),
  cooldown: 5000,

  async execute(interaction) {
    const client = interaction.client;

    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.BanMembers])) return;

    const input  = interaction.options.getString('user').trim();
    const reason = interaction.options.getString('reason') || 'No reason provided';

    await interaction.deferReply();

    let bannedUser = null;
    let userId     = null;

    // ── Try to resolve: numeric ID first, then search ban list by username/tag ──
    if (/^\d{17,20}$/.test(input)) {
      try {
        const banEntry = await interaction.guild.bans.fetch(input);
        bannedUser = banEntry.user;
        userId     = input;
      } catch { /* not banned */ }
    }

    if (!bannedUser) {
      // Search ban list by tag (User#0000) or username
      try {
        const bans = await interaction.guild.bans.fetch();
        const entry = bans.find(b =>
          b.user.tag.toLowerCase()      === input.toLowerCase() ||
          b.user.username.toLowerCase() === input.toLowerCase(),
        );
        if (entry) {
          bannedUser = entry.user;
          userId     = entry.user.id;
        }
      } catch { /* no permission to fetch bans */ }
    }

    if (!bannedUser) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setDescription(
            `${emojis.unban} **Not Found in Ban List**\n` +
            `No ban found for \`${input}\`.\n` +
            `Provide a valid user ID (17–20 digits), username, or \`Username#0000\` tag.`,
          )
          .setFooter(makeFooter(client))
          .setTimestamp()],
      });
    }

    await interaction.guild.members.unban(userId, `${reason} | Mod: ${interaction.user.tag}`);

    const newCase = await createCase(interaction.guildId, {
      action: 'UNBAN', userId: bannedUser.id, userTag: bannedUser.tag,
      moderatorId: interaction.user.id, moderatorTag: interaction.user.tag, reason,
    });

    await logModAction(client, interaction.guild, {
      action: 'UNBAN', target: bannedUser.tag, targetId: bannedUser.id,
      targetAvatar: bannedUser.displayAvatarURL({ dynamic: true }),
      moderator: interaction.user.tag, moderatorId: interaction.user.id,
      reason, caseId: newCase.caseId,
    });

    const embed = new EmbedBuilder()
      .setColor(colors.success)
      .setTitle(`${emojis.unban}  Member Unbanned`)
      .setThumbnail(bannedUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: `${emojis.member} User`,         value: `\`${bannedUser.tag}\`\n\`${bannedUser.id}\``, inline: true },
        { name: `${emojis.mod} Moderator`,       value: `<@${interaction.user.id}>`, inline: true },
        { name: `${emojis.case} Case ID`,        value: `\`#${newCase.caseId}\``, inline: true },
        { name: `${emojis.log} Reason`,          value: reason, inline: false },
        { name: `${emojis.calendar} Time (IST)`, value: formatIST(), inline: true },
      )
      .setFooter(makeFooter(client, `Case #${newCase.caseId}`))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
