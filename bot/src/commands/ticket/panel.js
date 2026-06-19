const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isTicketAdmin, accessDeniedError } = require('../../utils/ticketPermissions');
const { e } = require('../../utils/emoji');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  category: 'ticket',
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Send or resend the ticket support panel (admin only)'),

  async execute(interaction) {
    if (!isTicketAdmin(interaction)) return accessDeniedError(interaction);

    const channelId = process.env.TICKET_PANEL_ID;
    if (!channelId) {
      return interaction.reply({ content: `❌ \`TICKET_PANEL_ID\` is not set in the environment. Please configure it first.`, ephemeral: true });
    }

    const config = await GuildConfig.findOne({ guildId: interaction.guild.id }).catch(() => null);
    const hasExisting = config?.ticket?.panelMessageId && config?.ticket?.panelChannelId;

    if (hasExisting) {
      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`${e('warning') || '⚠️'}  Existing Panel Detected`)
        .setDescription(
          `A support panel is already active in <#${config.ticket.panelChannelId}>.\n\n` +
          `> **Replace it?** The old panel will be deleted and a new one will be sent.\n` +
          `> **Keep it?** No changes will be made.`
        )
        .setFooter({ text: 'UPCORE Esports  •  Panel System' });

      const replaceBtn = new ButtonBuilder().setCustomId('btn_confirm_panel').setLabel('Replace Panel').setStyle(ButtonStyle.Danger);
      const keepBtn    = new ButtonBuilder().setCustomId('btn_cancel_panel').setLabel('Keep Existing').setStyle(ButtonStyle.Secondary);
      const replaceE = e('loading') || '🔄';
      const cancelE  = e('cross')   || '✖️';
      if (replaceE) replaceBtn.setEmoji(replaceE);
      if (cancelE)  keepBtn.setEmoji(cancelE);
      const row = new ActionRowBuilder().addComponents(replaceBtn, keepBtn);

      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const { sendPanel } = require('../../utils/ticketPanel');
    const msg = await sendPanel(interaction.client, interaction.guild.id);

    if (!msg) {
      return interaction.editReply({ content: `❌ Could not find the channel <#${channelId}>. Please verify \`TICKET_PANEL_ID\` is correct.` });
    }

    await interaction.editReply({ content: `${e('success') || '✅'} Support panel has been sent to <#${channelId}>.` });
  },
};
