const { EmbedBuilder } = require('discord.js');
const { e } = require('./emoji');

const CATEGORY_MAP = {
  general:    { env: 'TICKET_CATEGORY_ID1', label: 'General Support' },
  tournament: { env: 'TICKET_CATEGORY_ID2', label: 'Tournament Support' },
  club:       { env: 'TICKET_CATEGORY_ID3', label: 'Club Join Request' },
  business:   { env: 'TICKET_CATEGORY_ID4', label: 'Business Enquiries' },
  others:     { env: 'TICKET_CATEGORY_ID5', label: 'Others' },
};

/**
 * Resolves and validates the Discord category channel for a ticket type.
 * Returns the channel object, or null (and replies with an error) on failure.
 */
async function resolveTicketCategory(interaction, categoryKey) {
  const meta = CATEGORY_MAP[categoryKey];
  if (!meta) return null;

  const catId = process.env[meta.env];

  if (!catId) {
    await _errorReply(interaction,
      `The **${meta.label}** ticket category is not configured.\n` +
      `An admin must set the \`${meta.env}\` secret to the Discord category channel ID.`
    );
    return null;
  }

  // Ensure cache is populated
  let category = interaction.guild.channels.cache.get(catId);
  if (!category) {
    try {
      category = await interaction.guild.channels.fetch(catId);
    } catch {
      category = null;
    }
  }

  if (!category) {
    await _errorReply(interaction,
      `The category channel configured for **${meta.label}** (\`${catId}\`) was not found.\n` +
      `Please check that \`${meta.env}\` is set to a valid Discord category ID.`
    );
    return null;
  }

  if (category.type !== 4) {
    await _errorReply(interaction,
      `The channel \`${category.name}\` (\`${catId}\`) is not a category channel.\n` +
      `\`${meta.env}\` must point to a **category**, not a text/voice channel.`
    );
    return null;
  }

  return category;
}

async function _errorReply(interaction, debugReason) {
  // Log the technical reason for admins without exposing it to users
  console.error(`[TicketCategory] ${debugReason}`);

  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle(`${e('error') || '❌'}  Category Not Found`)
    .setDescription(
      `${e('warning') || '⚠️'}  **The selected ticket category is currently unavailable.**\n\n` +
      `Please contact a staff member for assistance.`
    )
    .setFooter({ text: 'UPCORE Esports  •  Support System' });

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ embeds: [embed] }).catch(() => null);
  } else {
    await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => null);
  }
}

module.exports = { resolveTicketCategory, CATEGORY_MAP };
