const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminRole } = require('../../utils/permissions');
const Note = require('../../models/Note');
const { colors, emojis } = require('../../config/config');
const { formatIST } = require('../../utils/time');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('note-show')
    .setDescription('View all staff notes for a member')
    .addUserOption(o => o.setName('user').setDescription('The user').setRequired(true)),
  cooldown: 3000,

  async execute(interaction, client) {
    if (!await checkAdminRole(interaction)) return;

    const targetUser = interaction.options.getUser('user');
    await interaction.deferReply({ ephemeral: true });

    const noteDoc    = await Note.findOne({ guildId: interaction.guildId, userId: targetUser.id });

    const embed = new EmbedBuilder()
      .setColor(colors.info)
      .setTitle(`${emojis.note}  Staff Notes — ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setFooter(makeFooter(client, 'Staff Only'))
      .setTimestamp();

    if (!noteDoc || noteDoc.notes.length === 0) {
      embed.setDescription(`${emojis.success}  No staff notes found for this user.`);
    } else {
      embed.setDescription(`${emojis.member} <@${targetUser.id}> · \`${targetUser.tag}\` · \`${targetUser.id}\``);
      embed.addFields({ name: `${emojis.note} Total Notes`, value: `\`${noteDoc.notes.length}\``, inline: true });

      noteDoc.notes.slice(0, 10).forEach(n => {
        embed.addFields({
          name: `${emojis.case} Note #${n.noteId}`,
          value: [
            `> ${emojis.log} **Content:** ${n.content}`,
            `> ${emojis.mod} **By:** \`${n.moderatorTag}\``,
            `> ${emojis.calendar} **Date:** ${formatIST(n.createdAt)}`,
          ].join('\n'),
          inline: false,
        });
      });

      if (noteDoc.notes.length > 10) {
        embed.addFields({ name: `${emojis.info} Note`, value: `Showing 10 of ${noteDoc.notes.length} notes`, inline: false });
      }
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
