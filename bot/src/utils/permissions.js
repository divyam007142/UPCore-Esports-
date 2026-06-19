const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { e } = require('./emoji');

const COLORS = { error: 0xED4245, warning: 0xFEE75C };

function respond(interaction, opts) {
  if (interaction.deferred || interaction.replied) return interaction.editReply(opts);
  return interaction.reply(opts);
}

async function checkAdminRole(interaction) {
  const adminRoleId = process.env.ADMIN_ROLE_ID;
  const member = interaction.member;

  if (!member.roles.cache.has(adminRoleId)) {
    const adminRole = interaction.guild.roles.cache.get(adminRoleId);
    const roleName  = adminRole?.name ?? 'Staff';

    await respond(interaction, {
      embeds: [new EmbedBuilder()
        .setColor(COLORS.error)
        .setTitle(`${e('shield') || '🛡️'}  Access Denied`)
        .setDescription(`You need the **${roleName}** role to use this command.`)],
      ephemeral: true,
    });
    return false;
  }
  return true;
}

async function checkBotPermissions(interaction, permissions) {
  const botMember = interaction.guild.members.me;
  const missing   = permissions.filter(perm => !botMember.permissions.has(perm));

  if (missing.length > 0) {
    const names = missing.map(p => {
      const key = Object.keys(PermissionsBitField.Flags).find(k => PermissionsBitField.Flags[k] === p);
      return `\`${key ?? p}\``;
    });

    await respond(interaction, {
      embeds: [new EmbedBuilder()
        .setColor(COLORS.error)
        .setTitle(`${e('bot') || '🤖'}  Missing Permissions`)
        .setDescription(
          `I need the following permission${names.length > 1 ? 's' : ''} to run this command:\n` +
          `${names.join(', ')}\n\n` +
          `Ask a server administrator to grant me that permission.`
        )],
      ephemeral: true,
    });
    return false;
  }
  return true;
}

function isOwner(member) {
  return member.id === member.guild.ownerId;
}

async function checkOwnerProtection(interaction, target) {
  if (isOwner(target)) {
    await respond(interaction, {
      embeds: [new EmbedBuilder()
        .setColor(COLORS.error)
        .setTitle(`${e('crown') || '👑'}  Action Blocked`)
        .setDescription(`You can't perform moderation actions on the **Server Owner**.`)],
      ephemeral: true,
    });
    return false;
  }
  return true;
}

async function checkRoleHierarchy(interaction, target) {
  const botMember   = interaction.guild.members.me;
  const targetTop   = target.roles.highest;
  const botTop      = botMember.roles.highest;

  if (targetTop.position >= botTop.position) {
    await respond(interaction, {
      embeds: [new EmbedBuilder()
        .setColor(COLORS.error)
        .setTitle(`${e('shield') || '🛡️'}  Role Hierarchy Error`)
        .setDescription(
          `I can't take action on **${target.user.username}** because their highest role is equal to or above mine.`
        )
        .addFields(
          {
            name:   `${e('member') || '👤'}  Target's Highest Role`,
            value:  `<@&${targetTop.id}>\nPosition \`#${targetTop.position}\``,
            inline: true,
          },
          {
            name:   `${e('bot') || '🤖'}  My Highest Role`,
            value:  `<@&${botTop.id}>\nPosition \`#${botTop.position}\``,
            inline: true,
          },
          {
            name:   `${e('info') || 'ℹ️'}  How to Fix`,
            value:  `Go to **Server Settings → Roles** and drag my role above <@&${targetTop.id}>.`,
            inline: false,
          },
        )],
      ephemeral: true,
    });
    return false;
  }
  return true;
}

module.exports = { checkAdminRole, checkBotPermissions, checkOwnerProtection, checkRoleHierarchy };
