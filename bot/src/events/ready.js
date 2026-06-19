const { Events, ActivityType } = require('discord.js');
const { logReady } = require('../utils/console');
const { startReminderService } = require('../services/reminderService');
const { loadEmojis, loadedNames } = require('../utils/emoji');
const { EMOJI_NAMES } = require('../config/config');
const { seedGuildConfig } = require('../utils/seedGuildConfig');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    // ── Load application emojis ──────────────────────────────────────────────
    const emojiCount = await loadEmojis(client);

    if (emojiCount > 0) {
      const loaded = loadedNames();
      const missing = Object.entries(EMOJI_NAMES)
        .filter(([, discordName]) => !loaded.includes(discordName))
        .map(([key, discordName]) => `${key} → "${discordName}"`);
      if (missing.length > 0) {
        missing.forEach(m => console.warn(`  ⚠ Emoji missing: ${m}`));
      }
    }

    // ── Try loading @napi-rs/canvas ───────────────────────────────────────────
    let canvasLoaded = false;
    try { require('@napi-rs/canvas'); canvasLoaded = true; } catch { /* optional */ }

    // ── Print ready summary ───────────────────────────────────────────────────
    logReady(client, {
      commandCount: client.commands?.size ?? 0,
      emojiCount:   emojiCount,
      canvasLoaded,
    });

    // ── Bot presence ──────────────────────────────────────────────────────────
    client.user.setPresence({
      activities: [{
        name: 'UPCore Esports | #RiseUP',
        type: ActivityType.Streaming,
        url: 'https://youtube.com/@upcoreesports?si=-AxP_EYUmwc9VYT-',
      }],
      status: 'online',
    });

    // ── Cache guild invites ────────────────────────────────────────────────────
    for (const [, guild] of client.guilds.cache) {
      try {
        const invites = await guild.invites.fetch();
        client.invites.set(guild.id, new Map(invites.map(inv => [inv.code, inv.uses])));
      } catch { /* no permission */ }
    }

    // ── Seed log channels into MongoDB ───────────────────────────────────────
    await seedGuildConfig();

    // ── Start reminder service ────────────────────────────────────────────────
    startReminderService(client);
  },
};
