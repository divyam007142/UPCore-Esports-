const { Collection } = require('discord.js');

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTs(date) {
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', hour12: true,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
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

function renderEmbed(embed) {
  const bc = embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : '#5865F2';
  let html = `<div class="embed" style="border-color:${bc}">`;
  if (embed.author?.name) html += `<div class="embed-author">${escapeHtml(embed.author.name)}</div>`;
  if (embed.title)        html += `<div class="embed-title">${escapeHtml(embed.title)}</div>`;
  if (embed.description)  html += `<div class="embed-desc">${escapeHtml(embed.description).replace(/\n/g, '<br>')}</div>`;
  if (embed.fields?.length) {
    html += `<div class="embed-fields">`;
    for (const f of embed.fields) {
      html += `<div class="embed-field${f.inline ? ' inline' : ''}">` +
        `<div class="embed-fname">${escapeHtml(f.name)}</div>` +
        `<div class="embed-fval">${escapeHtml(f.value).replace(/\n/g, '<br>')}</div>` +
        `</div>`;
    }
    html += `</div>`;
  }
  if (embed.image?.url) html += `<div class="embed-img"><img src="${embed.image.url}" alt="embed image"></div>`;
  if (embed.footer?.text) html += `<div class="embed-footer">${escapeHtml(embed.footer.text)}</div>`;
  html += `</div>`;
  return html;
}

function renderMessage(msg, memberMap) {
  const info      = memberMap.get(msg.author.id) ?? {};
  const dname     = info.displayName || msg.author.globalName || msg.author.username || 'Unknown';
  const tag       = info.tag || msg.author.tag;
  const isBot     = info.isBot ?? msg.author.bot;
  const topRole   = info.topRole;
  const ts        = formatTs(msg.createdTimestamp);
  const avatar    = msg.author.displayAvatarURL({ size: 64, extension: 'png' });

  const nameColor = topRole ? topRole.color : (isBot ? '#00D4FF' : '#e0e0e0');
  const roleBadge = topRole
    ? `<span class="role-badge" style="color:${topRole.color};border-color:${topRole.color}">${escapeHtml(topRole.name)}</span>`
    : (isBot ? `<span class="bot-badge">APP</span>` : '');

  let body = '';
  if (msg.content) body += `<div class="msg-text">${escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>`;
  for (const embed of msg.embeds)          body += renderEmbed(embed);
  for (const att of msg.attachments.values()) {
    if (/\.(png|jpe?g|gif|webp|svg)$/i.test(att.name ?? ''))
      body += `<div class="attachment"><img src="${att.url}" alt="${escapeHtml(att.name ?? '')}"></div>`;
    else
      body += `<div class="attachment file-att"><span class="file-icon">📄</span><a href="${att.url}" target="_blank">${escapeHtml(att.name ?? 'file')}</a></div>`;
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

function renderFormData(formData) {
  if (!formData || !Object.keys(formData).length) return '';
  let rows = '';
  for (const [k, v] of Object.entries(formData)) {
    if (v == null || v === '') continue;
    const str      = String(v);
    const isUrl    = /^https?:\/\/.+/i.test(str.trim());
    const rendered = isUrl
      ? `<a href="${escapeHtml(str.trim())}" target="_blank" style="color:#00aff4">View Attachment ↗</a>`
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
  const memberMap = channel.guild ? await buildMemberMap(channel.guild, userIds) : new Map();
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
  .embed-footer{font-size:11px;color:#72767d;margin-top:8px;border-top:1px solid #2b2d31;padding-top:6px}
  .attachment img{max-width:400px;max-height:280px;border-radius:6px;margin-top:6px;display:block}
  .file-att{display:inline-flex;align-items:center;gap:8px;background:#1e2128;border:1px solid #2d3039;padding:8px 14px;border-radius:6px;margin-top:6px}
  .footer{background:#0a0a0a;border-top:1px solid #1e2029;padding:14px 36px;text-align:center;font-size:11px;color:#4f545c}
  .footer strong{color:#72767d}
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
${renderFormData(ticket.formData)}
<div class="msgs-header"># ${escapeHtml(channel.name ?? ticket.ticketId)}</div>
<div class="messages">
${sorted.map(m => renderMessage(m, memberMap)).filter(Boolean).join('\n')}
</div>
<div class="footer">UPCORE Esports  •  Ticket System  •  Generated <strong>${generatedAt} IST</strong></div>
</body>
</html>`;

  return Buffer.from(html, 'utf8');
}

module.exports = { generateTranscript };
