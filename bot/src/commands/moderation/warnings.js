const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminRole } = require('../../utils/permissions');
const Warning = require('../../models/Warning');
const { colors, emojis } = require('../../config/config');
const { formatIST } = require('../../utils/time');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View all warnings for a member')
    .addUserOption(o => o.setName('user').setDescription('The user to check').setRequired(true)),
  cooldown: 3000,

  async execute(interaction, client) {
    if (!await checkAdminRole(interaction)) return;

    const targetUser  = interaction.options.getUser('user');
    await interaction.deferReply();

    const warningDoc  = await Warning.findOne({ guildId: interaction.guildId, userId: targetUser.id });
    const activeWarns = warningDoc?.warnings.filter(w => w.active) || [];
    const totalWarns  = warningDoc?.warnings.length || 0;

    const riskLabel = activeWarns.length >= 5 ? 'High Risk'
      : activeWarns.length >= 3 ? 'Elevated'
      : 'Low';

    const embed = new EmbedBuilder()
      .setColor(activeWarns.length >= 3 ? colors.error : activeWarns.length > 0 ? colors.warning : colors.success)
      .setTitle(`${emojis.warn}  Warnings — ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setFooter(makeFooter(client))
      .setTimestamp();

    if (activeWarns.length === 0) {
      embed.setDescription(`${emojis.success}  **${targetUser.tag}** has no active warnings. Clean record!`);
    } else {
      embed.setDescription(
        `${emojis.member} <@${targetUser.id}> · \`${targetUser.tag}\` · \`${targetUser.id}\``
      );
      embed.addFields(
        { name: `${emojis.warn} Active Warnings`, value: `\`${activeWarns.length}\``, inline: true },
        { name: `${emojis.log} Total (all time)`, value: `\`${totalWarns}\``, inline: true },
        { name: `${emojis.info} Risk Level`,      value: riskLabel, inline: true },
      );

      activeWarns.slice(0, 10).forEach(w => {
        embed.addFields({
          name: `#${w.warnId}  ·  ${w.reason.length > 55 ? w.reason.slice(0, 54) + '…' : w.reason}`,
          value: [
            `> ${emojis.mod || '🛡️'} **Mod:** \`${w.moderatorTag}\``,
            `> ${emojis.clock || '🕐'} **Date:** ${formatIST(w.createdAt)}`,
          ].join('\n'),
          inline: false,
        });
      });

      if (activeWarns.length > 10) {
        embed.addFields({ name: `${emojis.info} Note`, value: `Showing 10 of ${activeWarns.length} active warnings.`, inline: false });
      }

      embed.addFields({
        name: `${emojis.info} How to remove a warning`,
        value: `Run \`/unwarn\`, select the user, and enter the **#number** shown above as \`warn_id\`.\nExample: to remove **#2**, use \`warn_id: 2\`.`,
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
