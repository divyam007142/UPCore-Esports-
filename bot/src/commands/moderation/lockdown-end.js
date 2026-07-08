const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkAdminRole, checkBotPermissions } = require('../../utils/permissions');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');
const lockdownTimers = require('../../utils/lockdownTimers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdown-end')
    .setDescription('Immediately unlock a locked channel and cancel its timer')
    .addChannelOption(o =>
      o.setName('channel')
        .setDescription('Channel to unlock (defaults to current channel)')
        .setRequired(false)
    )
    .addStringOption(o =>
      o.setName('reason')
        .setDescription('Reason for ending lockdown early (optional)')
        .setRequired(false)
    ),
  cooldown: 5000,

  async execute(interaction) {
    const client = interaction.client;

    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ManageChannels])) return;

    const target = interaction.options.getChannel('channel') ?? interaction.channel;
    const reason = interaction.options.getString('reason') || 'Lockdown ended by staff';

    await interaction.deferReply();

    const everyoneRole = interaction.guild.roles.everyone;

    // ── Check if channel is actually locked ───────────────────────────────────
    const ow = target.permissionOverwrites.cache.get(everyoneRole.id);
    const isLocked = ow?.deny?.has(PermissionFlagsBits.SendMessages) ?? false;

    if (!isLocked && !lockdownTimers.has(target.id)) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.warning)
          .setDescription(`${emojis.unlock}  ${target} is not locked — nothing to end.`)
          .setFooter(makeFooter(client))],
      });
    }

    // ── Cancel the auto-unlock timer if one exists ────────────────────────────
    const hadTimer = lockdownTimers.has(target.id);
    if (hadTimer) {
      clearTimeout(lockdownTimers.get(target.id).timeout);
      lockdownTimers.delete(target.id);
    }

    // ── Unlock the channel ────────────────────────────────────────────────────
    try {
      if (ow) {
        await ow.edit(
          { SendMessages: null },
          { reason: `Lockdown ended early | ${reason} | By: ${interaction.user.tag}` },
        );
      } else {
        await target.permissionOverwrites.edit(
          everyoneRole,
          { SendMessages: null },
          { reason: `Lockdown ended early | ${reason} | By: ${interaction.user.tag}` },
        );
      }
    } catch (err) {
      return interaction.editReply({
        content: `${emojis.warning}  Failed to unlock channel: \`${err.message}\``,
      });
    }

    // ── Reply ─────────────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(colors.success)
      .setDescription(
        `${emojis.unlock} <#${target.id}> has been **unlocked**` +
        (hadTimer ? ` · Auto-unlock timer cancelled` : '') +
        (reason !== 'Lockdown ended by staff' ? ` · Reason: ${reason}` : '')
      )
      .setFooter(makeFooter(client, `by ${interaction.user.username}`))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
