const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminRole } = require('../../utils/permissions');
const { colors } = require('../../config/config');
const { e } = require('../../utils/emoji');

function footer(client) {
  return {
    text: 'UPCore Esports | #RiseUP',
    iconURL: client?.user?.displayAvatarURL({ size: 64 }) ?? undefined,
  };
}

function emoji(name) {
  return e(name);
}

function isImageAttachment(attachment) {
  const url = typeof attachment === 'string' ? attachment : attachment?.url;
  const name = typeof attachment === 'string' ? '' : attachment?.name || '';
  const contentType = typeof attachment === 'string' ? '' : attachment?.contentType || '';
  return contentType.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp|avif)(?:$|[?#])/i.test(`${name} ${url}`);
}

function attachmentUrl(attachment) {
  return typeof attachment === 'string' ? attachment : attachment?.url;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('Show the last deleted message in this channel'),
  cooldown: 3000,

  async execute(interaction, client) {
    if (!await checkAdminRole(interaction)) return;

    const sniped = client.sniped.get(interaction.channelId);
    if (!sniped) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(colors.neutral)
           .setTitle(`${emoji('snipe')}  Nothing to Snipe`)
          .setDescription('There are no recently deleted messages in this channel.\nMessages are cached until the bot restarts.')
           .setFooter(footer(client))
          ],
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({ name: sniped.author, iconURL: sniped.authorAvatar || undefined })
      .setTitle(`${emoji('snipe')}  Sniped Message`)
      .setDescription(sniped.content?.trim() ? `> ${sniped.content.slice(0, 3900).replace(/\n/g, '\n> ')}` : '> *No text content*');

    if (sniped.attachments?.length > 0) {
      const image = sniped.attachments.find(isImageAttachment);
      const imageUrl = attachmentUrl(image);
      if (imageUrl) embed.setImage(imageUrl);

      const otherAttachments = sniped.attachments
        .filter(attachment => !image || attachmentUrl(attachment) !== imageUrl)
        .slice(0, 3)
        .map((attachment, index) => {
          const url = attachmentUrl(attachment);
          const name = typeof attachment === 'string' ? `Attachment ${index + 1}` : attachment.name;
          return `[${name}](${url})`;
        });

      if (otherAttachments.length > 0) {
      embed.addFields({
        name: `${emoji('screenshot')} Attachments`,
        value: otherAttachments.join(' • '),
        inline: false,
      });
      }
    }

    embed.setFooter(footer(client));
    await interaction.reply({ embeds: [embed] });
  },
};
