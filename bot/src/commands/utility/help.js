const {
  SlashCommandBuilder, EmbedBuilder, AttachmentBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
} = require('discord.js');
const { colors } = require('../../config/config');
const { e, emojiPartial } = require('../../utils/emoji');
const { makeFooter } = require('../../utils/embeds');
const path = require('path');
const fs   = require('fs');

const GUIDE_IMG_PATH = path.join(__dirname, '../../../assets/commands-guide.webp');

function getCategories() {
  return {
    moderation:  { label: 'Moderation',       description: 'Ban, kick, mute, warn, hide, purge, audit log and more',              emoji: e('ban')     },
    information: { label: 'Information',      description: 'Server info, user info, invites, member count, boosters',              emoji: e('info')    },
    ticket:      { label: 'Ticket System',    description: 'Open, close, lock, add/remove users, escalate tickets',                emoji: e('case')    },
    utility:     { label: 'Utility',          description: 'AFK, reminders, translate, starboard config, deploy and more',         emoji: e('clock')   },
    role:        { label: 'Role Management',  description: 'Add/remove roles, bulk role actions',                                  emoji: e('role')    },
    voice:       { label: 'Voice',            description: 'VC mute, deafen, kick, move, move all members',                        emoji: e('voice')   },
    fun:         { label: 'Fun',              description: 'Ship compatibility card, anime images (neko & waifu) and more',        emoji: e('fire')    },
    tournament:  { label: 'Tournament',       description: 'Prefix commands for tournament staff (screenshot, dodge, spotify…)',   emoji: e('star')    },
  };
}

function buildUsage(cmd) {
  const json    = cmd.data.toJSON();
  const options = json.options ?? [];
  if (options.length === 0) return `\`/${json.name}\``;
  const parts = options.map(o => o.required ? `<${o.name}>` : `[${o.name}]`);
  return `\`/${json.name} ${parts.join(' ')}\``;
}

