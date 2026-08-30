const { Events } = require('discord.js');
const { handleCommandError } = require('../utils/errorHandler');
const { checkCooldown } = require('../utils/cooldown');
const { logCommandUsage } = require('../services/logService');
const { logCommand } = require('../utils/console');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {

    // ── Slash Commands ─────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      const cooldownMs = command.cooldown || 3000;
      if (!checkCooldown(client, interaction, interaction.commandName, cooldownMs)) return;

      const startedAt = Date.now();
      try {
        logCommand(interaction.user.tag, interaction.commandName, interaction.guild?.name || 'DM');

        const args = {};
        if (interaction.options) {
          interaction.options.data.forEach(opt => {
            args[opt.name] = opt.value ?? opt.user?.tag ?? opt.role?.name ?? opt.channel?.name;
          });
        }

        await command.execute(interaction, client);
        await logCommandUsage(client, interaction, args, {
          status: 'SUCCESS',
          durationMs: Date.now() - startedAt,
        });
      } catch (error) {
        await logCommandUsage(client, interaction, args, {
          status: 'FAILED',
          durationMs: Date.now() - startedAt,
          error,
        });
        await handleCommandError(interaction, error);
      }
      return;
    }

    // ── Button Interactions ────────────────────────────────────────────────────
    if (interaction.isButton()) {
      const btn = client.buttons.get(interaction.customId) ||
        [...client.buttons.values()].find(candidate =>
          candidate.prefix && interaction.customId.startsWith(candidate.prefix)
        );
      if (!btn) return;
      try {
        await btn.execute(interaction, client);
      } catch (err) {
        console.error(`[Button] Error in ${interaction.customId}:`, err);
        const payload = { content: `❌ An error occurred: ${err.message}`, ephemeral: true };
        try {
          if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
          else await interaction.reply(payload);
        } catch { /* interaction already ended */ }
      }
      return;
    }

    // ── String Select Menu Interactions ───────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      const menu = client.selectMenus.get(interaction.customId);
      if (!menu) return;
      try {
        await menu.execute(interaction, client);
      } catch (err) {
        console.error(`[SelectMenu] Error in ${interaction.customId}:`, err);
        const payload = { content: `❌ An error occurred: ${err.message}`, ephemeral: true };
        try {
          if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
          else await interaction.reply(payload);
        } catch { /* interaction already ended */ }
      }
      return;
    }

    // ── Modal Submit Interactions ─────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      const modal = client.modals.get(interaction.customId);
      if (!modal) return;
      try {
        await modal.execute(interaction, client);
      } catch (err) {
        console.error(`[Modal] Error in ${interaction.customId}:`, err);
        const payload = { content: `❌ An error occurred: ${err.message}`, ephemeral: true };
        try {
          if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
          else await interaction.reply(payload);
        } catch { /* interaction already ended */ }
      }
      return;
    }
  },
};
