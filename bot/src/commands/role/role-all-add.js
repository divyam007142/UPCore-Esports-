const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { checkAdminRole, checkBotPermissions } = require('../../utils/permissions');
const { colors, emojis } = require('../../config/config');
const { e } = require('../../utils/emoji');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-all-add')
    .setDescription('Add a role to ALL members (bulk action — requires confirmation)')
    .addRoleOption(o => o.setName('role').setDescription('The role to add to everyone').setRequired(true)),
  cooldown: 60000,

  async execute(interaction, client) {
    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ManageRoles])) return;

    const role     = interaction.options.getRole('role');
    const members  = await interaction.guild.members.fetch();
    const eligible = members.filter(m => !m.user.bot && !m.roles.cache.has(role.id));

    const confirmEmbed = new EmbedBuilder()
      .setColor(colors.warning)
      .setTitle(`${emojis.warning}  Confirm Bulk Role Add`)
      .setDescription(
        `Are you sure you want to add <@&${role.id}> to **${eligible.size}** members?\n\n` +
        `${emojis.info}  This may take a while depending on member count.`,
      )
      .setFooter(makeFooter(client))
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('roleall_confirm').setLabel('Confirm').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('roleall_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    const { resource } = await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true, withResponse: true });
    const reply = resource.message;
    const collector = reply.createMessageComponentCollector({ time: 30_000 });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== interaction.user.id) {
        return btn.reply({ content: 'This confirmation is not for you.', ephemeral: true });
      }
      collector.stop();

      if (btn.customId === 'roleall_cancel') {
        return btn.update({
          embeds: [
            new EmbedBuilder()
              .setColor(colors.info)
              .setTitle(`${emojis.cross}  Cancelled`)
              .setDescription('Bulk role add has been cancelled.')
              .setFooter(makeFooter(client))
              .setTimestamp(),
          ],
          components: [],
        });
      }

      await btn.update({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.info)
            .setTitle(`${emojis.loading}  Processing...`)
            .setDescription(`Adding <@&${role.id}> to **${eligible.size}** members...\n\n*This may take a moment. A public message will appear when done.*`)
            .setFooter(makeFooter(client))
            .setTimestamp(),
        ],
        components: [],
      });

      let success = 0;
      let failed  = 0;
      for (const [, member] of eligible) {
        try { await member.roles.add(role); success++; } catch { failed++; }
        await new Promise(r => setTimeout(r, 100));
      }

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.success)
            .setTitle(`${emojis.check}  Done`)
            .setDescription('Bulk role add complete — results posted in the channel.')
            .setFooter(makeFooter(client))
            .setTimestamp(),
        ],
        components: [],
      });

      await interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.success)
            .setTitle(`${e('check')}  Bulk Role Add Complete`)
            .addFields(
              { name: `${emojis.role}  Role`,         value: `<@&${role.id}>`,  inline: true },
              { name: `${emojis.check}  Added`,        value: `\`${success}\``,  inline: true },
              { name: `${emojis.cross}  Failed`,       value: `\`${failed}\``,   inline: true },
              { name: `${emojis.mod}  Executed By`,    value: `<@${interaction.user.id}>`, inline: true },
            )
            .setFooter(makeFooter(client))
            .setTimestamp(),
        ],
        ephemeral: false,
      });
    });
  },
};
