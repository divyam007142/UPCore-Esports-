const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors, emojis } = require('../../config/config');
const { parseDuration, formatDuration, formatIST } = require('../../utils/time');
const Reminder = require('../../models/Reminder');
const { makeFooter } = require('../../utils/embeds');
const { e } = require('../../utils/emoji');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder for yourself')
    .addStringOption(o => o.setName('time').setDescription('Time — e.g. 10m, 1h, 2d').setRequired(true))
    .addStringOption(o => o.setName('message').setDescription('Reminder message').setRequired(true)),
  cooldown: 3000,

  async execute(interaction, client) {
    const timeStr    = interaction.options.getString('time');
    const message    = interaction.options.getString('message');
    const durationMs = parseDuration(timeStr);

    if (!durationMs || durationMs < 10000) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setAuthor({ name: 'UPCORE Esports  •  Reminder', iconURL: client.user.displayAvatarURL() })
          .setTitle(`${e('error') || emojis.error}  Invalid Duration`)
          .setDescription('Please provide a valid time. Minimum is **10 seconds**.')
          .addFields(
            { name: `${e('check') || emojis.check} Valid formats`, value: '`30s` · `10m` · `1h` · `2d`', inline: false },
            { name: `${e('cross') || emojis.cross} You entered`,   value: `\`${timeStr}\``, inline: true },
          )
          .setFooter(makeFooter(client))
          .setTimestamp()],
        ephemeral: true,
      });
    }

    const remindAt = new Date(Date.now() + durationMs);
    await Reminder.create({
      guildId: interaction.guildId, userId: interaction.user.id,
      channelId: interaction.channelId, message, remindAt,
    });

    const unixTime = Math.floor(remindAt.getTime() / 1000);

    const embed = new EmbedBuilder()
      .setColor(colors.success)
      .setAuthor({ name: 'UPCORE Esports  •  Reminder', iconURL: client.user.displayAvatarURL() })
      .setTitle(`${e('reminder') || emojis.reminder}  Reminder Set!`)
      .setDescription(
        `${e('check') || '✅'}  Got it, <@${interaction.user.id}>! I'll remind you in **${formatDuration(durationMs)}**.\n` +
        `I'll ping you in this channel and also send you a **DM** when the time's up.`
      )
      .addFields(
        { name: `${e('note') || emojis.note}  Reminder`,      value: `> ${message}`,                                              inline: false },
        { name: `${e('clock') || emojis.clock}  Duration`,    value: `\`${formatDuration(durationMs)}\``,                         inline: true  },
        { name: `${e('calendar') || emojis.calendar}  Fires`, value: `<t:${unixTime}:F>\n<t:${unixTime}:R>`,                      inline: true  },
        { name: `${e('channel') || emojis.channel}  Channel`, value: `<#${interaction.channelId}>`,                               inline: true  },
      )
      .setFooter(makeFooter(client, "I'll ping you when it's time — don't miss it!"))
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
