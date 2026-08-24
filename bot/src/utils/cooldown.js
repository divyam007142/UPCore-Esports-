const { EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');
const { e } = require('./emoji');

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
      const timeLeft   = Math.max(1, Math.ceil(timeLeftMs / 1000));

      const embed = new EmbedBuilder()
        .setColor(colors.warning)
        .setDescription(
          `${e('clock')} You are on a cooldown. Please try again later in **${timeLeft} seconds**.`,
        );

      interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
      return false;
    }
  }

  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownMs);
  return true;
}

module.exports = { checkCooldown };
