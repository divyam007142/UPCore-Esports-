const { Events } = require('discord.js');
const { logVoice } = require('../services/logService');

const voiceSessions = new Map();

function sessionKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function getOrCreateSession(guildId, userId, state, now) {
  const key = sessionKey(guildId, userId);
  let session = voiceSessions.get(key);
  if (!session) {
    session = {
      joinedAt: now,
      streamStartedAt: state.streaming ? now : null,
      videoStartedAt: state.selfVideo ? now : null,
      streamMs: 0,
      videoMs: 0,
    };
    voiceSessions.set(key, session);
  }
  return session;
}

function finishActivity(session, type, now) {
  const startedKey = `${type}StartedAt`;
  const totalKey = `${type}Ms`;
  if (session[startedKey]) {
    session[totalKey] += Math.max(0, now - session[startedKey]);
    session[startedKey] = null;
  }
  return session[totalKey];
}

function sessionInfo(session, state, now) {
  if (!session) {
    return {
      streaming: state.streaming,
      video: state.selfVideo,
    };
  }

  return {
    vcDurationMs: Math.max(0, now - session.joinedAt),
    streamDurationMs: session.streamMs + (session.streamStartedAt ? now - session.streamStartedAt : 0),
    videoDurationMs: session.videoMs + (session.videoStartedAt ? now - session.videoStartedAt : 0),
    streaming: Boolean(session.streamStartedAt),
    video: Boolean(session.videoStartedAt),
  };
}

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState, client) {
    const guild = newState.guild;
    const user = newState.member?.user;
    if (!user || user.bot) return;

    const oldChannel = oldState.channel;
    const newChannel = newState.channel;
    const now = Date.now();
    const key = sessionKey(guild.id, user.id);
    const session = newChannel
      ? getOrCreateSession(guild.id, user.id, newState, now)
      : voiceSessions.get(key);
    const common = {
      user: user.tag,
      userId: user.id,
      userAvatar: user.displayAvatarURL({ size: 128 }),
      guildName: guild.name,
      guildId: guild.id,
      selfMute: newState.selfMute,
      selfDeaf: newState.selfDeaf,
      serverMute: newState.serverMute,
      serverDeaf: newState.serverDeaf,
      ...sessionInfo(session, newState, now),
    };

    if (!oldChannel && newChannel) {
      await logVoice(client, guild, {
        ...common,
        action: 'Joined',
        channel: newChannel.name,
        channelId: newChannel.id,
      });
    } else if (oldChannel && !newChannel) {
      await logVoice(client, guild, {
        ...common,
        action: 'Left',
        channel: oldChannel.name,
        channelId: oldChannel.id,
      });
    } else if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
      await logVoice(client, guild, {
        ...common,
        action: 'Moved',
        from: oldChannel.name,
        fromId: oldChannel.id,
        to: newChannel.name,
        toId: newChannel.id,
      });
    }

    if (!oldState.serverMute && newState.serverMute) {
      await logVoice(client, guild, {
        ...common,
        action: 'Server Muted',
        channel: newChannel?.name || 'N/A',
        channelId: newChannel?.id,
      });
    } else if (oldState.serverMute && !newState.serverMute) {
      await logVoice(client, guild, {
        ...common,
        action: 'Server Unmuted',
        channel: newChannel?.name || 'N/A',
        channelId: newChannel?.id,
      });
    }

    if (!oldState.serverDeaf && newState.serverDeaf) {
      await logVoice(client, guild, {
        ...common,
        action: 'Server Deafened',
        channel: newChannel?.name || 'N/A',
        channelId: newChannel?.id,
      });
    } else if (oldState.serverDeaf && !newState.serverDeaf) {
      await logVoice(client, guild, {
        ...common,
        action: 'Server Undeafened',
        channel: newChannel?.name || 'N/A',
        channelId: newChannel?.id,
      });
    }

    if (!oldState.streaming && newState.streaming) {
      if (session) session.streamStartedAt = now;
      await logVoice(client, guild, {
        ...common,
        ...sessionInfo(session, newState, now),
        action: 'Screen Share Started',
        channel: newChannel?.name || 'N/A',
        channelId: newChannel?.id,
      });
    } else if (oldState.streaming && !newState.streaming) {
      const streamDurationMs = session ? finishActivity(session, 'stream', now) : null;
      await logVoice(client, guild, {
        ...common,
        ...sessionInfo(session, newState, now),
        action: 'Screen Share Stopped',
        streaming: false,
        streamDurationMs,
        channel: newChannel?.name || oldChannel?.name || 'N/A',
        channelId: newChannel?.id || oldChannel?.id,
      });
    }

    if (!oldState.selfVideo && newState.selfVideo) {
      if (session) session.videoStartedAt = now;
      await logVoice(client, guild, {
        ...common,
        ...sessionInfo(session, newState, now),
        action: 'Camera Enabled',
        channel: newChannel?.name || 'N/A',
        channelId: newChannel?.id,
      });
    } else if (oldState.selfVideo && !newState.selfVideo) {
      const videoDurationMs = session ? finishActivity(session, 'video', now) : null;
      await logVoice(client, guild, {
        ...common,
        ...sessionInfo(session, newState, now),
        action: 'Camera Disabled',
        video: false,
        videoDurationMs,
        channel: newChannel?.name || oldChannel?.name || 'N/A',
        channelId: newChannel?.id || oldChannel?.id,
      });
    }

    if (!newChannel) voiceSessions.delete(key);
  },
};
