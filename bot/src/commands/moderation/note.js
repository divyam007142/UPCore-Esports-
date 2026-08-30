const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminRole } = require('../../utils/permissions');
const Note = require('../../models/Note');
const { colors, emojis } = require('../../config/config');
const { formatIST } = require('../../utils/time');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('note')
    .setDescription('Add a staff note to a member')
    .addUserOption(o => o.setName('user').setDescription('The user').setRequired(true))
    .addStringOption(o => o.setName('content').setDescription('Note content').setRequired(true)),
  cooldown: 3000,

  async execute(interaction, client) {
    if (!await checkAdminRole(interaction)) return;

    const targetUser = interaction.options.getUser('user');
    const content    = interaction.options.getString('content');

    // Acknowledge before the database write.
    await interaction.deferReply();

    let noteDoc = await Note.findOne({ guildId: interaction.guildId, userId: targetUser.id });
    if (!noteDoc) {
      noteDoc = new Note({ guildId: interaction.guildId, userId: targetUser.id, userTag: targetUser.tag, notes: [] });
    }

    const noteId = noteDoc.notes.length + 1;
    noteDoc.notes.push({ noteId, moderatorId: interaction.user.id, moderatorTag: interaction.user.tag, content });
    await noteDoc.save().catch(err => { throw new Error(`Failed to save note: ${err.message}`); });

    const embed = new EmbedBuilder()
      .setColor(colors.info)
      .setTitle(`${emojis.note}  Staff Note Added`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: `${emojis.member} User`,          value: `<@${targetUser.id}>\n\`${targetUser.tag}\`\n\`${targetUser.id}\``, inline: true },
        { name: `${emojis.mod} Added By`,         value: `<@${interaction.user.id}>`, inline: true },
        { name: `${emojis.case} Note #`,          value: `\`${noteId}\``, inline: true },
        { name: `${emojis.note} Content`,         value: content, inline: false },
        { name: `${emojis.calendar} Time (IST)`,  value: formatIST(), inline: true },
      )
      .setFooter(makeFooter(client, `Note #${noteId} — Staff only`))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
