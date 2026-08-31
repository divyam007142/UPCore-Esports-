const { Collection } = require('discord.js');

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isImageUrl(url = '') {
  return /\.(png|jpe?g|gif|webp|svg|bmp|avif)(?:$|[?#])/i.test(url);
}

function isVideoUrl(url = '') {
  return /\.(mp4|webm|mov|m4v|ogv|ogg)(?:$|[?#])/i.test(url);
}

function customEmojiUrl(markup) {
  const match = String(markup ?? '').match(/^<(a?):([^:>]+):(\d+)>$/);
  if (!match) return null;
  return {
    url: `https://cdn.discordapp.com/emojis/${match[3]}.${match[1] ? 'gif' : 'png'}?size=64&quality=lossless`,
    name: match[2],
  };
}

async function downloadMediaAsDataUri(url) {
  if (!url || !/^https?:\/\//i.test(url)) return null;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'UPCORE-Esports-Transcript/1.0' },
    });
    if (!response.ok) return null;

    const contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
    const isImage = contentType.startsWith('image/') || isImageUrl(url);
    const isVideo = contentType.startsWith('video/') || isVideoUrl(url);
    if (!isImage && !isVideo) return null;

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > 16 * 1024 * 1024) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 16 * 1024 * 1024) return null;

    const mime = contentType.startsWith('image/')
      ? contentType
      : contentType.startsWith('video/')
        ? contentType
        : `${isVideo ? 'video' : 'image'}/${(url.match(/\.([a-z0-9]+)(?:$|[?#])/i)?.[1] || 'png').toLowerCase()}`;
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    // A transcript should still generate when an old Discord CDN asset has expired.
    return null;
  }
}

async function preloadImages(messages, formData) {
  const urls = new Set();
  for (const msg of messages) {
    for (const [, animated, name, id] of String([
      msg.content,
      ...msg.embeds.map(embed => embed.description ?? ''),
      ...msg.embeds.flatMap(embed => [
        embed.title ?? '',
        embed.author?.name ?? '',
        ...(embed.fields ?? []).map(field => field.value ?? ''),
        ...(embed.fields ?? []).map(field => field.name ?? ''),
        embed.footer?.text ?? '',
      ]),
    ].join('\n')).matchAll(/<(a?):([^:>]+):(\d+)>/g)) {
      const emoji = customEmojiUrl(`<${animated}:${name}:${id}>`);
      if (emoji) urls.add(emoji.url);
    }
    for (const att of msg.attachments.values()) {
      if (att.contentType?.startsWith('image/') || isImageUrl(att.url) || isImageUrl(att.name)) {
        urls.add(att.url);
      }
      if (att.contentType?.startsWith('video/') || isVideoUrl(att.url) || isVideoUrl(att.name)) {
        urls.add(att.url);
      }
    }
    for (const embed of msg.embeds) {
      if (embed.image?.url) urls.add(embed.image.url);
      if (embed.thumbnail?.url) urls.add(embed.thumbnail.url);
    }
  }
  for (const value of Object.values(formData ?? {})) {
    const match = String(value ?? '').match(/^https?:\/\/\S+$/i);
    if (match) urls.add(match[0]);
  }

  const entries = await Promise.all([...urls].map(async (url) => [url, await downloadMediaAsDataUri(url)]));
  return new Map(entries.filter(([, dataUri]) => dataUri));
}

function formatTs(date) {
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', hour12: true,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatRelativeTs(date) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const CATEGORY_LABELS = {
  general:    'General Support',
  tournament: 'Tournament Support',
  club:       'Club Join Request',
  business:   'Business Enquiries',
  others:     'Others',
};

async function buildMemberMap(guild, userIds) {
  const map = new Map();
  await Promise.all([...userIds].map(async (id) => {
    try {
      const member = await guild.members.fetch(id);
      const roles  = member.roles.cache
        .filter(r => r.id !== guild.id && r.name !== '@everyone')
        .sort((a, b) => b.position - a.position);
      const top = roles.first();
      map.set(id, {
        displayName: member.displayName || member.user.globalName || member.user.username,
        tag:         member.user.tag,
        isBot:       member.user.bot,
        topRole:     top ? { name: top.name, color: top.hexColor === '#000000' ? '#99aab5' : top.hexColor } : null,
      });
    } catch {
      map.set(id, { displayName: null, tag: null, isBot: false, topRole: null });
    }
  }));
  return map;
}

async function buildRoleMap(guild, roleIds) {
  const map = new Map();
  await Promise.all([...roleIds].map(async (id) => {
    try {
      const role = await guild.roles.fetch(id);
      if (role) map.set(id, { name: role.name, color: role.hexColor === '#000000' ? '#99aab5' : role.hexColor });
    } catch {
      // Keep the raw role ID as a fallback when the role is no longer available.
    }
  }));
  return map;
}

function resolveMentions(text, memberMap, roleMap) {
  return String(text ?? '')
    .replace(/<@!?(\d+)>/g, (_, id) => {
      const member = memberMap.get(id);
      return `@${member?.displayName || member?.tag || `User ${id}`}`;
    })
    .replace(/<@&(\d+)>/g, (_, id) => `@${roleMap.get(id)?.name || `Role ${id}`}`)
    .replace(/@everyone/g, '@everyone')
    .replace(/@here/g, '@here');
}

