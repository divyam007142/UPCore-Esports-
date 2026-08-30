const { EmbedBuilder, MessageFlags } = require('discord.js');
const AnimeSave = require('../models/AnimeSave');
const { colors } = require('../config/config');
const { e } = require('../utils/emoji');

function feedbackEmbed(color, message) {
  return new EmbedBuilder()
    .setColor(color)
    .setDescription(message);
}

module.exports = {
  id: 'anime_remove',
  prefix: 'anime_remove_',

  async execute(interaction, client) {
    const saveId = interaction.customId.slice(this.prefix.length);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const savedImage = await AnimeSave.findOneAndDelete({
        _id: saveId,
        userId: interaction.user.id,
      });

      if (!savedImage) {
        return interaction.editReply({
          embeds: [feedbackEmbed(
            colors.info,
            `${e('info') || 'ℹ️'} This anime image is already removed from your DMs.`,
          )],
        });
      }

      try {
        await interaction.message.delete();
      } catch (deleteError) {
        // The saved record is still removed even if Discord already removed
        // the DM message or briefly rejects the delete request.
        if (deleteError.code !== 10008) throw deleteError;
      }

      return interaction.editReply({
        embeds: [feedbackEmbed(
          colors.success,
          `${e('success') || '✅'} Removed from your DMs.`,
        )],
      });
    } catch (error) {
      console.error('[anime] failed to remove saved image:', error.message);
      return interaction.editReply({
        embeds: [feedbackEmbed(
          colors.error,
          `${e('error') || '❌'} Couldn't remove this anime image. Please try again.`,
        )],
      });
    }
  },
};
