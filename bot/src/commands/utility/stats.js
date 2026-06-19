const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const os = require('os');
const { colors } = require('../../config/config');
const { e } = require('../../utils/emoji');
const { makeFooter } = require('../../utils/embeds');

function latencyLabel(ms) {
  if (ms < 100) return 'Excellent';
  if (ms < 200) return 'Good';
  if (ms < 500) return 'Moderate';
  return 'High';
}

function getMemoryMB() {
  const mem = process.memoryUsage();
  return {
    rss:  (mem.rss  / 1024 / 1024).toFixed(1),
    heap: (mem.heapUsed / 1024 / 1024).toFixed(1),
    total: (os.totalmem() / 1024 / 1024 / 1024).toFixed(1),
  };
}

function getCpuPercent() {
  const cpus = os.cpus();
  let total = 0, idle = 0;
  for (const cpu of cpus) {
    for (const t of Object.values(cpu.times)) total += t;
    idle += cpu.times.idle;
  }
  return (((total - idle) / total) * 100).toFixed(1);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription("Check the bot's latency, uptime and system stats"),
  cooldown: 3000,

  async execute(interaction) {
    const client = interaction.client;
    const start     = Date.now();
    await interaction.deferReply();
    const roundtrip = Date.now() - start;
    const mem       = getMemoryMB();
    const cpu       = getCpuPercent();
    const uptimeSec = Math.floor((Date.now() - client.uptime) / 1000);

    const color = roundtrip < 200 ? colors.success : roundtrip < 500 ? colors.warning : colors.error;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${e('stats')} Bot Stats`)
      .setDescription('Current bot performance stats.')
      .addFields(
        { name: `${e('clock')} Roundtrip`,      value: `\`${roundtrip}ms\``,             inline: true },
        { name: `${e('link')} WebSocket`,        value: `\`${client.ws.ping}ms\``,        inline: true },
        { name: `${e('stats')} Status`,          value: latencyLabel(roundtrip),           inline: true },
        { name: `${e('upcore')} Uptime`,         value: `<t:${uptimeSec}:R>`,             inline: true },
        { name: `${e('server')} Servers`,        value: `\`${client.guilds.cache.size}\``, inline: true },
        { name: `${e('member')} Cached Users`,   value: `\`${client.users.cache.size}\``,  inline: true },
        { name: `${e('bot')} RAM (RSS)`,         value: `\`${mem.rss} MB\``,              inline: true },
        { name: `${e('loading')} Heap Used`,     value: `\`${mem.heap} MB\``,             inline: true },
        { name: `${e('fire')} CPU Load`,         value: `\`${cpu}%\``,                   inline: true },
      )
      .setFooter(makeFooter(client))
      .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};
