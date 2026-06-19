const { Events, AttachmentBuilder } = require('discord.js');
const { generateWelcomeCard } = require('../services/welcomeService');
const { logWelcome } = require('../services/logService');
const { getAccountAge } = require('../utils/time');
const { e } = require('../utils/emoji');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    const { guild } = member;

    // Detect invite used
    let usedInvite = null;
    let inviter = null;
    try {
      const newInvites = await guild.invites.fetch();
      const cachedInvites = client.invites.get(guild.id) || new Map();
      usedInvite = newInvites.find(inv => {
        const cached = cachedInvites.get(inv.code);
        return cached !== undefined && inv.uses > cached;
      });
      if (usedInvite) {
        inviter = usedInvite.inviter?.tag || 'Unknown';
      }
      client.invites.set(guild.id, new Map(newInvites.map(inv => [inv.code, inv.uses])));
    } catch (e) { /* no permission */ }

    const accountAge = getAccountAge(member.user.createdAt);

    // Generate card once, reuse for both channel and DM
    let cardBuffer = null;
    try {
      cardBuffer = await generateWelcomeCard(member, guild);
    } catch { /* card generation failed */ }

    // ── Welcome channel message (plain text + card) ──────────────────────────
    const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
    if (welcomeChannelId && cardBuffer) {
      try {
        const channel = guild.channels.cache.get(welcomeChannelId);
        if (channel) {
          const attachment = new AttachmentBuilder(cardBuffer, { name: 'welcome.png' });
          const count = guild.memberCount;
          const suffix = count === 11 || count === 12 || count === 13 ? 'th'
            : count % 10 === 1 ? 'st'
            : count % 10 === 2 ? 'nd'
            : count % 10 === 3 ? 'rd' : 'th';
          const msg =
            `${e('check')} Welcome to ${guild.name}, <@${member.id}>\n` +
            `${e('star')} You're our **#${count}${suffix}** member :)`;
          await channel.send({ content: msg, files: [attachment] });
        }
      } catch { /* welcome card failed */ }
    }

    // ── DM (plain text + card) ───────────────────────────────────────────────
    try {
      const dmAttachment = cardBuffer
        ? new AttachmentBuilder(cardBuffer, { name: 'welcome.png' })
        : null;

      const dmMsg =
        `${e('welcome')} **Hey ${member.user.username}, welcome to ${guild.name}!**\n\n` +
        `${e('star')} You just became member **#${guild.memberCount}** — we're genuinely stoked to have you.\n` +
        `${e('check')} Take a moment to read the rules so you know the ropes.\n` +
        `${e('fire')} Then jump into the channels, introduce yourself, and get involved — this community is built by players like you.\n\n` +
        `${e('server')} See you in **${guild.name}**!`;

      await member.user.send({
        content: dmMsg,
        ...(dmAttachment ? { files: [dmAttachment] } : {}),
      });
    } catch { /* DMs closed */ }

    // ── Auto-role on join ────────────────────────────────────────────────────
    const autoRoleId = process.env.AUTOROLE_USER_JOIN_ROLE_ID;
    if (autoRoleId) {
      try {
        const role = guild.roles.cache.get(autoRoleId) ?? await guild.roles.fetch(autoRoleId).catch(() => null);
        if (role) await member.roles.add(role, 'Auto-role on join');
      } catch { /* missing permissions or invalid role */ }
    }

    // Log welcome event
    await logWelcome(client, guild, member, {
      accountAge,
      inviteCode: usedInvite?.code || null,
      inviter,
    });

    // Log invite usage
    if (usedInvite) {
      const { logInvite } = require('../services/logService');
      await logInvite(client, guild, {
        user: member.user.tag,
        userId: member.id,
        code: usedInvite.code,
        inviter: inviter || 'Unknown',
        inviterId: usedInvite.inviterId || 'Unknown',
      });
    }
  },
};
