const {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, LabelBuilder, FileUploadBuilder,
} = require('discord.js');
const Ticket = require('../models/Ticket');
const TicketBlacklist = require('../models/TicketBlacklist');

module.exports = {
  id: 'menu_ticket_category',
  async execute(interaction) {
    const bl = await TicketBlacklist.findOne({ guildId: interaction.guild.id, userId: interaction.user.id }).catch(() => null);
    if (bl) {
      return interaction.reply({
        content: `❌ You are blacklisted from opening tickets.\n**Reason:** ${bl.reason}`,
        ephemeral: true,
      });
    }

    const existing = await Ticket.findOne({ guildId: interaction.guild.id, userId: interaction.user.id, status: 'open' }).catch(() => null);
    if (existing) {
      return interaction.reply({
        content: `❌ You already have an open ticket: <#${existing.channelId}>\nPlease wait for it to be resolved before opening a new one.`,
        ephemeral: true,
      });
    }

    const category = interaction.values[0];

    // ── General Support ───────────────────────────────────────────────────────
    if (category === 'general') {
      const modal = new ModalBuilder().setCustomId('modal_general').setTitle('🎫  General Support');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('subject').setLabel('Subject')
            .setStyle(TextInputStyle.Short).setPlaceholder('Briefly describe your issue')
            .setRequired(true).setMaxLength(100)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('description').setLabel('Description')
            .setStyle(TextInputStyle.Paragraph).setPlaceholder('Provide as much detail as possible')
            .setRequired(true).setMaxLength(1000)
        ),
      );
      modal.addLabelComponents(
        new LabelBuilder()
          .setLabel('Upload Screenshot / Evidence (optional)')
          .setFileUploadComponent(
            new FileUploadBuilder().setCustomId('evidence').setRequired(false)
          )
      );
      return interaction.showModal(modal);
    }

    // ── Tournament Support ────────────────────────────────────────────────────
    if (category === 'tournament') {
      const modal = new ModalBuilder().setCustomId('modal_tournament').setTitle('🏆  Tournament Support');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('team_name').setLabel('Team Name')
            .setStyle(TextInputStyle.Short).setPlaceholder('Tell your team name?')
            .setRequired(true).setMaxLength(100)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('issue').setLabel('Describe Your Issue')
            .setStyle(TextInputStyle.Paragraph).setPlaceholder('Explain the problem in detail')
            .setRequired(true).setMaxLength(1000)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('match_id').setLabel('Match No (optional)')
            .setStyle(TextInputStyle.Short).setPlaceholder('Enter your Match No if applicable')
            .setRequired(false).setMaxLength(50)
        ),
      );
      modal.addLabelComponents(
        new LabelBuilder()
          .setLabel('Upload Match Screenshot / Evidence')
          .setFileUploadComponent(
            new FileUploadBuilder().setCustomId('evidence').setRequired(true)
          )
      );
      return interaction.showModal(modal);
    }

    // ── Club Join Request ─────────────────────────────────────────────────────
    if (category === 'club') {
      const modal = new ModalBuilder().setCustomId('modal_club').setTitle('🏅  Club Join Request');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('trophies').setLabel('Total Trophies')
            .setStyle(TextInputStyle.Short).setPlaceholder('Enter your total trophies (e.g., 25000)')
            .setRequired(true).setMaxLength(50)
        ),
      );
      modal.addLabelComponents(
        new LabelBuilder()
          .setLabel('Upload Your Profile Screenshot (optional)')
          .setFileUploadComponent(
            new FileUploadBuilder().setCustomId('profile_screenshot').setRequired(false)
          )
      );
      return interaction.showModal(modal);
    }

    // ── Business Enquiries ────────────────────────────────────────────────────
    if (category === 'business') {
      const modal = new ModalBuilder().setCustomId('modal_business').setTitle('💼  Business Enquiry');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('platform').setLabel('Which platform?')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Tell us which platform and describe your enquiry in detail...')
            .setRequired(true).setMaxLength(1000)
        ),
      );
      modal.addLabelComponents(
        new LabelBuilder()
          .setLabel('Upload Document / Media (optional)')
          .setFileUploadComponent(
            new FileUploadBuilder().setCustomId('document').setRequired(false)
          )
      );
      return interaction.showModal(modal);
    }

    // ── Others ────────────────────────────────────────────────────────────────
    if (category === 'others') {
      const modal = new ModalBuilder().setCustomId('modal_others').setTitle('📋  Others — Support');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('subject').setLabel('Subject')
            .setStyle(TextInputStyle.Short).setPlaceholder('Briefly describe what this is about')
            .setRequired(true).setMaxLength(100)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('description').setLabel('Description')
            .setStyle(TextInputStyle.Paragraph).setPlaceholder('Provide as much detail as possible')
            .setRequired(true).setMaxLength(1000)
        ),
      );
      modal.addLabelComponents(
        new LabelBuilder()
          .setLabel('Upload Screenshot / Evidence (optional)')
          .setFileUploadComponent(
            new FileUploadBuilder().setCustomId('evidence').setRequired(false)
          )
      );
      return interaction.showModal(modal);
    }
  },
};