function renderRichText(text, assetMap, memberMap, roleMap) {
  const resolved = resolveMentions(text, memberMap, roleMap);
  return resolved.split(/(<a?:[^:>]+:\d+>)/g).map((part) => {
    const emoji = customEmojiUrl(part);
    if (!emoji) return escapeHtml(part);
    const image = assetMap.get(emoji.url);
    return image
      ? `<img class="emoji" src="${escapeHtml(image)}" alt=":${escapeHtml(emoji.name)}:" title=":${escapeHtml(emoji.name)}:">`
      : escapeHtml(`:${emoji.name}:`);
  }).join('');
}

function renderEmbed(embed, assetMap, memberMap, roleMap) {
  const bc = embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : '#5865F2';
  let html = `<div class="embed" style="border-color:${bc}">`;
  if (embed.author?.name) html += `<div class="embed-author">${renderRichText(embed.author.name, assetMap, memberMap, roleMap)}</div>`;
  if (embed.title)        html += `<div class="embed-title">${renderRichText(embed.title, assetMap, memberMap, roleMap)}</div>`;
  if (embed.description)  html += `<div class="embed-desc">${renderRichText(embed.description, assetMap, memberMap, roleMap).replace(/\n/g, '<br>')}</div>`;
  if (embed.fields?.length) {
    html += `<div class="embed-fields">`;
    for (const f of embed.fields) {
      html += `<div class="embed-field${f.inline ? ' inline' : ''}">` +
        `<div class="embed-fname">${renderRichText(f.name, assetMap, memberMap, roleMap)}</div>` +
        `<div class="embed-fval">${renderRichText(f.value, assetMap, memberMap, roleMap).replace(/\n/g, '<br>')}</div>` +
        `</div>`;
    }
    html += `</div>`;
  }
  if (embed.image?.url) {
    const image = assetMap.get(embed.image.url) || embed.image.url;
    html += `<div class="embed-img"><img src="${escapeHtml(image)}" alt="embed image"></div>`;
  }
  if (embed.thumbnail?.url) {
    const thumbnail = assetMap.get(embed.thumbnail.url) || embed.thumbnail.url;
    html += `<div class="embed-thumb"><img src="${escapeHtml(thumbnail)}" alt="embed thumbnail"></div>`;
  }
  if (embed.footer?.text) html += `<div class="embed-footer">${renderRichText(embed.footer.text, assetMap, memberMap, roleMap)}</div>`;
  html += `</div>`;
  return html;
}

function renderMessage(msg, memberMap, roleMap, assetMap) {
  const info      = memberMap.get(msg.author.id) ?? {};
  const dname     = info.displayName || msg.author.globalName || msg.author.username || 'Unknown';
  const tag       = info.tag || msg.author.tag;
  const isBot     = info.isBot ?? msg.author.bot;
  const topRole   = info.topRole;
   const ts        = `${formatTs(msg.createdTimestamp)} IST · ${formatRelativeTs(msg.createdTimestamp)}`;
  const avatar    = msg.author.displayAvatarURL({ size: 64, extension: 'png' });

  const nameColor = topRole ? topRole.color : (isBot ? '#00D4FF' : '#e0e0e0');
  const roleBadge = topRole
    ? `<span class="role-badge" style="color:${topRole.color};border-color:${topRole.color}">${escapeHtml(topRole.name)}</span>`
    : (isBot ? `<span class="bot-badge">APP</span>` : '');

  let body = '';
  if (msg.content) body += `<div class="msg-text">${renderRichText(msg.content, assetMap, memberMap, roleMap).replace(/\n/g, '<br>')}</div>`;
  for (const embed of msg.embeds)          body += renderEmbed(embed, assetMap, memberMap, roleMap);
  for (const att of msg.attachments.values()) {
    if (att.contentType?.startsWith('image/') || isImageUrl(att.url) || isImageUrl(att.name)) {
      const image = assetMap.get(att.url) || att.url;
      body += `<div class="attachment"><img src="${escapeHtml(image)}" alt="${escapeHtml(att.name ?? '')}"></div>`;
    }
    else if (att.contentType?.startsWith('video/') || isVideoUrl(att.url) || isVideoUrl(att.name)) {
      const video = assetMap.get(att.url);
      body += video
        ? `<div class="attachment video-att"><video controls playsinline preload="metadata"><source src="${escapeHtml(video)}" type="${escapeHtml(att.contentType || 'video/mp4')}"><a href="${escapeHtml(att.url)}" target="_blank" rel="noopener">Open video</a></video></div>`
        : `<div class="attachment file-att"><span class="file-icon">🎬</span><a href="${escapeHtml(att.url)}" target="_blank" rel="noopener">${escapeHtml(att.name ?? 'video')}</a></div>`;
    }
    else
      body += `<div class="attachment file-att"><span class="file-icon">📄</span><a href="${escapeHtml(att.url)}" target="_blank" rel="noopener">${escapeHtml(att.name ?? 'file')}</a></div>`;
  }
  if (!body) return '';

  return `
  <div class="message">
    <img class="avatar" src="${avatar}" alt="">
    <div class="msg-body">
      <div class="msg-header">
        <span class="author" style="color:${nameColor}" title="${escapeHtml(tag)}">${escapeHtml(dname)}</span>
        ${roleBadge}
        <span class="ts">${ts} IST</span>
      </div>
      ${body}
    </div>
  </div>`;
}

