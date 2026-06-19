const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkAdminRole, checkBotPermissions } = require('../../utils/permissions');
const { colors } = require('../../config/config');
const { e } = require('../../utils/emoji');
const { makeFooter } = require('../../utils/embeds');
const { logError } = require('../../utils/console');

function errEmbed(client, title, desc) {
  return new EmbedBuilder()
    .setColor(colors.error)
    .setTitle(`${e('error') || '❌'}  ${title}`)
    .setDescription(desc)
    .setFooter(makeFooter(client))
    .setTimestamp();
}

function okEmbed(client, member, role) {
  return new EmbedBuilder()
    .setColor(colors.success)
    .setTitle(`${e('check') || '✅'}  Role Removed`)
    .setDescription(`Successfully removed <@&${role.id}> from <@${member.id}>.`)
    .addFields(
      { name: `${e('member') || '👤'}  Member`, value: `${member} \`${member.user.tag}\``, inline: true },
      { name: `${e('role')   || '🏷️'}  Role`,   value: `<@&${role.id}> \`${role.name}\``,  inline: true },
    )
    .setFooter(makeFooter(client))
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-remove')
    .setDescription('Remove a role from a member')
    .addUserOption(o => o.setName('user').setDescription('The user').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('The role to remove').setRequired(true)),
  cooldown: 3000,

  async execute(interaction, client) {
    // ── Permission checks (before defer so errors stay ephemeral) ─────────────
    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ManageRoles])) return;

    const targetUser = interaction.options.getUser('user');
    const role       = interaction.options.getRole('role');

    // ── Quick validation (sync, no defer needed) ──────────────────────────────
    if (role.id === interaction.guild.id) {
      return interaction.reply({
        embeds: [errEmbed(client, 'Invalid Role', `You cannot remove the \`@everyone\` role.`)],
        ephemeral: true,
      });
    }

    if (role.managed) {
      return interaction.reply({
        embeds: [errEmbed(client, 'Managed Role', `<@&${role.id}> is managed by an integration or bot and cannot be manually removed.`)],
        ephemeral: true,
      });
    }

    const botMember = interaction.guild.members.me;
    if (!botMember || role.position >= botMember.roles.highest.position) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setTitle(`${e('shield') || '🛡️'}  Role Hierarchy Error`)
          .setDescription(`I can't remove <@&${role.id}> because it's at or above my highest role.`)
          .addFields(
            {
              name:   `${e('role') || '🏷️'}  Target Role`,
              value:  `<@&${role.id}>\nPosition \`#${role.position}\``,
              inline: true,
            },
            {
              name:   `${e('bot') || '🤖'}  My Highest Role`,
              value:  `<@&${botMember.roles.highest.id}>\nPosition \`#${botMember.roles.highest.position}\``,
              inline: true,
            },
            {
              name:   `${e('info') || 'ℹ️'}  How to Fix`,
              value:  `Go to **Server Settings → Roles** and drag my role above <@&${role.id}>.`,
              inline: false,
            },
          )
          .setFooter(makeFooter(client))
          .setTimestamp()],
        ephemeral: true,
      });
    }

    // ── Defer before async operations ─────────────────────────────────────────
    await interaction.deferReply();

    // ── Fetch member ──────────────────────────────────────────────────────────
    let member;
    try {
      member = await interaction.guild.members.fetch(targetUser.id);
    } catch (err) {
      logError('role-remove:fetch', err);
      return interaction.editReply({
        embeds: [errEmbed(client, 'Member Not Found', `<@${targetUser.id}> is not in this server.`)],
      });
    }

    // ── Doesn't have the role ─────────────────────────────────────────────────
    if (!member.roles.cache.has(role.id)) {
      return interaction.editReply({
        embeds: [errEmbed(client, 'Role Not Assigned',
          `<@${targetUser.id}> doesn't have the <@&${role.id}> role — nothing was changed.`)],
      });
    }

    // ── Remove the role ───────────────────────────────────────────────────────
    try {
      await member.roles.remove(role, `Role removed by ${interaction.user.tag}`);
    } catch (err) {
      logError('role-remove:remove', err);

      let desc = `Failed to remove <@&${role.id}> — \`${err.message}\``;
      if (err.code === 50013) desc = `I'm missing the **Manage Roles** permission or my role is too low to remove <@&${role.id}>.`;

      return interaction.editReply({ embeds: [errEmbed(client, 'Failed to Remove Role', desc)] });
    }

    await interaction.editReply({ embeds: [okEmbed(client, member, role)] });
  },
};
