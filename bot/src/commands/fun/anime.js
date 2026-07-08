const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../utils/emoji');
const { makeFooter } = require('../../utils/embeds');
const { colors } = require('../../config/config');

// Node < 18 doesn't have global fetch — fall back safely
const fetchFn = globalThis.fetch ?? require('node-fetch');

const TYPES = ['neko', 'waifu'];
const LABELS = { neko: '🐱 Neko', waifu: '👧 Waifu' };
const COLORS = { neko: 0xff9ecd, waifu: 0xff6eb4 };
const CAPTIONS = {
  neko:  'Here is your cute neko',
  waifu: 'Here is your cute anime girl',
};

// Primary + fallback sources per type
const SOURCES = {
  neko: [
    () => fetchImage('https://api.waifu.pics/sfw/neko', 'url'),
    () => fetchImage('https://nekos.best/api/v2/neko', 'results.0.url'),
  ],
  waifu: [
    () => fetchImage('https://api.waifu.pics/sfw/waifu', 'url'),
    () => fetchImage('https://nekos.best/api/v2/waifu', 'results.0.url'),
  ],
};

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

async function fetchImage(url, urlPath, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DiscordBot/1.0; +https://discord.com)',
        'Accept': 'application/json',
      },
    });

    if (res.status === 403) {
      throw new Error('403 Forbidden — request blocked (headers or IP)');
    }
    if (res.status === 429) {
      throw Object.assign(new Error('Rate limited'), { rateLimited: true });
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const imageUrl = getPath(data, urlPath);
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('Malformed response: missing image URL');
    }
    return imageUrl;
  } catch (err) {
    // Surface the real underlying cause (DNS/connection/TLS errors hide here)
    if (err.cause) {
      console.error(`[/anime] fetch cause for ${url}:`, err.cause);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function getImageWithFallback(type) {
  const sources = SOURCES[type];
  let lastErr;
  for (let i = 0; i < sources.length; i++) {
    try {
      return await sources[i]();
    } catch (err) {
      lastErr = err;
      if (err.rateLimited) await new Promise(r => setTimeout(r, 500));
      console.error(`[/anime] source ${i} failed for type=${type}:`, err.message);
    }
  }
  throw lastErr;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anime')
    .setDescription('Fetch a random anime image — Staff only')
    .addStringOption(o =>
      o.setName('type')
        .setDescription('Image category (default: random)')
        .setRequired(false)
        .addChoices(
          { name: '🐱 Neko',  value: 'neko' },
          { name: '👧 Waifu', value: 'waifu' },
        ),
    ),
  cooldown: 3000,
  category: 'fun',
  async execute(interaction, client) {
    // Staff-only guard (support role OR admin role)
    const supportRoleId = process.env.TICKET_SUPPORT_ROLE_ID;
    const adminRoleId   = process.env.ADMIN_ROLE_ID;
    const isStaff =
      (supportRoleId && interaction.member?.roles.cache.has(supportRoleId)) ||
      (adminRoleId   && interaction.member?.roles.cache.has(adminRoleId));

    if (!isStaff) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setDescription(`${e('error') || '❌'}  **This command is for Staff only.**`)
          .setFooter(makeFooter(client))],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();

    const type = interaction.options.getString('type')
      ?? TYPES[Math.floor(Math.random() * TYPES.length)];

    let imageUrl;
    try {
      imageUrl = await getImageWithFallback(type);
    } catch (err) {
      console.error('[/anime] all sources failed:', err);
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setDescription(`${e('error') || '❌'}  Failed to fetch image. Try again in a moment.`)
          .setFooter(makeFooter(client))],
      });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS[type] ?? 0xff6eb4)
      .setAuthor({
        name:    LABELS[type],
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setImage(imageUrl)
      .setFooter(makeFooter(client, `Requested by ${interaction.user.username}`))
      .setTimestamp();

    const saveButton = new ButtonBuilder()
      .setCustomId(`anime_save_${interaction.user.id}`)
      .setLabel('Save to DMs')
      .setEmoji(e('reminder') || '💌')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(saveButton);

    const reply = await interaction.editReply({
      content: `${e('fire') || '✨'}  ${CAPTIONS[type]}, ${interaction.user}!`,
      embeds: [embed],
      components: [row],
    });

    // Listen for the button click (5 minute window)
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000,
    });

    collector.on('collect', async (btnInteraction) => {
      if (btnInteraction.customId !== `anime_save_${interaction.user.id}`) return;

      if (btnInteraction.user.id !== interaction.user.id) {
        return btnInteraction.reply({
          content: `${e('error') || '❌'} Only ${interaction.user} can save this image.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(COLORS[type] ?? 0xff6eb4)
          .setAuthor({ name: LABELS[type] })
          .setImage(imageUrl)
          .setFooter(makeFooter(client, 'Saved from your server'))
          .setTimestamp();

        await btnInteraction.user.send({ embeds: [dmEmbed] });

        await btnInteraction.reply({
          content: `${e('success') || '✅'} Sent to your DMs!`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        console.error('[/anime] failed to DM user:', err.message);
        await btnInteraction.reply({
          content: `${e('error') || '❌'} Couldn't DM you — check your privacy settings allow DMs from server members.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    });

    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        ButtonBuilder.from(saveButton).setDisabled(true),
      );
      try {
        await interaction.editReply({ components: [disabledRow] });
      } catch {
        // message may have been deleted — ignore
      }
    });
  },
};