function getSelectOptions(CATEGORIES) {
  return Object.entries(CATEGORIES).map(([key, val]) => {
    const opt = {
      label:       val.label,
      value:       key,
      description: val.description,
    };
    const ep = emojiPartial(
      { moderation: 'ban', information: 'info', ticket: 'case', utility: 'clock',
        role: 'role', voice: 'voice', fun: 'fire', tournament: 'star' }[key],
    );
    if (ep) opt.emoji = ep;
    return opt;
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show the UPCORE Esports Bot help menu'),
  cooldown: 5000,

  async execute(interaction, client) {
    const CATEGORIES = getCategories();
    const cmdCount   = client.commands.size;

    const catList = Object.values(CATEGORIES)
      .map(c => `${c.emoji} **${c.label}** — ${c.description}`)
      .join('\n');

    const guideAttachment = fs.existsSync(GUIDE_IMG_PATH)
      ? new AttachmentBuilder(GUIDE_IMG_PATH, { name: 'commands-guide.webp' })
      : null;

    const mainEmbed = new EmbedBuilder()
      .setColor(colors.primary)
      .setTitle(`${e('help')}  UPCORE Esports Bot — Help`)
      .setThumbnail(client.user.displayAvatarURL({ size: 128 }))
      .setDescription(
        `${e('upcore')} **Version:** \`1.0.0\`  ${e('log')} **Commands:** \`${cmdCount}\`  ${e('server')} **Servers:** \`${client.guilds.cache.size}\`\n\n` +
        `Select a category from the menu below to browse commands.\n\n` +
        catList,
      )
      .setImage(guideAttachment ? 'attachment://commands-guide.webp' : null)
      .setFooter(makeFooter(client, 'discord.gg/upcore'))
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category...')
      .addOptions(getSelectOptions(CATEGORIES));

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Support').setStyle(ButtonStyle.Link).setURL('https://x.com/UPCoreEsports'),
      new ButtonBuilder().setLabel('Discord').setStyle(ButtonStyle.Link).setURL('https://discord.gg/upcore'),
    );

    const replyOpts = { embeds: [mainEmbed], components: [row1, row2], withResponse: true };
    if (guideAttachment) replyOpts.files = [guideAttachment];
    const { resource } = await interaction.reply(replyOpts);
    const reply = resource.message;
    const collector = reply.createMessageComponentCollector({ time: 120_000 });

    collector.on('collect', async (i) => {
      try {
      if (i.user.id !== interaction.user.id) {
        const { EmbedBuilder } = require('discord.js');
        return i.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFEE75C)
              .setDescription(`${e('shield')}  **This help menu belongs to ${interaction.user}.**\nRun \`/help\` yourself to open your own.`)
              .setFooter({ text: 'UPCORE Esports  •  Support System' }),
          ],
          ephemeral: true,
        });
      }

      if (i.isStringSelectMenu()) {
        const category     = i.values[0];
        const categoryInfo = CATEGORIES[category];
        const cmds         = client.commands.filter(c => c.category === category);

        const embed = new EmbedBuilder()
          .setColor(colors.primary)
          .setTitle(`${categoryInfo.emoji}  ${categoryInfo.label}`)
          .setFooter(makeFooter(client, 'Use /command to run'))
          .setTimestamp();

        if (category === 'tournament') {
          embed.addFields(
            {
              name:  `${e('screenshot')} \`~screenshot\``,
              value: 'Ask a player to send a screenshot showing their lobby and timestamp *(Android)*. Bot replies with an example image.',
              inline: false,
            },
            {
              name:  `${e('dodge')} \`~dodge\``,
              value: 'Request screenshot or video evidence of a dodge from a player. Mention the player to ping them directly.',
              inline: false,
            },
            {
              name:  `${e('shield')} \`~wrong-channel\``,
              value: 'Notify a player they have posted in the wrong channel. Mention the player to ping them.',
              inline: false,
            },
            {
              name:  `${e('music') || '🎵'} \`~spotify\``,
              value: 'Shows how the **UPC Spotify** feature works — requirements: visible status, Spotify connected to Discord, song actively playing. No role needed, anyone can run this.',
              inline: false,
            },
          );
          embed.setDescription(
            `${e('info')} ${categoryInfo.description}\n\n` +
            `${e('log')} **4** command(s) in this category\n\n` +
            `> Prefix: \`~\`  —  Mention a player after the command to ping them.\n` +
            `> \`~spotify\` is public — no staff role required.`,
          );
        } else if (cmds.size === 0) {
          embed.setDescription(
            `${e('info')} ${categoryInfo.description}\n\n` +
            `${e('log')} No commands found in this category.`,
          );
        } else {
          const cmdLines = cmds.map(cmd => {
            const usage = buildUsage(cmd);
            return `${e('log')} ${usage}\n> ${cmd.data.description || 'No description'}`;
          }).join('\n');
          embed.setDescription(
            `${e('info')} ${categoryInfo.description}\n` +
            `${e('log')} **${cmds.size}** command(s)\n\n` +
            cmdLines,
          );
        }

        const backRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('help_back').setLabel('← Back').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setLabel('Discord').setStyle(ButtonStyle.Link).setURL('https://discord.gg/upcore'),
        );

        await i.update({ embeds: [embed], components: [backRow] });
      }

      if (i.isButton() && i.customId === 'help_back') {
        await i.update({ embeds: [mainEmbed], components: [row1, row2] });
      }
      } catch (err) {
        console.error('[Help] Collector error:', err);
        const { EmbedBuilder } = require('discord.js');
        const errEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription(`${e('error')}  **Something went wrong displaying that category. Please try again.**`)
          .setFooter({ text: 'UPCORE Esports  •  Support System' });
        const payload = { embeds: [errEmbed], ephemeral: true };
        try {
          if (i.deferred || i.replied) await i.followUp(payload);
          else await i.reply(payload);
        } catch { }
      }
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
