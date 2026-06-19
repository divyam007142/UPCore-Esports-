const { EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');
const { e } = require('./emoji');

function buildCooldownBar(remaining, total) {
  const filled = Math.round((1 - remaining / total) * 10);
  const empty  = 10 - filled;
  return '▰'.repeat(filled) + '▱'.repeat(empty);
}

function checkCooldown(client, interaction, commandName, cooldownMs = 3000) {
  const { cooldowns } = client;

  if (!cooldowns.has(commandName)) cooldowns.set(commandName, new Map());

  const now        = Date.now();
  const timestamps = cooldowns.get(commandName);
  const userId     = interaction.user.id;

  if (timestamps.has(userId)) {
    const expirationTime = timestamps.get(userId) + cooldownMs;
    if (now < expirationTime) {
      const timeLeftMs = expirationTime - now;
      const timeLeft   = (timeLeftMs / 1000).toFixed(1);
      const bar        = buildCooldownBar(timeLeftMs, cooldownMs);

      const embed = new EmbedBuilder()
        .setColor(colors.warning)
        .setDescription(
          `${e('clock')} **Slow down!**\n` +
          `Please wait **${timeLeft}s** before using \`/${commandName}\` again.\n` +
          `\`${bar}\``,
        );

      interaction.reply({ embeds: [embed], ephemeral: true });
      return false;
    }
  }

  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownMs);
  return true;
}

module.exports = { checkCooldown };
