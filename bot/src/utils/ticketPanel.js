const {
  EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder,
} = require('discord.js');
const path = require('path');
const GuildConfig = require('../models/GuildConfig');
const { e, emojiPartial } = require('./emoji');

function buildPanel(client) {
  const bannerFile = new AttachmentBuilder(
    path.join(__dirname, '../../assets/banner.gif'),
    { name: 'banner.gif' }
  );

  function selectEmoji(appKey, fallbackId, fallbackName) {
    const partial = emojiPartial(appKey);
    if (partial) return partial;
    if (fallbackId) return { id: fallbackId, name: fallbackName };
    return undefined;
  }

  const embed = new EmbedBuilder()
    .setColor(0x000000)
    .setAuthor({
      name:    'UPCore Esports  •  Support Center',
      iconURL: client.user.displayAvatarURL({ size: 256 }),
    })
    .setDescription('Create a ticket for the reason that best fits your issue.')
    .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
    .setImage('attachment://banner.gif')
    .setFooter({ text: 'UPCore  •  Support  |  #RiseUP' });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('menu_ticket_category')
    .setPlaceholder('Select a category...')
    .addOptions(
      {
        label:       'General Support',
        value:       'general',
        description: 'Account issues, questions, general help',
        emoji:       selectEmoji('help', null, null) ?? { name: '🎫' },
      },
      {
        label:       'Tournament Support',
        value:       'tournament',
        description: 'Registration, match disputes, bracket issues',
        emoji:       { id: '1342753907604193330', name: 'trophy2' },
      },
      {
        label:       'Club Join Request',
        value:       'club',
        description: 'Apply to join or create a club',
        emoji:       { id: '1342753911294918748', name: 'club' },
      },
      {
        label:       'Business Enquiries',
        value:       'business',
        description: 'Sponsorships, collaborations, partnerships',
        emoji:       { id: '1342753885248557056', name: 'news' },
      },
      {
        label:       'Others',
        value:       'others',
        description: "Anything that doesn't fit the above categories",
        emoji:       selectEmoji('note', null, null) ?? { name: '📋' },
      },
    );

  const row = new ActionRowBuilder().addComponents(menu);
  return { embed, row, files: [bannerFile] };
}

async function deleteOldPanel(client, guildId) {
  const config = await GuildConfig.findOne({ guildId }).catch(() => null);
  if (!config?.ticket?.panelMessageId || !config?.ticket?.panelChannelId) return;
  try {
    const ch  = await client.channels.fetch(config.ticket.panelChannelId).catch(() => null);
    if (!ch) return;
    const msg = await ch.messages.fetch(config.ticket.panelMessageId).catch(() => null);
    if (msg) await msg.delete().catch(() => null);
  } catch { }
}

async function sendPanel(client, guildId) {
  const channelId = process.env.TICKET_PANEL_ID;
  if (!channelId) return null;

  const ch = await client.channels.fetch(channelId).catch(() => null);
  if (!ch) return null;

  const { embed, row, files } = buildPanel(client);
  const msg = await ch.send({ embeds: [embed], components: [row], files });

  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: { 'ticket.panelMessageId': msg.id, 'ticket.panelChannelId': channelId } },
    { upsert: true, new: true }
  ).catch(() => null);

  return msg;
}

module.exports = { buildPanel, sendPanel, deleteOldPanel };
