const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors, emojis } = require('../../config/config');
const { discordTimestamp } = require('../../utils/time');
const { makeFooter } = require('../../utils/embeds');
const { e } = require('../../utils/emoji');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inviteinfo')
    .setDescription('View detailed information about a Discord invite link')
    .addStringOption(o =>
      o.setName('code')
        .setDescription('Invite code or full invite URL (e.g. discord.gg/abc123)')
        .setRequired(true)
    ),
  cooldown: 4000,

  async execute(interaction, client) {
    await interaction.deferReply();

    const raw  = interaction.options.getString('code').trim();
    // Strip query params, fragments, and trailing slashes, then grab the last path segment
    const code = raw.replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop();

    let invite;
    try {
      invite = await client.fetchInvite(code);
    } catch {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setDescription(`${e('cross')} Could not find an invite with code \`${code}\`. It may be invalid or expired.`)
          .setFooter(makeFooter(client))],
      });
    }

    const guild     = invite.guild;
    const inviter   = invite.inviter;
    const channel   = invite.channel;
    const expiresAt = invite.expiresAt;
    const maxUses   = invite.maxUses;
    const uses      = invite.uses ?? 0;
    const temporary = invite.temporary;

    const embed = new EmbedBuilder()
      .setColor(colors.primary)
      .setTitle(`${emojis.link}  Invite Info — \`${code}\``)
      .setThumbnail(guild?.iconURL({ dynamic: true }) ?? null)
      .addFields(
        {
          name:   `${emojis.server} Server`,
          value:  guild ? `**${guild.name}**\n\`${guild.id}\`` : '`Unknown`',
          inline: true,
        },
        {
          name:   `${emojis.channel} Channel`,
          value:  channel ? `<#${channel.id}>\n\`${channel.name}\`` : '`Unknown`',
          inline: true,
        },
        {
          name:   `${emojis.member} Inviter`,
          value:  inviter ? `<@${inviter.id}>\n\`${inviter.tag}\`` : '`Unknown`',
          inline: true,
        },
        {
          name:   `${emojis.stats} Uses`,
          value:  maxUses ? `\`${uses} / ${maxUses}\`` : `\`${uses} / ∞\``,
          inline: true,
        },
        {
          name:   `${emojis.clock} Expires`,
          value:  expiresAt ? discordTimestamp(expiresAt, 'R') : '`Never`',
          inline: true,
        },
        {
          name:   `${emojis.info} Temporary`,
          value:  temporary ? `\`Yes\`` : `\`No\``,
          inline: true,
        },
      )
      .setFooter(makeFooter(client, `discord.gg/${code}`))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
