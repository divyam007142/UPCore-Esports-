const { EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');
const { e } = require('./emoji');
const { logError } = require('./console');

/**
 * All emoji references are inside functions — evaluated AFTER loadEmojis() runs.
 */

function resolveErrorInfo(error) {
  if (error.code === 50013 || error.message?.includes('Missing Permissions')) {
    return { emoji: e('bot'),    color: colors.error,   text: 'I\'m missing the permissions needed to perform this action.' };
  }
  if (error.code === 50007) {
    return { emoji: e('member'), color: colors.warning, text: 'I can\'t send a DM to that user — they may have DMs disabled.' };
  }
  if (error.code === 10007) {
    return { emoji: e('member'), color: colors.error,   text: 'That user is not a member of this server.' };
  }
  return { emoji: e('error'), color: colors.error, text: 'An unexpected error occurred. Please try again.' };
}

async function handleCommandError(interaction, error) {
  logError('CommandError', error);

  const { emoji, color, text } = resolveErrorInfo(error);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setDescription(`${emoji} ${text}`);

  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (err) {
    logError('ErrorHandler', err);
  }
}

async function sendError(interaction, title, description, ephemeral = true) {
  const embed = new EmbedBuilder()
    .setColor(colors.error)
    .setDescription(`${e('error')} **${title}**\n${description}`);

  try {
    if (interaction.replied || interaction.deferred) return interaction.followUp({ embeds: [embed], ephemeral });
    return interaction.reply({ embeds: [embed], ephemeral });
  } catch (err) { logError('sendError', err); }
}

async function sendSuccess(interaction, title, description, ephemeral = false) {
  const embed = new EmbedBuilder()
    .setColor(colors.success)
    .setDescription(`${e('success')} **${title}**\n${description}`);

  try {
    if (interaction.replied || interaction.deferred) return interaction.followUp({ embeds: [embed], ephemeral });
    return interaction.reply({ embeds: [embed], ephemeral });
  } catch (err) { logError('sendSuccess', err); }
}

async function sendWarning(interaction, title, description, ephemeral = true) {
  const embed = new EmbedBuilder()
    .setColor(colors.warning)
    .setDescription(`${e('warning')} **${title}**\n${description}`);

  try {
    if (interaction.replied || interaction.deferred) return interaction.followUp({ embeds: [embed], ephemeral });
    return interaction.reply({ embeds: [embed], ephemeral });
  } catch (err) { logError('sendWarning', err); }
}

module.exports = { handleCommandError, sendError, sendSuccess, sendWarning };
