const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-info')
    .setDescription('Display information about a role')
    .addRoleOption(o => o.setName('role').setDescription('The role').setRequired(true)),
  cooldown: 3000,

  async execute(interaction, client) {
    const role        = interaction.options.getRole('role');
    const createdTs   = Math.floor(role.createdTimestamp / 1000);
    const memberCount = interaction.guild.members.cache.filter(m => m.roles.cache.has(role.id)).size;

    const perms = role.permissions.toArray();
    const keyPerms = ['Administrator', 'ManageGuild', 'ManageChannels', 'ManageRoles',
      'ManageMessages', 'BanMembers', 'KickMembers', 'MentionEveryone']
      .filter(p => perms.includes(p))
      .map(p => `\`${p}\``);

    const embed = new EmbedBuilder()
      .setColor(role.color || colors.primary)
      .setTitle(`${emojis.role}  ${role.name}`)
      .addFields(
        { name: `${emojis.key}  Role ID`,       value: `\`${role.id}\``,                        inline: true },
        { name: `${emojis.info}  Color`,         value: `\`${role.hexColor}\``,                  inline: true },
        { name: `${emojis.stats}  Position`,     value: `\`${role.position}\``,                  inline: true },
        { name: `${emojis.member}  Members`,     value: `\`${memberCount}\``,                    inline: true },
        { name: `${emojis.calendar}  Created`,   value: `<t:${createdTs}:D>\n<t:${createdTs}:R>`, inline: true },
        {
          name:   `${emojis.config}  Properties`,
          value:  [
            role.mentionable ? `${emojis.check} Mentionable` : `${emojis.cross} Not Mentionable`,
            role.hoist       ? `${emojis.check} Hoisted`     : `${emojis.cross} Not Hoisted`,
            role.managed     ? `${emojis.bot} Managed`       : '',
          ].filter(Boolean).join('\n') || 'None',
          inline: true,
        },
        {
          name:   `${emojis.shield}  Key Permissions`,
          value:  keyPerms.length ? keyPerms.join(', ') : 'None',
          inline: false,
        },
      )
      .setFooter(makeFooter(client, `Requested by ${interaction.user.username}`))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
