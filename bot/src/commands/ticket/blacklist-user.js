const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const TicketBlacklist = require('../../models/TicketBlacklist');
const { isTicketAdmin, accessDeniedError } = require('../../utils/ticketPermissions');
const { logTicketAction } = require('../../utils/ticketLogger');
const { e } = require('../../utils/emoji');

const IST = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

module.exports = {
  category: 'ticket',
  data: new SlashCommandBuilder()
    .setName('blacklist-user')
    .setDescription('Manage the ticket blacklist (staff only)')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Block a user from opening tickets')
        .addUserOption(o => o.setName('user').setDescription('User to blacklist').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for blacklisting').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('List all blacklisted users')
    ),

  async execute(interaction, client) {
    if (!isTicketAdmin(interaction)) return accessDeniedError(interaction);

    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') ?? 'No reason provided';

      if (target.bot)             return interaction.reply({ content: '❌ You cannot blacklist a bot.', ephemeral: true });
      if (target.id === interaction.user.id) return interaction.reply({ content: '❌ You cannot blacklist yourself.', ephemeral: true });

      const existing = await TicketBlacklist.findOne({ guildId: interaction.guild.id, userId: target.id }).catch(() => null);
      if (existing) return interaction.reply({ content: `⚠️ **${target.tag}** is already blacklisted.`, ephemeral: true });

      await TicketBlacklist.create({
        guildId:           interaction.guild.id,
        userId:            target.id,
        reason,
        blacklistedBy:     interaction.user.id,
        blacklistedByName: interaction.user.tag,
        blacklistedAt:     IST(),
      });

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`🚫  User Blacklisted`)
        .addFields(
          { name: `${e('member') || '👤'}  User`,  value: `${target.tag}\n\`${target.id}\``,  inline: true },
          { name: `${e('mod') || '🛡️'}  By`,       value: interaction.user.tag,               inline: true },
          { name: `${e('log') || '📝'}  Reason`,    value: reason,                             inline: false },
        )
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: 'UPCORE Esports  •  Blacklist System' });

      await interaction.reply({ embeds: [embed] });

      await logTicketAction(client, 'BLACKLIST_ADD', {
        title: `User Blacklisted`,
        thumbnail: target.displayAvatarURL({ dynamic: true }),
        fields: [
          { name: `${e('member') || '👤'}  User`,  value: `${target.tag}\n\`${target.id}\``, inline: true },
          { name: `${e('mod') || '🛡️'}  By`,       value: interaction.user.tag,              inline: true },
          { name: `${e('log') || '📝'}  Reason`,    value: reason,                            inline: false },
        ],
      });
    }

    else if (sub === 'show') {
      const entries = await TicketBlacklist.find({ guildId: interaction.guild.id }).catch(() => []);

      if (!entries.length) {
        const embed = new EmbedBuilder()
          .setColor(0x2ECC71)
          .setTitle('🚫  Blacklist')
          .setDescription(`> ${e('success') || '✅'}  The blacklist is currently empty.`)
          .setTimestamp()
          .setFooter({ text: 'UPCORE Esports  •  Blacklist System' });
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const lines = entries.map((data, i) =>
        `**${i + 1}.** <@${data.userId}> (\`${data.userId}\`)\n` +
        `> Reason: ${data.reason}\n` +
        `> By: ${data.blacklistedByName}  •  ${data.blacklistedAt}`
      );

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`🚫  Blacklist — ${entries.length} user${entries.length !== 1 ? 's' : ''}`)
        .setDescription(lines.join('\n\n').slice(0, 4096))
        .setTimestamp()
        .setFooter({ text: 'UPCORE Esports  •  Blacklist System' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
