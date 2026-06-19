const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors, emojis } = require('../../config/config');
const { getAccountAge } = require('../../utils/time');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('user-info')
    .setDescription('Display detailed information about a user')
    .addUserOption(o =>
      o.setName('user').setDescription('The user to inspect (defaults to you)').setRequired(false),
    ),
  cooldown: 3000,

  async execute(interaction, client) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user') ?? interaction.user;
    // Re-fetch to ensure flags are populated
    const fullUser = await client.users.fetch(targetUser.id, { force: true }).catch(() => targetUser);

    let member = null;
    try { member = await interaction.guild.members.fetch(fullUser.id); } catch { /* not in guild */ }

    const createdTs = Math.floor(fullUser.createdAt.getTime() / 1000);

    // User flags / badges
    const flagNames = {
      ActiveDeveloper:        'Active Developer',
      BugHunterLevel1:        'Bug Hunter (Level 1)',
      BugHunterLevel2:        'Bug Hunter (Level 2)',
      CertifiedModerator:     'Discord Certified Moderator',
      HypeSquadOnlineHouse1:  'HypeSquad Bravery',
      HypeSquadOnlineHouse2:  'HypeSquad Brilliance',
      HypeSquadOnlineHouse3:  'HypeSquad Balance',
      Hypesquad:              'HypeSquad Events',
      Partner:                'Discord Partner',
      PremiumEarlySupporter:  'Early Supporter',
      Staff:                  'Discord Staff',
      TeamPseudoUser:         'Team User',
      VerifiedBot:            'Verified Bot',
      VerifiedDeveloper:      'Early Verified Bot Developer',
    };
    const flags  = fullUser.flags?.toArray() ?? [];
    const badges = flags.length ? flags.map(f => `\`${flagNames[f] ?? f}\``).join(', ') : 'None';

    const displayName = member?.displayName ?? fullUser.globalName ?? fullUser.username;

    const embed = new EmbedBuilder()
      .setColor(member?.displayHexColor && member.displayHexColor !== '#000000'
        ? member.displayHexColor
        : colors.primary)
      .setAuthor({
        name:    displayName,
        iconURL: fullUser.displayAvatarURL({ size: 64 }),
      })
      .setThumbnail(member?.displayAvatarURL({ size: 256 }) ?? fullUser.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name:   `${emojis.member} Username`,
          value:  `${fullUser.username}` + (fullUser.globalName && fullUser.globalName !== fullUser.username ? `\n${emojis.nick} *${fullUser.globalName}*` : ''),
          inline: true,
        },
        { name: `${emojis.key} User ID`,      value: `\`${fullUser.id}\``,                              inline: true },
        { name: `${emojis.bot} Bot`,           value: fullUser.bot ? `${emojis.check} Yes` : `${emojis.cross} No`, inline: true },
        { name: `${emojis.calendar} Joined Discord`, value: `<t:${createdTs}:D>\n<t:${createdTs}:R>`,  inline: true },
        { name: `${emojis.clock} Account Age`,       value: getAccountAge(fullUser.createdAt),          inline: true },
        { name: `${emojis.star} Badges`,             value: badges,                                     inline: true },
      );

    if (member) {
      const joinedTs = Math.floor(member.joinedAt.getTime() / 1000);
      const roles    = member.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => `<@&${r.id}>`);

      const statusParts = [];
      if (member.isCommunicationDisabled()) {
        const until = Math.floor(member.communicationDisabledUntilTimestamp / 1000);
        statusParts.push(`${emojis.mute} Timed out until <t:${until}:R>`);
      }
      if (member.voice?.serverMute)  statusParts.push(`${emojis.mute} Server Muted in VC`);
      if (member.voice?.serverDeaf)  statusParts.push(`${emojis.voice} Server Deafened in VC`);
      if (member.voice?.channel)     statusParts.push(`${emojis.voice} In VC: \`${member.voice.channel.name}\``);
      if (member.pending)            statusParts.push(`${emojis.warning} Pending membership screening`);

      const roleStr = roles.length
        ? roles.slice(0, 15).join(' ') + (roles.length > 15 ? ` *+${roles.length - 15} more*` : '')
        : 'No roles';

      embed.addFields(
        { name: `${emojis.join} Joined Server`,  value: `<t:${joinedTs}:D>\n<t:${joinedTs}:R>`,      inline: true },
        { name: `${emojis.crown} Highest Role`,  value: `${member.roles.highest}`,                    inline: true },
        { name: `${emojis.shield} Server Status`,
          value: statusParts.length ? statusParts.join('\n') : `${emojis.success} No restrictions`,
          inline: true },
        { name: `${emojis.role} Roles (${roles.length})`, value: roleStr, inline: false },
      );
    }

    embed.setFooter(makeFooter(client, `Requested by ${interaction.user.username}`)).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  },
};
