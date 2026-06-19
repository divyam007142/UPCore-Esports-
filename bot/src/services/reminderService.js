const Reminder = require('../models/Reminder');
const { EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');
const { formatIST } = require('../utils/time');
const { e } = require('../utils/emoji');

let reminderInterval = null;

function startReminderService(client) {
  if (reminderInterval) clearInterval(reminderInterval);

  reminderInterval = setInterval(async () => {
    try {
      const now = new Date();
      const due = await Reminder.find({ active: true, remindAt: { $lte: now } });

      for (const reminder of due) {
        try {
          const fireEmbed = new EmbedBuilder()
            .setColor(colors.primary)
            .setAuthor({ name: 'UPCORE Esports  •  Reminder', iconURL: client.user.displayAvatarURL() })
            .setTitle(`${e('reminder') || '🔔'}  Hey, time's up!`)
            .setDescription(
              `<@${reminder.userId}>, you asked me to remind you and the moment is here!\n\n` +
              `${e('note') || '📝'}  **Your Reminder:**\n> ${reminder.message}`
            )
            .addFields(
              { name: `${e('calendar') || '📅'}  Set At`,  value: `\`${formatIST(reminder.createdAt)}\``, inline: true },
              { name: `${e('clock') || '⏰'}  Due At`,     value: `\`${formatIST(reminder.remindAt)}\``,  inline: true },
            )
            .setFooter({ text: 'UPCore  •  Reminder Service  |  #RiseUP' })
            .setTimestamp();

          const channel = client.channels.cache.get(reminder.channelId);
          if (channel) {
            await channel.send({ content: `<@${reminder.userId}>`, embeds: [fireEmbed] });
          }

          try {
            const user = await client.users.fetch(reminder.userId);
            const dmEmbed = new EmbedBuilder()
              .setColor(colors.primary)
              .setAuthor({ name: 'UPCORE Esports  •  Reminder', iconURL: client.user.displayAvatarURL() })
              .setTitle(`${e('reminder') || '🔔'}  Reminder — Time's Up!`)
              .setDescription(
                `Hey there! You asked me to remind you and the time has come.\n\n` +
                `${e('note') || '📝'}  **Your Reminder:**\n> ${reminder.message}`
              )
              .addFields(
                { name: `${e('calendar') || '📅'}  Set At`,  value: `\`${formatIST(reminder.createdAt)}\``, inline: true },
                { name: `${e('clock') || '⏰'}  Due At`,     value: `\`${formatIST(reminder.remindAt)}\``,  inline: true },
              )
              .setFooter({ text: 'UPCore  •  Reminder Service  |  #RiseUP' })
              .setTimestamp();
            await user.send({ embeds: [dmEmbed] });
          } catch { }

          reminder.active = false;
          await reminder.save();
        } catch {
          reminder.active = false;
          await reminder.save();
        }
      }
    } catch { }
  }, 15000);
}

module.exports = { startReminderService };
