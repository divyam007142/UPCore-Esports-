const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  ChannelType,
} = require('discord.js');
const { e } = require('../../utils/emoji');
const { makeFooter } = require('../../utils/embeds');
const { colors } = require('../../config/config');
const StarboardConfig = require('../../models/StarboardConfig');

// Only this user ID may configure starboard
const OWNER_ID = '1157630773294268507';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('starboard')
    .setDescription('Configure the skull starboard — posts viral content to a dedicated channel')
    .addChannelOption(o =>
      o.setName('channel')
        .setDescription('Channel to post starred content in')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addIntegerOption(o =>
      o.setName('skulls')
        .setDescription('Minimum 💀 reactions needed to post (min 1)')
        .setRequired(true)
        .setMinValue(1),
    ),
  cooldown: 3000,
  category: 'utility',

  async execute(interaction, client) {
    // Only the designated owner may use this
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setDescription(`${e('error') || '❌'}  You do not have permission to configure the starboard.`)
          .setFooter(makeFooter(client))],
        ephemeral: true,
      });
    }

    const channel   = interaction.options.getChannel('channel');
    const minSkulls = interaction.options.getInteger('skulls');
    const guildId   = interaction.guild.id;

    // Check if already configured
    const existing = await StarboardConfig.findOne({ guildId }).catch(() => null);

    if (existing) {
      // Show confirmation: reconfigure or delete
      const reconfigBtn = new ButtonBuilder()
        .setCustomId('sb_reconfig')
        .setLabel('Reconfigure')
        .setStyle(ButtonStyle.Primary)
        .setEmoji({ name: '⚙️' });

      const deleteBtn = new ButtonBuilder()
        .setCustomId('sb_delete')
        .setLabel('Delete Config')
        .setStyle(ButtonStyle.Danger)
        .setEmoji({ name: '🗑️' });

      const cancelBtn = new ButtonBuilder()
        .setCustomId('sb_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(reconfigBtn, deleteBtn, cancelBtn);

      const confirmEmbed = new EmbedBuilder()
        .setColor(colors.warning)
        .setTitle(`${e('warning') || '⚠️'}  Starboard Already Configured`)
        .setDescription(
          `A starboard is already active in <#${existing.channelId}> with **${existing.minSkulls} 💀** threshold.\n\n` +
          `**New settings:** <#${channel.id}> · **${minSkulls} 💀**\n\n` +
          `What would you like to do?`,
        )
        .setFooter(makeFooter(client));

      await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });

      // Await button click
      const filter = i => i.user.id === interaction.user.id && ['sb_reconfig', 'sb_delete', 'sb_cancel'].includes(i.customId);
      let btnInteraction;
      try {
        btnInteraction = await interaction.fetchReply().then(msg =>
          msg.awaitMessageComponent({ filter, componentType: ComponentType.Button, time: 30_000 }),
        );
      } catch {
        // Timed out — disable buttons
        const disabledRow = new ActionRowBuilder().addComponents(
          reconfigBtn.setDisabled(true),
          deleteBtn.setDisabled(true),
          cancelBtn.setDisabled(true),
        );
        await interaction.editReply({ components: [disabledRow] }).catch(() => {});
        return;
      }

      if (btnInteraction.customId === 'sb_cancel') {
        await btnInteraction.update({
          embeds: [new EmbedBuilder()
            .setColor(colors.neutral)
            .setDescription(`${e('cross') || '✖️'}  Cancelled. No changes were made.`)
            .setFooter(makeFooter(client))],
          components: [],
        });
        return;
      }

      if (btnInteraction.customId === 'sb_delete') {
        await StarboardConfig.deleteOne({ guildId });
        await btnInteraction.update({
          embeds: [new EmbedBuilder()
            .setColor(colors.success)
            .setDescription(`${e('success') || '✅'}  Starboard configuration has been **removed**. No more content will be posted.`)
            .setFooter(makeFooter(client))],
          components: [],
        });
        return;
      }

      // sb_reconfig — overwrite with new settings
      await StarboardConfig.updateOne(
        { guildId },
        { channelId: channel.id, minSkulls, configuredBy: interaction.user.id, configuredAt: new Date() },
      );

      await btnInteraction.update({
        embeds: [new EmbedBuilder()
          .setColor(colors.success)
          .setTitle(`${e('success') || '✅'}  Starboard Reconfigured`)
          .setDescription(
            `**Channel:** <#${channel.id}>\n` +
            `**Threshold:** ${minSkulls} 💀 reactions\n\n` +
            `-# Messages that receive ${minSkulls} or more 💀 reactions will be posted here.`,
          )
          .setFooter(makeFooter(client)),
        ],
        components: [],
      });
      return;
    }

    // Fresh configuration
    await StarboardConfig.create({
      guildId,
      channelId:    channel.id,
      minSkulls,
      configuredBy: interaction.user.id,
    });

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(colors.success)
        .setTitle(`${e('success') || '✅'}  Starboard Configured`)
        .setDescription(
          `**Channel:** <#${channel.id}>\n` +
          `**Threshold:** ${minSkulls} 💀 reactions\n\n` +
          `-# Messages that receive ${minSkulls} or more 💀 reactions will be automatically posted there.`,
        )
        .setFooter(makeFooter(client))],
      ephemeral: true,
    });
  },
};
