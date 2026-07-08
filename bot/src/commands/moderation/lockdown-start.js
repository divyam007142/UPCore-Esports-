const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkAdminRole, checkBotPermissions } = require('../../utils/permissions');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');
const lockdownTimers = require('../../utils/lockdownTimers');

/**
 * Parses a duration string like "30s", "5m", "2h", "1d" into milliseconds.
 * Returns null if the format is invalid.
 */
function parseDuration(str) {
  const match = str.trim().match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  if (n <= 0) return null;
  const unit = match[2].toLowerCase();
  const ms = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * ms[unit];
}

function formatDuration(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!parts.length || s) parts.push(`${s}s`);
  return parts.join(' ');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdown-start')
    .setDescription('Lock a channel for a set duration, then auto-unlock')
    .addChannelOption(o =>
      o.setName('channel')
        .setDescription('Channel to lock')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('duration')
        .setDescription('Duration (e.g. 30s, 5m, 1h, 2d)')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('reason')
        .setDescription('Reason for lockdown (optional)')
        .setRequired(false)
    ),
  cooldown: 5000,

  async execute(interaction) {
    const client = interaction.client;

    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ManageChannels])) return;

    const target   = interaction.options.getChannel('channel');
    const durStr   = interaction.options.getString('duration');
    const reason   = interaction.options.getString('reason') || 'No reason provided';

    await interaction.deferReply();

    // ── Validate it's a text-based channel ───────────────────────────────────
    if (!target.isTextBased()) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.warning)
          .setDescription(`${emojis.warning}  ${target} is not a text channel and cannot be locked.`)
          .setFooter(makeFooter(client))],
      });
    }

    // ── Parse duration ────────────────────────────────────────────────────────
    const durationMs = parseDuration(durStr);
    if (!durationMs) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.warning)
          .setDescription(`${emojis.warning}  Invalid duration \`${durStr}\` — use \`30s\`, \`5m\`, \`1h\`, \`2d\`.`)
          .setFooter(makeFooter(client))],
      });
    }

    const MAX_MS = 7 * 86_400_000; // 7 days
    if (durationMs > MAX_MS) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.warning)
          .setDescription(`${emojis.warning}  Maximum lockdown duration is **7 days**.`)
          .setFooter(makeFooter(client))],
      });
    }

    const everyoneRole = interaction.guild.roles.everyone;

    // ── Already locked? ───────────────────────────────────────────────────────
    const ow = target.permissionOverwrites.cache.get(everyoneRole.id);
    if (ow?.deny?.has(PermissionFlagsBits.SendMessages)) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.warning)
          .setDescription(`${emojis.lock}  ${target} is already locked.`)
          .setFooter(makeFooter(client))],
      });
    }

    // ── Lock the channel ──────────────────────────────────────────────────────
    try {
      await target.permissionOverwrites.edit(
        everyoneRole,
        { SendMessages: false },
        { reason: `Lockdown | ${reason} | By: ${interaction.user.tag}` },
      );
    } catch (err) {
      return interaction.editReply({
        content: `${emojis.warning}  Failed to lock channel: \`${err.message}\``,
      });
    }

    // ── Schedule auto-unlock ──────────────────────────────────────────────────
    const endsAt = Date.now() + durationMs;

    // Cancel any existing timer for this channel before setting a new one
    if (lockdownTimers.has(target.id)) {
      clearTimeout(lockdownTimers.get(target.id).timeout);
    }

    const timeout = setTimeout(async () => {
      lockdownTimers.delete(target.id);
      try {
        const existing = target.permissionOverwrites.cache.get(everyoneRole.id);
        if (existing) {
          await existing.edit({ SendMessages: null }, { reason: 'Lockdown duration expired — auto-unlocked' });
        }
        await target.send({
          embeds: [new EmbedBuilder()
            .setColor(colors.success)
            .setTitle(`${emojis.unlock}  Channel Unlocked`)
            .setDescription(`This channel has been **automatically unlocked** — the lockdown duration has ended.`)
            .addFields(
              { name: `${emojis.log} Original Reason`, value: reason, inline: false },
              { name: `${emojis.clock} Duration`,       value: formatDuration(durationMs), inline: true },
            )
            .setFooter(makeFooter(client, 'Auto-Unlock'))
            .setTimestamp()],
        }).catch(() => null);
      } catch { }
    }, durationMs);

    lockdownTimers.set(target.id, { timeout, endsAt, lockedBy: interaction.user.id });

    // ── Reply ─────────────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(colors.error)
      .setDescription(
        `${emojis.lock} <#${target.id}> has been **locked** for \`${formatDuration(durationMs)}\` — unlocks <t:${Math.floor(endsAt / 1000)}:R>` +
        (reason !== 'No reason provided' ? ` · Reason: ${reason}` : '')
      )
      .setFooter(makeFooter(client, `by ${interaction.user.username}`))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
