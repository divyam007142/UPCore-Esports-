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
    .setTitle(`${e('check') || '✅'}  Role Added`)
    .setDescription(`Successfully added <@&${role.id}> to <@${member.id}>.`)
    .addFields(
      { name: `${e('member') || '👤'}  Member`,    value: `${member} \`${member.user.tag}\``, inline: true },
      { name: `${e('role')   || '🏷️'}  Role`,      value: `<@&${role.id}> \`${role.name}\``, inline: true },
    )
    .setFooter(makeFooter(client))
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-add')
    .setDescription('Add a role to a member')
    .addUserOption(o => o.setName('user').setDescription('The user').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('The role to add').setRequired(true)),
  cooldown: 3000,

  async execute(interaction, client) {
    // ── Permission checks (before defer so errors stay ephemeral) ─────────────
    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ManageRoles])) return;

    const targetUser = interaction.options.getUser('user');
    const role       = interaction.options.getRole('role');

    // ── Quick validation (no defer needed — all sync) ─────────────────────────
    if (role.id === interaction.guild.id) {
      return interaction.reply({
        embeds: [errEmbed(client, 'Invalid Role', `You cannot assign the \`@everyone\` role.`)],
        ephemeral: true,
      });
    }

    if (role.managed) {
      return interaction.reply({
        embeds: [errEmbed(client, 'Managed Role', `<@&${role.id}> is managed by an integration or bot and cannot be manually assigned.`)],
        ephemeral: true,
      });
    }

    const botMember = interaction.guild.members.me;
    if (!botMember || role.position >= botMember.roles.highest.position) {
      return interaction.reply({
        embeds: [errEmbed(client, 'Role Hierarchy Error',
          `<@&${role.id}> is at or above my highest role — I can't assign it.\n` +
          `Move my role above **${role.name}** in **Server Settings → Roles**.`)],
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
      logError('role-add:fetch', err);
      return interaction.editReply({
        embeds: [errEmbed(client, 'Member Not Found', `<@${targetUser.id}> is not in this server.`)],
      });
    }

    // ── Already has the role ──────────────────────────────────────────────────
    if (member.roles.cache.has(role.id)) {
      return interaction.editReply({
        embeds: [errEmbed(client, 'Role Already Assigned',
          `<@${targetUser.id}> already has the <@&${role.id}> role.`)],
      });
    }

    // ── Assign the role ───────────────────────────────────────────────────────
    try {
      await member.roles.add(role, `Role added by ${interaction.user.tag}`);
    } catch (err) {
      logError('role-add:add', err);

      let desc = `Failed to add <@&${role.id}> — \`${err.message}\``;
      if (err.code === 50013) desc = `I'm missing the **Manage Roles** permission or my role is too low to assign <@&${role.id}>.`;

      return interaction.editReply({ embeds: [errEmbed(client, 'Failed to Add Role', desc)] });
    }

    await interaction.editReply({ embeds: [okEmbed(client, member, role)] });
  },
};
