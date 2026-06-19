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
          .setTitle(`${emojis.unlock}  Not Locked`)
          .setDescription(`${target} is **not locked** — there is no active lockdown to end.`)
          .setFooter(makeFooter(client))
          .setTimestamp()],
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
      .setTitle(`${emojis.unlock}  Lockdown Ended`)
      .setDescription(
        `${target} has been **unlocked** — members can send messages again.` +
        (hadTimer ? `\n${emojis.clock}  The auto-unlock timer has been cancelled.` : '')
      )
      .addFields(
        { name: `${emojis.log} Reason`,      value: reason, inline: false },
        { name: `${emojis.mod} Moderator`,   value: `<@${interaction.user.id}>`, inline: true },
        { name: `${emojis.channel} Channel`, value: `${target}`, inline: true },
      )
      .setFooter(makeFooter(client, 'Lockdown Ended'))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
