const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const { checkAdminRole, checkBotPermissions } = require('../../utils/permissions');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');
const { e } = require('../../utils/emoji');
const path = require('path');
const fs   = require('fs');

const REJOIN_INVITE = 'https://discord.gg/upcore';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hack')
    .setDescription('Handle a hacked account — ban, delete messages, unban, then send rejoin link')
    .addUserOption(o =>
      o.setName('user').setDescription('The compromised user account').setRequired(true),
    ),
  cooldown: 10000,

  async execute(interaction) {
    const client = interaction.client;

    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.BanMembers])) return;

    const targetUser = interaction.options.getUser('user');

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: `${emojis.error} You cannot run this command on yourself.`,
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    // Step 1 — DM the user BEFORE banning (Discord blocks DMs to banned users)
    let dmSent = false;
    try {
      const bannerPath = path.join(__dirname, '../../../assets/banner-twitter.webp');
      const bannerAttachment = fs.existsSync(bannerPath)
        ? new AttachmentBuilder(bannerPath, { name: 'banner-twitter.webp' })
        : null;

      const dmEmbed = new EmbedBuilder()
        .setColor(0x1a1a1a)
        .setTitle(`${e('warning')}  We Have Detected That Your Account Was Compromised`)
        .setDescription(
          `${e('shield')} Hi **${targetUser.username}**,\n\n` +
          `It appears your Discord account was recently hacked and used to send unauthorized messages in **${interaction.guild.name}**.\n\n` +
          `${e('mod')} **What our team did:**\n` +
          `> ${e('purge')} Removed all messages sent by the compromised account\n` +
          `> ${e('ban')} Temporarily banned the account to stop further damage\n` +
          `> ${e('unban')} Immediately unbanned — you are free to rejoin\n\n` +
          `${e('link')} **Rejoin link:** **${REJOIN_INVITE}**\n\n` +
          `${e('key')} We strongly recommend **changing your password** and enabling **two-factor authentication** to secure your account.`,
        )
        .setImage(bannerAttachment ? 'attachment://banner-twitter.webp' : null)
        .setFooter({ text: 'UPCORE Esports — Keeping the community safe' })
        .setTimestamp();

      const sendOpts = { embeds: [dmEmbed] };
      if (bannerAttachment) sendOpts.files = [bannerAttachment];
      await targetUser.send(sendOpts);
      dmSent = true;
    } catch { /* DMs closed */ }

    // Step 2 — Ban + delete all messages (cleans up spam)
    try {
      await interaction.guild.members.ban(targetUser.id, {
        reason: `Compromised account — spam removed | Mod: ${interaction.user.tag}`,
        deleteMessageSeconds: 604800,
      });
    } catch (err) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setDescription(`${emojis.error} **Failed to ban** — ${err.message}`)
          .setFooter(makeFooter(client))
          .setTimestamp()],
      });
    }

    // Step 3 — Immediately unban (the real user is a victim)
    try {
      await interaction.guild.members.unban(
        targetUser.id,
        'Compromised account — auto-unbanned after message cleanup',
      );
    } catch { }

    // Step 4 — Confirm in channel
    const embed = new EmbedBuilder()
      .setColor(colors.success)
      .setTitle(`${emojis.mod}  Compromised Account Handled`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setDescription(`**${targetUser.tag}**'s compromised account has been cleaned up.`)
      .addFields(
        { name: `${emojis.member} Account`,     value: `<@${targetUser.id}>\n\`${targetUser.tag}\`\n\`${targetUser.id}\``, inline: true },
        { name: `${emojis.mod} Actioned By`,    value: `<@${interaction.user.id}>`, inline: true },
        { name: `${emojis.purge} Actions Taken`,
          value: [
            '> Banned + deleted all messages (7 days)',
            '> Immediately unbanned',
            dmSent ? '> DM sent with rejoin link' : '> DM could not be delivered (user has DMs closed)',
          ].join('\n'),
          inline: false },
        { name: `${emojis.link} Rejoin Link`, value: REJOIN_INVITE, inline: true },
      )
      .setFooter(makeFooter(client, 'Compromised Account'))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // If DM failed, post the rejoin link in the channel so mods can share it manually
    if (!dmSent) {
      await interaction.followUp({
        content:
          `${emojis.warning} **Could not DM <@${targetUser.id}>** — their DMs are closed.\n` +
          `${emojis.link} Please share the rejoin link with them manually: **${REJOIN_INVITE}**`,
        ephemeral: false,
      });
    }
  },
};