// Purge reports use their own media pipeline. Keep this separate from the
// ticket transcript helpers above so ticket transcripts retain their existing
// behavior and output.
const PURGE_MIME_BY_EXTENSION = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  avif: 'image/avif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  ogv: 'video/ogg',
  ogg: 'video/ogg',
};

function purgeMediaUrls(media) {
  return [media?.url, media?.proxyURL].filter(Boolean);
}

function purgeMimeFromHint(hint = '') {
  const value = String(hint);
  if (/^(image|video)\//i.test(value)) return value.toLowerCase();
  const extension = value.match(/\.([a-z0-9]+)(?:$|[?#])/i)?.[1]?.toLowerCase();
  return extension ? PURGE_MIME_BY_EXTENSION[extension] || null : null;
}

function sniffPurgeMediaMime(buffer) {
  if (!buffer || buffer.length < 4) return null;
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
  if (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a') return 'image/gif';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') return 'video/mp4';
  if (buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'video/webm';
  return null;
}

async function downloadPurgeMediaAsDataUri(url, hint = '') {
  if (!url || !/^https?:\/\//i.test(url)) return null;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: 'image/*,video/*,application/octet-stream;q=0.9,*/*;q=0.1',
        'User-Agent': 'UPCORE-Esports-Purge-Transcript/1.0',
      },
    });
    if (!response.ok) return null;

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > 16 * 1024 * 1024) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 16 * 1024 * 1024) return null;

    const responseType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
    const extension = url.match(/\.([a-z0-9]+)(?:$|[?#])/i)?.[1]?.toLowerCase();
    const responseMime = /^(image|video)\//i.test(responseType) ? responseType : null;
    const mime = responseMime || sniffPurgeMediaMime(buffer) || purgeMimeFromHint(hint) || PURGE_MIME_BY_EXTENSION[extension];
    if (!mime) return null;

    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

async function preloadPurgeMedia(messages) {
  const urls = new Map();
  const addMedia = (url, hint = '') => {
    if (url && !urls.has(url)) urls.set(url, hint);
  };

  for (const msg of messages) {
    const embeds = msg.embeds ?? [];
    const content = [
      msg.content || '',
      ...embeds.flatMap(embed => [
        embed.description || '',
        embed.title || '',
        embed.author?.name || '',
        ...(embed.fields || []).flatMap(field => [field.name || '', field.value || '']),
        embed.footer?.text || '',
      ]),
    ].join('\n');

    for (const [, animated, name, id] of content.matchAll(/<(a?):([^:>]+):(\d+)>/g)) {
      const emoji = customEmojiUrl(`<${animated}:${name}:${id}>`);
      if (emoji) addMedia(emoji.url, emoji.url);
    }

    for (const att of msg.attachments.values()) {
      const hint = att.contentType || att.name || att.url;
      const urlsForAttachment = purgeMediaUrls(att);
      if (att.contentType?.startsWith('image/') || isImageUrl(att.url) || isImageUrl(att.name)) {
        urlsForAttachment.forEach(url => addMedia(url, hint));
      }
      if (att.contentType?.startsWith('video/') || isVideoUrl(att.url) || isVideoUrl(att.name)) {
        urlsForAttachment.forEach(url => addMedia(url, hint));
      }
    }

    for (const embed of embeds) {
      if (embed.image?.url) addMedia(embed.image.url, 'image/png');
      if (embed.image?.proxyURL) addMedia(embed.image.proxyURL, 'image/png');
      if (embed.thumbnail?.url) addMedia(embed.thumbnail.url, 'image/png');
      if (embed.thumbnail?.proxyURL) addMedia(embed.thumbnail.proxyURL, 'image/png');
      if (embed.video?.url) addMedia(embed.video.url, 'video/mp4');
      if (embed.video?.proxyURL) addMedia(embed.video.proxyURL, 'video/mp4');
    }
  }

  const entries = await Promise.all(
    [...urls.entries()].map(async ([url, hint]) => [url, await downloadPurgeMediaAsDataUri(url, hint)]),
  );
  return new Map(entries.filter(([, dataUri]) => dataUri));
}

function purgeDataUriMime(dataUri, fallback = 'video/mp4') {
  return String(dataUri).match(/^data:([^;,]+)/i)?.[1] || fallback;
}

function renderPurgeEmbed(embed, assetMap, memberMap, roleMap) {
  const bc = embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : '#5865F2';
  let html = `<div class="embed" style="border-color:${bc}">`;
  if (embed.author?.name) html += `<div class="embed-author">${renderRichText(embed.author.name, assetMap, memberMap, roleMap)}</div>`;
  if (embed.title) html += `<div class="embed-title">${renderRichText(embed.title, assetMap, memberMap, roleMap)}</div>`;
  if (embed.description) html += `<div class="embed-desc">${renderRichText(embed.description, assetMap, memberMap, roleMap).replace(/\n/g, '<br>')}</div>`;

  if (embed.fields?.length) {
    html += `<div class="embed-fields">`;
    for (const field of embed.fields) {
      html += `<div class="embed-field${field.inline ? ' inline' : ''}">` +
        `<div class="embed-fname">${renderRichText(field.name, assetMap, memberMap, roleMap)}</div>` +
        `<div class="embed-fval">${renderRichText(field.value, assetMap, memberMap, roleMap).replace(/\n/g, '<br>')}</div>` +
        `</div>`;
    }
    html += `</div>`;
  }

  if (embed.image?.url) {
    const image = assetMap.get(embed.image.url) || assetMap.get(embed.image.proxyURL);
    html += image
      ? `<div class="embed-img"><img src="${escapeHtml(image)}" alt="embed image"></div>`
      : `<div class="embed-media-missing">Embed image could not be archived</div>`;
  }
  if (embed.thumbnail?.url) {
    const thumbnail = assetMap.get(embed.thumbnail.url) || assetMap.get(embed.thumbnail.proxyURL);
    html += thumbnail
      ? `<div class="embed-thumb"><img src="${escapeHtml(thumbnail)}" alt="embed thumbnail"></div>`
      : `<div class="embed-media-missing">Embed thumbnail could not be archived</div>`;
  }
  if (embed.video?.url) {
    const video = assetMap.get(embed.video.url) || assetMap.get(embed.video.proxyURL);
    html += video
      ? `<div class="embed-video"><video controls playsinline preload="metadata"><source src="${escapeHtml(video)}" type="${escapeHtml(purgeDataUriMime(video))}"></video></div>`
      : `<div class="embed-media-missing">Embed video could not be archived</div>`;
  }
  if (embed.footer?.text) html += `<div class="embed-footer">${renderRichText(embed.footer.text, assetMap, memberMap, roleMap)}</div>`;
  html += `</div>`;
  return html;
}

function renderPurgeMessage(msg, memberMap, roleMap, assetMap) {
  const info = memberMap.get(msg.author.id) ?? {};
  const dname = info.displayName || msg.author.globalName || msg.author.username || 'Unknown';
  const tag = info.tag || msg.author.tag;
  const isBot = info.isBot ?? msg.author.bot;
  const topRole = info.topRole;
  const ts = `${formatTs(msg.createdTimestamp)} IST · ${formatRelativeTs(msg.createdTimestamp)}`;
  const avatar = msg.author.displayAvatarURL({ size: 64, extension: 'png' });
  const nameColor = topRole ? topRole.color : (isBot ? '#00D4FF' : '#e0e0e0');
  const roleBadge = topRole
    ? `<span class="role-badge" style="color:${topRole.color};border-color:${topRole.color}">${escapeHtml(topRole.name)}</span>`
    : (isBot ? `<span class="bot-badge">APP</span>` : '');

  let body = '';
  if (msg.content) body += `<div class="msg-text">${renderRichText(msg.content, assetMap, memberMap, roleMap).replace(/\n/g, '<br>')}</div>`;
  for (const embed of msg.embeds ?? []) body += renderPurgeEmbed(embed, assetMap, memberMap, roleMap);

  for (const att of msg.attachments.values()) {
    const media = assetMap.get(att.url) || assetMap.get(att.proxyURL);
    if (att.contentType?.startsWith('image/') || isImageUrl(att.url) || isImageUrl(att.name)) {
      body += media
        ? `<div class="attachment"><img src="${escapeHtml(media)}" alt="${escapeHtml(att.name ?? '')}"></div>`
        : `<div class="attachment file-att"><span class="file-icon">🖼️</span>${escapeHtml(att.name ?? 'image')} could not be archived</div>`;
    } else if (att.contentType?.startsWith('video/') || isVideoUrl(att.url) || isVideoUrl(att.name)) {
      body += media
        ? `<div class="attachment video-att"><video controls playsinline preload="metadata"><source src="${escapeHtml(media)}" type="${escapeHtml(purgeDataUriMime(media, att.contentType || 'video/mp4'))}"></video></div>`
        : `<div class="attachment file-att"><span class="file-icon">🎬</span>${escapeHtml(att.name ?? 'video')} could not be archived</div>`;
    } else {
      body += `<div class="attachment file-att"><span class="file-icon">📄</span><a href="${escapeHtml(att.url)}" target="_blank" rel="noopener">${escapeHtml(att.name ?? 'file')}</a></div>`;
    }
  }
  if (!body) return '';

  return `
  <div class="message">
    <img class="avatar" src="${avatar}" alt="">
    <div class="msg-body">
      <div class="msg-header">
        <span class="author" style="color:${nameColor}" title="${escapeHtml(tag)}">${escapeHtml(dname)}</span>
        ${roleBadge}
        <span class="ts">${ts}</span>
      </div>
      ${body}
    </div>
  </div>`;
}

function renderFormData(formData, assetMap = new Map()) {
  if (!formData || !Object.keys(formData).length) return '';
  let rows = '';
  for (const [k, v] of Object.entries(formData)) {
    if (v == null || v === '') continue;
    const str      = String(v);
    const isUrl    = /^https?:\/\/.+/i.test(str.trim());
    const image    = isUrl ? assetMap.get(str.trim()) : null;
    const video    = isUrl && isVideoUrl(str.trim()) ? image : null;
    const rendered = video
      ? `<video class="form-video" controls playsinline preload="metadata"><source src="${escapeHtml(video)}" type="video/${escapeHtml(str.trim().match(/\.([a-z0-9]+)(?:$|[?#])/i)?.[1] || 'mp4')}"><a href="${escapeHtml(str.trim())}" target="_blank" rel="noopener">Open video</a></video>`
      : image
        ? `<a href="${escapeHtml(str.trim())}" target="_blank" rel="noopener"><img class="form-image" src="${escapeHtml(image)}" alt="${escapeHtml(k)}"></a>`
      : isUrl
        ? `<a href="${escapeHtml(str.trim())}" target="_blank" rel="noopener" style="color:#00aff4">View Attachment ↗</a>`
        : escapeHtml(str).replace(/\n/g, '<br>');
    rows += `<div class="form-row"><div class="form-key">${escapeHtml(k)}</div><div class="form-val">${rendered}</div></div>`;
  }
  if (!rows) return '';
  return `<div class="form-section"><div class="form-title">📋  Ticket Submission Details</div>${rows}</div>`;
}

async function generateTranscript(channel, ticket) {
  const messages = new Collection();
  let lastId;
  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, before: lastId });
    if (!batch.size) break;
    batch.forEach((m, id) => messages.set(id, m));
    lastId = batch.last()?.id;
    if (batch.size < 100) break;
  }
  const sorted    = [...messages.values()].reverse();
  const catLabel  = CATEGORY_LABELS[ticket.category] ?? ticket.category;
  const userIds   = new Set(sorted.map(m => m.author.id));
  const roleIds   = new Set();
  const mentionText = sorted.map(m => [
    m.content,
    ...m.embeds.map(embed => embed.description ?? ''),
    ...m.embeds.flatMap(embed => (embed.fields ?? []).map(field => field.value ?? '')),
  ].join('\n')).join('\n');
  for (const [, id] of mentionText.matchAll(/<@!?(\d+)>/g)) userIds.add(id);
  for (const [, id] of mentionText.matchAll(/<@&(\d+)>/g)) roleIds.add(id);
  const memberMap = channel.guild ? await buildMemberMap(channel.guild, userIds) : new Map();
  const roleMap   = channel.guild ? await buildRoleMap(channel.guild, roleIds) : new Map();
  const assetMap  = await preloadImages(sorted, ticket.formData);
  const generatedAt = formatTs(Date.now());

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Transcript — ${ticket.ticketId}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#111;color:#dcddde;font-family:'Segoe UI',sans-serif;font-size:14px;line-height:1.5}
  a{color:#00aff4;text-decoration:none}a:hover{text-decoration:underline}
  .header{background:#0a0a0a;border-bottom:3px solid #00D4FF;padding:28px 36px 24px}
  .header-brand{font-size:18px;font-weight:700;color:#fff;letter-spacing:.5px;margin-bottom:8px}
  .header-brand span{color:#00D4FF}
  .badge{display:inline-block;background:#00D4FF;color:#000;font-size:10px;font-weight:800;padding:2px 10px;border-radius:20px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px}
  .ticket-title{font-size:24px;font-weight:800;color:#fff;margin-bottom:10px}
  .meta-grid{display:flex;flex-wrap:wrap;gap:16px 32px;font-size:13px;color:#b0b7c1}
  .meta-item strong{color:#e0e0e0;font-weight:600}
  .status-open{color:#57f287;font-weight:700}
  .status-closed{color:#ed4245;font-weight:700}
  .duration-badge{color:#fee75c;font-weight:700}
  .form-section{background:#161b22;border:1px solid #2a2d36;border-radius:8px;padding:18px 22px;margin:20px 36px 0}
  .form-title{font-size:13px;font-weight:700;color:#00D4FF;letter-spacing:.5px;margin-bottom:12px;text-transform:uppercase}
  .form-row{display:flex;gap:12px;padding:7px 0;border-bottom:1px solid #1e2128}
  .form-row:last-child{border-bottom:none}
  .form-key{width:180px;flex-shrink:0;font-size:12px;font-weight:700;color:#99aab5;text-transform:uppercase;letter-spacing:.4px}
  .form-val{flex:1;color:#e0e0e0;word-break:break-word}
  .form-image{display:block;max-width:300px;max-height:220px;border-radius:6px;border:1px solid #2d3039}
  .emoji{width:1.35em;height:1.35em;vertical-align:-.32em;object-fit:contain;margin:0 .08em}
  .msgs-header{font-size:11px;font-weight:700;color:#72767d;text-transform:uppercase;letter-spacing:1px;padding:18px 36px 8px}
  .messages{padding:4px 0 24px}
  .message{display:flex;align-items:flex-start;gap:14px;padding:6px 20px;margin:2px 16px;border-radius:6px}
  .message:hover{background:#1a1c1e}
  .avatar{width:40px;height:40px;border-radius:50%;flex-shrink:0;margin-top:2px}
  .msg-body{flex:1;min-width:0}
  .msg-header{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px;margin-bottom:4px}
  .author{font-weight:700;font-size:14px}
  .bot-badge{background:#5865f2;color:#fff;font-size:9px;font-weight:800;padding:1px 5px;border-radius:3px;letter-spacing:.5px}
  .role-badge{font-size:10px;font-weight:600;padding:1px 7px;border-radius:20px;border:1px solid}
  .ts{color:#72767d;font-size:11px}
  .msg-text{color:#dcddde;word-break:break-word;white-space:pre-wrap}
  .embed{border-left:4px solid #5865f2;background:#1e1f22;border-radius:0 6px 6px 0;padding:12px 14px;margin:6px 0;max-width:520px}
  .embed-author{font-size:12px;color:#b9bbbe;font-weight:600;margin-bottom:4px}
  .embed-title{font-size:15px;font-weight:700;color:#fff;margin-bottom:6px}
  .embed-desc{color:#b9bbbe;font-size:13px;margin-bottom:8px;line-height:1.5}
  .embed-fields{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}
  .embed-field{min-width:120px;flex:0 0 auto}
  .embed-field.inline{max-width:200px}
  .embed-fname{font-size:11px;font-weight:700;color:#e0e0e0;text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px}
  .embed-fval{font-size:13px;color:#b9bbbe}
  .embed-img img{max-width:100%;max-height:280px;border-radius:4px;margin-top:8px;display:block}
  .embed-thumb img{max-width:160px;max-height:160px;border-radius:4px;margin-top:8px;display:block}
  .embed-footer{font-size:11px;color:#72767d;margin-top:8px;border-top:1px solid #2b2d31;padding-top:6px}
  .attachment img{max-width:400px;max-height:280px;border-radius:6px;margin-top:6px;display:block}
  .form-video,.video-att video{display:block;width:100%;max-width:520px;max-height:360px;border-radius:6px;background:#090b10}
  .file-att{display:inline-flex;align-items:center;gap:8px;background:#1e2128;border:1px solid #2d3039;padding:8px 14px;border-radius:6px;margin-top:6px}
  .footer{background:#0a0a0a;border-top:1px solid #1e2029;padding:14px 36px;text-align:center;font-size:11px;color:#4f545c}
  .footer strong{color:#72767d}
  @media (max-width:600px){
    body{font-size:13px;overflow-x:hidden}
    .header{padding:22px 16px 18px}
    .header-brand{font-size:15px;letter-spacing:.2px}
    .badge{font-size:9px;padding:3px 8px}
    .ticket-title{font-size:21px;line-height:1.25;overflow-wrap:anywhere}
    .meta-grid{display:grid;grid-template-columns:1fr;gap:7px;font-size:12px}
    .form-section{margin:12px 10px 0;padding:14px}
    .form-row{display:block;padding:10px 0}
    .form-key{width:auto;margin-bottom:4px;font-size:10px}
    .form-val{font-size:13px}
    .form-image{max-width:100%;height:auto}
    .form-video,.video-att video{max-width:100%;max-height:none}
    .msgs-header{padding:16px 14px 7px;overflow-wrap:anywhere}
    .message{gap:9px;padding:8px 9px;margin:2px 6px}
    .avatar{width:32px;height:32px}
    .msg-header{gap:5px}
    .author{font-size:13px;overflow-wrap:anywhere}
    .role-badge{font-size:9px;max-width:100%;overflow-wrap:anywhere}
    .ts{font-size:10px}
    .msg-text{font-size:13px}
    .embed{max-width:100%;padding:11px 12px;margin:7px 0}
    .embed-fields{display:block}
    .embed-field,.embed-field.inline{max-width:none;min-width:0;margin-top:8px}
    .embed-title{font-size:14px;overflow-wrap:anywhere}
    .embed-desc,.embed-fval{font-size:12px;overflow-wrap:anywhere}
    .embed-img img{width:100%;height:auto;max-height:none}
    .embed-thumb img{max-width:120px;max-height:120px}
    .attachment img{width:100%;height:auto;max-height:none}
    .file-att{max-width:100%;overflow-wrap:anywhere}
    .footer{padding:12px 16px;font-size:10px}
  }
</style>
</head>
<body>
<div class="header">
  <div class="header-brand">UPCORE <span>Esports</span>  •  Ticket Transcript</div>
  <div class="badge">Ticket Transcript</div>
  <div class="ticket-title">${escapeHtml(ticket.ticketId)}</div>
  <div class="meta-grid">
    <div class="meta-item"><strong>Category:</strong> ${escapeHtml(catLabel)}</div>
    <div class="meta-item"><strong>Opened By:</strong> ${escapeHtml(ticket.username)}</div>
    <div class="meta-item"><strong>Opened At:</strong> ${escapeHtml(ticket.openedAt)} IST</div>
    ${ticket.closedAt ? `<div class="meta-item"><strong>Closed At:</strong> ${escapeHtml(ticket.closedAt)} IST</div>` : ''}
    ${ticket.duration ? `<div class="meta-item"><strong>Duration:</strong> <span class="duration-badge">${escapeHtml(ticket.duration)}</span></div>` : ''}
    <div class="meta-item"><strong>Status:</strong> <span class="${ticket.closedAt ? 'status-closed' : 'status-open'}">${ticket.closedAt ? 'CLOSED' : 'OPEN'}</span></div>
    <div class="meta-item"><strong>Messages:</strong> ${sorted.length}</div>
  </div>
</div>
${renderFormData(ticket.formData, assetMap)}
<div class="msgs-header"># ${escapeHtml(channel.name ?? ticket.ticketId)}</div>
<div class="messages">
${sorted.map(m => renderMessage(m, memberMap, roleMap, assetMap)).filter(Boolean).join('\n')}
</div>
<div class="footer">UPCORE Esports  •  Ticket System  •  Generated <strong>${generatedAt} IST</strong></div>
</body>
</html>`;

  return Buffer.from(html, 'utf8');
}

async function generatePurgeTranscript(guild, messages, data) {
  const sorted = [...(messages ?? [])].sort((a, b) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0));
  const isEmbedDelete = data.reportType === 'embed-delete';
  const reportLabel = isEmbedDelete ? 'Deleted Embed Message' : 'Purge All';
  const userIds = new Set(sorted.map(message => message.author?.id).filter(Boolean));
  const roleIds = new Set();
  const mentionText = sorted.map(message => [
    message.content || '',
    ...((message.embeds || []).map(embed => [
      embed.title || '',
      embed.description || '',
      ...(embed.fields || []).flatMap(field => [field.name || '', field.value || '']),
    ].join('\n'))),
  ].join('\n')).join('\n');

  for (const [, id] of mentionText.matchAll(/<@!?(\d+)>/g)) userIds.add(id);
  for (const [, id] of mentionText.matchAll(/<@&(\d+)>/g)) roleIds.add(id);

  const memberMap = await buildMemberMap(guild, userIds);
  const roleMap = await buildRoleMap(guild, roleIds);
  const assetMap = await preloadImages(sorted, {});
  const generatedAt = formatTs(Date.now());
  const channelName = sorted[0]?.channel?.name || data.channelId || 'Unknown channel';
  const moderator = guild.members.cache.get(data.moderatorId)?.displayName || data.moderator || 'Unknown';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(reportLabel)} — ${escapeHtml(channelName)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#111;color:#dcddde;font-family:'Segoe UI',sans-serif;font-size:14px;line-height:1.5}
a{color:#00aff4;text-decoration:none}a:hover{text-decoration:underline}
.header{background:#0a0a0a;border-bottom:3px solid #ed4245;padding:26px 34px 22px}
.brand{font-size:18px;font-weight:700;color:#fff;margin-bottom:10px}.brand span{color:#ed4245}
.badge{display:inline-block;background:#ed4245;color:#fff;font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px}
h1{font-size:25px;color:#fff;margin-bottom:13px}
.meta{display:flex;flex-wrap:wrap;gap:8px 26px;color:#b9bbbe;font-size:13px}.meta strong{color:#fff}
.messages{padding:16px 0 26px}.section{padding:0 34px 9px;color:#72767d;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
.message{display:flex;align-items:flex-start;gap:14px;padding:9px 28px;margin:2px 16px;border-radius:7px}.message:hover{background:#1a1c1e}
.avatar{width:42px;height:42px;border-radius:50%;flex-shrink:0}.msg-body{flex:1;min-width:0}
.msg-header{display:flex;align-items:baseline;flex-wrap:wrap;gap:7px;margin-bottom:4px}
.author{font-weight:700;font-size:14px}.tag{color:#72767d;font-size:11px}.bot-badge{background:#5865f2;color:#fff;font-size:9px;font-weight:800;padding:1px 5px;border-radius:3px;letter-spacing:.5px}.role-badge{font-size:10px;font-weight:600;padding:1px 7px;border-radius:20px;border:1px solid}
.ts{color:#72767d;font-size:11px}.msg-text{color:#dcddde;word-break:break-word;white-space:pre-wrap}
.emoji{width:1.35em;height:1.35em;vertical-align:-.32em;object-fit:contain;margin:0 .08em}
.embed{border-left:4px solid #5865f2;background:#1e1f22;border-radius:0 6px 6px 0;padding:12px 14px;margin:6px 0;max-width:520px;overflow-wrap:anywhere}.embed-author{font-size:12px;color:#b9bbbe;font-weight:600;margin-bottom:4px}.embed-title{font-size:15px;font-weight:700;color:#fff;margin-bottom:6px}.embed-desc{color:#b9bbbe;font-size:13px;margin-bottom:8px;line-height:1.5}.embed-fields{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}.embed-field{min-width:120px;flex:1 1 160px}.embed-field.inline{max-width:200px}.embed-fname{font-size:11px;font-weight:700;color:#e0e0e0;text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px}.embed-fval{font-size:13px;color:#b9bbbe}.embed-img img{display:block;max-width:100%;max-height:280px;border-radius:4px;margin-top:8px}.embed-thumb img{display:block;max-width:160px;max-height:160px;border-radius:4px;margin-top:8px}.embed-video video{display:block;width:100%;max-height:360px;margin-top:8px;border-radius:4px;background:#090b10}.embed-media-missing{color:#72767d;font-size:12px;font-style:italic;margin-top:8px}.embed-footer{font-size:11px;color:#72767d;margin-top:8px;border-top:1px solid #2b2d31;padding-top:6px}
.attachment,.video-att,.file-att{max-width:100%;min-width:0}.attachment img{display:block;max-width:100%;height:auto;max-height:360px;border-radius:6px;margin-top:8px}.video-att video{display:block;width:100%;max-width:100%;height:auto;max-height:420px;margin-top:8px;background:#090b10;border-radius:6px}.video{display:block;width:100%;max-width:600px;max-height:420px;margin-top:8px;background:#090b10;border-radius:6px}.file-att{display:flex;align-items:flex-start;gap:7px;margin-top:8px;overflow-wrap:anywhere;word-break:break-word}.file-att a{min-width:0;overflow-wrap:anywhere;word-break:break-word}
.file{display:inline-flex;gap:7px;margin-top:8px;background:#1e2128;border:1px solid #2d3039;padding:7px 11px;border-radius:6px}
.footer{border-top:1px solid #25272d;background:#0a0a0a;padding:14px 34px;text-align:center;color:#72767d;font-size:11px}
html,body{width:100%;max-width:100%;overflow-x:hidden}img,video{max-width:100%}
@media(max-width:600px){body{font-size:13px}.header{padding:21px 16px 18px;overflow-wrap:anywhere}.header h1{font-size:21px;line-height:1.25}.meta{display:grid;grid-template-columns:minmax(0,1fr);gap:6px}.meta>div{min-width:0;overflow-wrap:anywhere;word-break:break-word}.section{padding:0 14px 8px}.message{display:grid;grid-template-columns:34px minmax(0,1fr);gap:9px;padding:8px 9px;margin:2px 6px;max-width:calc(100% - 12px)}.msg-body{min-width:0;max-width:100%}.msg-header{min-width:0;gap:5px}.avatar{width:34px;height:34px}.author,.role-badge,.ts,.tag{max-width:100%;overflow-wrap:anywhere;word-break:break-word}.author{font-size:13px}.ts,.tag{font-size:10px}.embed{width:100%;max-width:100%;padding:11px 12px;margin:7px 0}.embed-fields{display:block}.embed-field,.embed-field.inline{max-width:none;min-width:0;margin-top:8px}.embed-title{font-size:14px;overflow-wrap:anywhere}.embed-desc,.embed-fval{font-size:12px;overflow-wrap:anywhere;word-break:break-word}.embed-img img{width:auto;max-width:100%;height:auto;max-height:none}.embed-thumb img{max-width:120px;max-height:120px}.embed-video video{width:100%;height:auto;max-height:none}.attachment{width:100%;max-width:100%;overflow:hidden}.attachment img{width:auto;max-width:100%;height:auto;max-height:none}.video-att video{width:100%;height:auto;max-height:none}.file-att{width:100%;max-width:100%}.file-att a{min-width:0;max-width:100%}.video{max-width:100%;max-height:none}}
</style>
</head>
<body>
<header class="header">
  <div class="brand">UPCORE <span>Esports</span> · Moderation Logs</div>
   <div class="badge">${escapeHtml(reportLabel)}</div>
   <h1>${escapeHtml(data.count || sorted.length)} message${(data.count || sorted.length) === 1 ? '' : 's'} deleted from #${escapeHtml(channelName)}</h1>
  <div class="meta">
    <div><strong>Moderator:</strong> ${escapeHtml(moderator)} · <code>${escapeHtml(data.moderatorId || '')}</code></div>
    <div><strong>Channel:</strong> #${escapeHtml(channelName)} · <code>${escapeHtml(data.channelId || '')}</code></div>
    ${data.filterUser ? `<div><strong>User filter:</strong> ${escapeHtml(data.filterUser)}</div>` : ''}
    <div><strong>Generated:</strong> ${escapeHtml(generatedAt)} IST</div>
  </div>
</header>
 <div class="section">${isEmbedDelete ? 'Deleted embed message · mentions are resolved to names and roles' : 'Deleted messages · mentions are resolved to names and roles'}</div>
<main class="messages">
${sorted.map(message => renderMessage(message, memberMap, roleMap, assetMap)).filter(Boolean).join('\n')}
</main>
 <footer class="footer">UPCORE Esports · ${escapeHtml(reportLabel)} · Generated ${escapeHtml(generatedAt)} IST</footer>
</body>
</html>`;

  return Buffer.from(html, 'utf8');
}

module.exports = { generateTranscript, generatePurgeTranscript };
