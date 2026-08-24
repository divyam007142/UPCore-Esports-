const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { colors } = require('../../config/config');
const { e } = require('../../utils/emoji');
const { makeFooter } = require('../../utils/embeds');

// Unofficial Google Translate endpoint — same engine as translate.google.co.in
const GOOGLE_URL = 'https://translate.googleapis.com/translate_a/single';

const LANGUAGES = [
  { name: 'Arabic',     value: 'ar' },
  { name: 'Bengali',    value: 'bn' },
  { name: 'Chinese',    value: 'zh' },
  { name: 'Dutch',      value: 'nl' },
  { name: 'English',    value: 'en' },
  { name: 'French',     value: 'fr' },
  { name: 'German',     value: 'de' },
  { name: 'Greek',      value: 'el' },
  { name: 'Hebrew',     value: 'he' },
  { name: 'Hindi',      value: 'hi' },
  { name: 'Indonesian', value: 'id' },
  { name: 'Italian',    value: 'it' },
  { name: 'Japanese',   value: 'ja' },
  { name: 'Korean',     value: 'ko' },
  { name: 'Malay',      value: 'ms' },
  { name: 'Polish',     value: 'pl' },
  { name: 'Portuguese', value: 'pt' },
  { name: 'Russian',    value: 'ru' },
  { name: 'Spanish',    value: 'es' },
  { name: 'Swedish',    value: 'sv' },
  { name: 'Thai',       value: 'th' },
  { name: 'Turkish',    value: 'tr' },
  { name: 'Ukrainian',  value: 'uk' },
  { name: 'Vietnamese', value: 'vi' },
  { name: 'Urdu',       value: 'ur' },
];

// Language code → display name lookup
const LANG_NAME = Object.fromEntries(LANGUAGES.map(l => [l.value, l.name]));

module.exports = {
  category: 'utility',
  cooldown: 10000,
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translate text into another language using LibreTranslate')
    .addStringOption(o =>
      o.setName('message')
        .setDescription('The text you want to translate')
        .setRequired(true)
        .setMaxLength(1500),
    )
    .addStringOption(o => {
      o.setName('to')
        .setDescription('Target language')
        .setRequired(true);
      for (const lang of LANGUAGES) {
        o.addChoices({ name: lang.name, value: lang.value });
      }
      return o;
    }),

  async execute(interaction, client) {
    const text   = interaction.options.getString('message');
    const target = interaction.options.getString('to');

    await interaction.deferReply();

    let translated, detectedLang;

    try {
      const { data } = await axios.get(GOOGLE_URL, {
        params: {
          client: 'gtx',
          sl:     'auto',
          tl:     target,
          dt:     't',
          q:      text,
        },
        timeout: 10_000,
      });

      // Response: [ [ [translated, original, ...], ... ], null, detectedLang, ... ]
      translated   = data[0].map(seg => seg[0]).join('');
      detectedLang = data[2] ?? null;
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Unknown error';
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setTitle(`${e('error') || '❌'}  Translation Failed`)
          .setDescription(`The translation service returned an error:\n\`\`\`${msg}\`\`\``)
          .setFooter(makeFooter(client))
          .setTimestamp()],
      });
    }

    const fromLabel = detectedLang ? (LANG_NAME[detectedLang] ?? detectedLang.toUpperCase()) : 'Auto-detected';
    const toLabel   = LANG_NAME[target] ?? target;

    const embed = new EmbedBuilder()
      .setColor(colors.primary ?? 0x5865F2)
      .setAuthor({
        name:    interaction.user.username,
        iconURL: interaction.user.displayAvatarURL({ size: 128 }),
      })
      .setTitle(`${e('translate') || '🌐'}  Translation`)
      .addFields(
        {
          name:   `${e('info') || 'ℹ️'}  Original  ·  ${fromLabel}`,
          value:  `\`\`\`${text.slice(0, 1000)}\`\`\``,
          inline: false,
        },
        {
          name:   `${e('check') || '✅'}  Translated  ·  ${toLabel}`,
          value:  `\`\`\`${translated.slice(0, 1000)}\`\`\``,
          inline: false,
        },
      )
      .setFooter(makeFooter(client))
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
