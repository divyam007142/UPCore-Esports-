const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const TicketBlacklist = require('../../models/TicketBlacklist');
const { isTicketAdmin, accessDeniedError } = require('../../utils/ticketPermissions');
const { logTicketAction } = require('../../utils/ticketLogger');
const { e } = require('../../utils/emoji');

module.exports = {
  category: 'ticket',
  data: new SlashCommandBuilder()
    .setName('whitelist-user')
    .setDescription('Remove a user from the ticket blacklist (staff only)')
    .addUserOption(o => o.setName('user').setDescription('User to whitelist').setRequired(true)),

  async execute(interaction, client) {
    if (!isTicketAdmin(interaction)) return accessDeniedError(interaction);

    const target = interaction.options.getUser('user');
    const entry  = await TicketBlacklist.findOneAndDelete({ guildId: interaction.guild.id, userId: target.id }).catch(() => null);

    if (!entry) {
      return interaction.reply({ content: `${e('warning') || '⚠️'}  **${target.tag}** is not on the ticket blacklist.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${e('success') || '✅'}  User Whitelisted`)
      .setDescription(`**${target.tag}** has been removed from the blacklist and can open tickets again.`)
      .addFields(
        { name: `${e('member') || '👤'}  User`, value: `${target.tag}\n\`${target.id}\``, inline: true },
        { name: `${e('mod') || '🛡️'}  By`,     value: interaction.user.tag,              inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'UPCORE Esports  •  Blacklist System' });

    await interaction.reply({ embeds: [embed] });

    await logTicketAction(client, 'BLACKLIST_REMOVE', {
      title: 'User Whitelisted',
      thumbnail: target.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: `${e('member') || '👤'}  User`, value: `${target.tag}\n\`${target.id}\``, inline: true },
        { name: `${e('mod') || '🛡️'}  By`,     value: interaction.user.tag,              inline: true },
      ],
    });
  },
};
