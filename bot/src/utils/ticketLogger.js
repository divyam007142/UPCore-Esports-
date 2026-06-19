const { EmbedBuilder } = require('discord.js');
const { e } = require('./emoji');

const CATEGORY_LABELS = {
  general:    'General Support',
  tournament: 'Tournament Support',
  club:       'Club Join Request',
  business:   'Business Enquiries',
  others:     'Others',
};

const CATEGORY_EMOJIS = {
  general:    () => e('help')       || '🎫',
  tournament: () => e('tournament') || '🏆',
  club:       () => '<:club:1342753911294918748>',
  business:   () => '<:news:1342753885248557056>',
  others:     () => e('note')       || '📋',
};

// Resolved at runtime so app emoji cache is populated
function getTypeMeta(type) {
  const map = {
    TICKET_OPEN:       { icon: e('case')       || '🎫',  color: 0x00D4FF, label: 'Ticket Opened'           },
    TICKET_CLOSE:      { icon: e('lock')       || '🔒',  color: 0xED4245, label: 'Ticket Closed'            },
    TICKET_DELETE:     { icon: e('purge')      || '🗑️', color: 0xED4245, label: 'Ticket Deleted'            },
    TICKET_CLAIM:      { icon: e('mod')        || '🙋',  color: 0x00D4FF, label: 'Ticket Claimed'           },
    TICKET_UNCLAIM:    { icon: e('unlock')     || '🙅',  color: 0xFEE75C, label: 'Ticket Unclaimed'         },
    TICKET_LOCK:       { icon: e('lock')       || '🔐',  color: 0xFEE75C, label: 'Ticket Locked'            },
    TICKET_UNLOCK:     { icon: e('unlock')     || '🔓',  color: 0x2ECC71, label: 'Ticket Unlocked'          },
    TICKET_TRANSCRIPT: { icon: e('note')       || '📄',  color: 0x9B59B6, label: 'Transcript Generated'     },
    TICKET_RENAME:     { icon: e('nick')       || '✏️', color: 0x5865F2, label: 'Ticket Renamed'            },
    TICKET_ADD:        { icon: e('member')     || '➕',  color: 0x2ECC71, label: 'User Added to Ticket'     },
    TICKET_REMOVE:     { icon: e('cross')      || '➖',  color: 0xF39C12, label: 'User Removed from Ticket' },
    BLACKLIST_ADD:     { icon: e('ban')        || '🚫',  color: 0xED4245, label: 'User Blacklisted'         },
    BLACKLIST_REMOVE:  { icon: e('check')      || '✅',  color: 0x2ECC71, label: 'User Whitelisted'         },
    TICKET_SPECIAL:    { icon: e('star')       || '⭐',  color: 0x9B59B6, label: 'Moved to Special Category' },
    TICKET_ESCALATE:   { icon: e('case')       || '🎫', color: 0x5865F2, label: 'Ticket Escalated'            },
  };
  return map[type] ?? { icon: e('info') || 'ℹ️', color: 0x3498DB, label: type };
}

async function logTicketAction(client, type, data = {}) {
  const channelId = process.env.TICKET_LOG_CHANNEL_ID;
  if (!channelId) return;

  try {
    const ch = await client.channels.fetch(channelId).catch(() => null);
    if (!ch) return;

    const meta = getTypeMeta(type);
    const ts   = Math.floor(Date.now() / 1000);

    const embed = new EmbedBuilder()
      .setColor(meta.color)
      .setTitle(`${meta.icon}  ${data.title ?? meta.label}`)
      .setAuthor({
        name:    'UPCORE Esports  •  Ticket Logs',
        iconURL: client.user.displayAvatarURL(),
      })
      .setTimestamp();

    if (data.thumbnail) embed.setThumbnail(data.thumbnail);
    if (data.description) embed.setDescription(data.description);
    if (data.fields?.length) embed.addFields(data.fields);

    embed.addFields({
      name:   `${e('calendar') || '📅'}  Timestamp`,
      value:  `<t:${ts}:F>  (<t:${ts}:R>)`,
      inline: false,
    });

    embed.setFooter({
      text:    'UPCORE Esports  •  Ticket System',
      iconURL: client.user.displayAvatarURL(),
    });

    await ch.send({ embeds: [embed] });
  } catch { /* never crash on log failure */ }
}

function categoryLabel(cat) { return CATEGORY_LABELS[cat] ?? cat; }
function categoryEmoji(cat) { return (CATEGORY_EMOJIS[cat] ?? (() => '🎫'))(); }

module.exports = { logTicketAction, categoryLabel, categoryEmoji };
