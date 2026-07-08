const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');
const { e } = require('../../utils/emoji');
const path = require('path');

try {
  GlobalFonts.registerFromPath(path.join(__dirname, '../../../assets/Poppins-Bold.ttf'),     'PoppinsBold');
  GlobalFonts.registerFromPath(path.join(__dirname, '../../../assets/Poppins-Regular.ttf'),  'Poppins');
  GlobalFonts.registerFromPath(path.join(__dirname, '../../../assets/Poppins-SemiBold.ttf'), 'PoppinsSemiBold');
} catch {
  try {
    GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'PoppinsBold');
    GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',      'Poppins');
    GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',      'PoppinsSemiBold');
  } catch { }
}

// ─── Score & label ─────────────────────────────────────────────────────────────
function getShipScore(id1, id2) {
  const [a, b] = [BigInt(id1), BigInt(id2)].sort();
  return Number((a ^ b) % 101n);
}

function getShipLabel(pct) {
  if (pct >= 90) return { label: 'Soulmates',       emoji: '💞', color: '#ff2d78', alt: '#ff6eb4' };
  if (pct >= 75) return { label: 'Perfect Match',   emoji: '💕', color: '#ff5fa3', alt: '#ffaacc' };
  if (pct >= 60) return { label: 'Great Couple',    emoji: '💓', color: '#ff7eb3', alt: '#ffb3cf' };
  if (pct >= 45) return { label: 'Good Vibes',      emoji: '💛', color: '#f5c842', alt: '#ffe080' };
  if (pct >= 30) return { label: 'Something There', emoji: '🌸', color: '#f59042', alt: '#ffbe80' };
  if (pct >= 15) return { label: 'Awkward',          emoji: '😬', color: '#7777bb', alt: '#aaaadd' };
  return             { label: 'No Spark',            emoji: '💔', color: '#5544aa', alt: '#9977cc' };
}

// ─── Canvas helpers ────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Draw a circle-clipped avatar
async function drawAvatar(ctx, url, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  try {
    const img = await loadImage(url);
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } catch {
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
  }
  ctx.restore();
}

// Draw a glowing arc ring
function drawGlowRing(ctx, cx, cy, r, color, lineWidth = 3, glowSize = 20) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur  = glowSize;
  ctx.strokeStyle = color;
  ctx.lineWidth   = lineWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// Draw a 4-point star sparkle
function sparkle(ctx, x, y, r, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = color;
  ctx.shadowBlur  = r * 2;
  ctx.fillStyle   = color;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a  = (i / 4) * Math.PI * 2 - Math.PI / 4;
    const ai = a + Math.PI / 4;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else         ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(ai) * r * 0.3, y + Math.sin(ai) * r * 0.3);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Tiny dot star
function dot(ctx, x, y, r, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Draw a heart shape
function heart(ctx, cx, cy, size, color, glowBlur = 18) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur  = glowBlur;
  ctx.fillStyle   = color;
  const s = size;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.3);
  ctx.bezierCurveTo(cx - s * 0.05, cy + s * 0.12, cx - s, cy + s * 0.02, cx - s, cy - s * 0.32);
  ctx.bezierCurveTo(cx - s, cy - s * 0.78, cx, cy - s * 0.66, cx, cy - s * 0.32);
  ctx.bezierCurveTo(cx, cy - s * 0.66, cx + s, cy - s * 0.78, cx + s, cy - s * 0.32);
  ctx.bezierCurveTo(cx + s, cy + s * 0.02, cx + s * 0.05, cy + s * 0.12, cx, cy + s * 0.3);
  ctx.fill();
  ctx.restore();
}

// ─── Main card generator ───────────────────────────────────────────────────────
async function generateShipCard(user1, user2, score, info, shipName) {
  const W = 900, H = 330;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');
  const ac     = info.color;   // primary accent
  const ac2    = info.alt;     // secondary accent

  // ── Deep background ──────────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   '#06061a');
  bg.addColorStop(0.5, '#0c0c26');
  bg.addColorStop(1,   '#06060f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle noise grid
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.018)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 36) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 36) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.restore();

  // Star field
  const stars = [
    [80,40,0.9,0.6],[760,30,0.8,0.5],[120,290,0.7,0.4],[820,280,0.9,0.6],
    [260,20,0.6,0.35],[640,15,0.7,0.4],[40,160,0.5,0.3],[860,155,0.6,0.35],
    [310,300,0.5,0.3],[590,305,0.6,0.35],[450,25,0.8,0.5],[450,305,0.7,0.4],
    [180,60,0.4,0.25],[720,65,0.5,0.3],[380,15,0.5,0.3],[520,12,0.6,0.35],
  ];
  for (const [x,y,r,a] of stars) dot(ctx, x, y, r, a);

  // Left avatar radial glow (blue)
  const gL = ctx.createRadialGradient(165, H/2, 0, 165, H/2, 230);
  gL.addColorStop(0, 'rgba(50,90,255,0.20)');
  gL.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gL; ctx.fillRect(0, 0, W, H);

  // Right avatar radial glow (accent)
  const gR = ctx.createRadialGradient(735, H/2, 0, 735, H/2, 230);
  gR.addColorStop(0, rgba(ac, 0.22));
  gR.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gR; ctx.fillRect(0, 0, W, H);

  // Center ambient
  const gC = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, 150);
  gC.addColorStop(0, rgba(ac, 0.12));
  gC.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gC; ctx.fillRect(0, 0, W, H);

  // Corner bokeh blobs
  const blobs = [
    [60,  25,  70, '#3355ff', 0.09],
    [840, 22,  75, ac,        0.10],
    [200, 300, 50, '#6633ff', 0.07],
    [700, 295, 55, ac,        0.08],
    [W/2, 0,   45, '#ff44aa', 0.08],
    [W/2, H,   40, '#4466ff', 0.07],
  ];
  for (const [bx, by, br, bc, ba] of blobs) {
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0, rgba(bc, ba * 2.5));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI*2); ctx.fill();
  }

  // Top gradient bar
  const topG = ctx.createLinearGradient(0,0,W,0);
  topG.addColorStop(0,   'rgba(0,0,0,0)');
  topG.addColorStop(0.25, rgba('#5577ff', 0.6));
  topG.addColorStop(0.5,  rgba(ac, 0.9));
  topG.addColorStop(0.75, rgba('#5577ff', 0.6));
  topG.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = topG; ctx.fillRect(0, 0, W, 2);

  // Bottom gradient bar
  ctx.fillStyle = topG; ctx.fillRect(0, H-2, W, 2);

  // ── Avatars ──────────────────────────────────────────────────────────────────
  const AV  = 76;       // avatar radius
  const LCX = 165, RCX = 735, ACY = 148;

  // Faint outer ring
  drawGlowRing(ctx, LCX, ACY, AV+18, rgba('#3355ff', 0.15), 1, 0);
  drawGlowRing(ctx, RCX, ACY, AV+18, rgba(ac, 0.15), 1, 0);

  // Mid glow ring
  drawGlowRing(ctx, LCX, ACY, AV+8, rgba('#4466ff', 0.45), 2, 22);
  drawGlowRing(ctx, RCX, ACY, AV+8, rgba(ac, 0.50), 2, 24);

  // Sharp inner border
  drawGlowRing(ctx, LCX, ACY, AV+2, '#4466ff', 2.5, 8);
  drawGlowRing(ctx, RCX, ACY, AV+2, ac, 2.5, 10);

  await drawAvatar(ctx, user1.displayAvatarURL({ extension:'png', size:256 }), LCX, ACY, AV);
  await drawAvatar(ctx, user2.displayAvatarURL({ extension:'png', size:256 }), RCX, ACY, AV);

  // Name tags under avatars
  const tagY = ACY + AV + 22;
  for (const [tcx, name, tagAc] of [[LCX, user1._displayName, '#4466ff'], [RCX, user2._displayName, ac]]) {
    const disp = name.length > 14 ? name.slice(0,13)+'…' : name;
    ctx.save();
    ctx.font = '600 12.5px "PoppinsSemiBold"';
    const tw = ctx.measureText(disp).width;
    const pw = tw + 26, ph = 26;
    const px = tcx - pw/2;

    // Glassmorphism pill
    const pillG = ctx.createLinearGradient(px, 0, px+pw, 0);
    pillG.addColorStop(0, rgba(tagAc, 0.12));
    pillG.addColorStop(1, rgba(tagAc, 0.06));
    ctx.fillStyle = pillG;
    roundRect(ctx, px, tagY-ph/2, pw, ph, 13);
    ctx.fill();
    ctx.strokeStyle = rgba(tagAc, 0.35);
    ctx.lineWidth = 1;
    roundRect(ctx, px, tagY-ph/2, pw, ph, 13);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.90)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = rgba(tagAc, 0.6); ctx.shadowBlur = 6;
    ctx.fillText(disp, tcx, tagY);
    ctx.restore();
  }

  // ── Dashed connector lines ────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth   = 1;
  ctx.setLineDash([4, 10]);
  ctx.beginPath(); ctx.moveTo(LCX+AV+14, ACY); ctx.lineTo(W/2-80, ACY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W/2+80, ACY); ctx.lineTo(RCX-AV-14, ACY); ctx.stroke();
  ctx.restore();

  // ── Centre section ────────────────────────────────────────────────────────────
  const MX = W/2, MY = H/2;

  // Large floating hearts (behind score)
  heart(ctx, MX,      MY-66, 12.5, ac,  22);
  heart(ctx, MX-28,   MY-42,  5,   rgba(ac,  0.5), 10);
  heart(ctx, MX+30,   MY-42,  5,   rgba(ac2, 0.5), 10);

  // Score % — glow layered text
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // Wide glow pass
  ctx.shadowColor = ac; ctx.shadowBlur = 50;
  ctx.fillStyle   = rgba(ac, 0.25);
  ctx.font        = 'bold 72px "PoppinsBold"';
  ctx.fillText(`${score}%`, MX, MY - 10);
  // Sharp crisp pass
  ctx.shadowBlur  = 12;
  ctx.fillStyle   = '#ffffff';
  ctx.fillText(`${score}%`, MX, MY - 10);
  ctx.restore();

  // Label row: emoji + label text
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font      = '600 14.5px "PoppinsSemiBold"';
  ctx.shadowColor = ac; ctx.shadowBlur = 10;
  ctx.fillStyle   = rgba(ac, 0.95);
  ctx.fillText(`${info.emoji}  ${info.label}`, MX, MY + 38);
  ctx.restore();

  // Ship name pill
  const snY = MY + 64;
  ctx.save();
  ctx.font = '500 11px "Poppins"';
  const snW = ctx.measureText(shipName).width + 24, snH = 22;
  const snX = MX - snW/2;
  const snG = ctx.createLinearGradient(snX, 0, snX+snW, 0);
  snG.addColorStop(0, rgba('#4466ff', 0.14));
  snG.addColorStop(1, rgba(ac, 0.14));
  ctx.fillStyle = snG;
  roundRect(ctx, snX, snY-snH/2, snW, snH, 11); ctx.fill();
  ctx.strokeStyle = rgba(ac, 0.22); ctx.lineWidth = 1;
  roundRect(ctx, snX, snY-snH/2, snW, snH, 11); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.48)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(shipName, MX, snY);
  ctx.restore();

  // Progress bar
  const BW = 200, BH = 10, BX = MX-BW/2, BY = MY+88;
  // Track
  ctx.fillStyle = 'rgba(255,255,255,0.055)';
  roundRect(ctx, BX, BY, BW, BH, BH/2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
  roundRect(ctx, BX, BY, BW, BH, BH/2); ctx.stroke();
  // Fill
  const fw = Math.max(BH, (score/100)*BW);
  const fg = ctx.createLinearGradient(BX, 0, BX+fw, 0);
  fg.addColorStop(0, '#4488ff');
  fg.addColorStop(0.5, ac2);
  fg.addColorStop(1, ac);
  ctx.save();
  ctx.shadowColor = ac; ctx.shadowBlur = 12;
  ctx.fillStyle = fg;
  roundRect(ctx, BX, BY, fw, BH, BH/2); ctx.fill();
  ctx.restore();
  // Shine
  const shine = ctx.createLinearGradient(BX, BY, BX, BY+BH);
  shine.addColorStop(0, 'rgba(255,255,255,0.34)');
  shine.addColorStop(0.55, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  roundRect(ctx, BX, BY, fw, BH/2+1, BH/2); ctx.fill();

  // ── Sparkle decorations ───────────────────────────────────────────────────────
  const sparks = [
    [255, 42,  5.5, '#ffffff', 0.28],
    [648, 40,  5.5, '#ffffff', 0.28],
    [220, 250, 4.0, ac,        0.55],
    [682, 248, 4.0, ac,        0.55],
    [MX,  18,  4.5, '#ffffff', 0.22],
    [MX-60, 278, 3.2, '#ffffff', 0.18],
    [MX+60, 278, 3.2, '#ffffff', 0.18],
    [MX-100,260, 2.5, ac2,      0.40],
    [MX+100,260, 2.5, ac,       0.40],
  ];
  for (const [sx, sy, sr, sc, sa] of sparks) sparkle(ctx, sx, sy, sr, sc, sa);

  return canvas.toBuffer('image/png');
}

// ─── Command ───────────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Generate a compatibility card between two members')
    .addUserOption(o => o.setName('user1').setDescription('First member').setRequired(true))
    .addUserOption(o => o.setName('user2').setDescription('Second member (defaults to you)').setRequired(false)),
  cooldown: 5000,
  category: 'fun',

  async execute(interaction, client) {
    await interaction.deferReply();

    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2') ?? interaction.user;

    if (user1.id === user2.id) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.warning)
          .setDescription(`${e('warning')}  You can't ship someone with themselves!`)
          .setFooter(makeFooter(client))],
      });
    }

    const score = getShipScore(user1.id, user2.id);
    const info  = getShipLabel(score);

    const [m1, m2] = await Promise.all([
      interaction.guild.members.fetch(user1.id).catch(() => null),
      interaction.guild.members.fetch(user2.id).catch(() => null),
    ]);

    user1._displayName = m1?.displayName ?? user1.username;
    user2._displayName = m2?.displayName ?? user2.username;

    const n1       = user1._displayName;
    const n2       = user2._displayName;
    const shipRaw  = n1.slice(0, Math.ceil(n1.length / 2)) + n2.slice(Math.floor(n2.length / 2));
    const shipName = `✦ ${shipRaw} ✦`;

    const buffer     = await generateShipCard(user1, user2, score, info, shipName);
    const attachment = new AttachmentBuilder(buffer, { name: 'ship.png' });

    const embed = new EmbedBuilder()
      .setColor(parseInt(info.color.replace('#',''), 16))
      .setAuthor({
        name:    `${n1}  ×  ${n2}`,
        iconURL: user1.displayAvatarURL({ extension:'png', size:64 }),
      })
      .setDescription(
        `${info.emoji}  **${info.label}** — \`${score}%\` compatibility\n` +
        `Ship Name: **${shipRaw}**`
      )
      .setImage('attachment://ship.png')
      .setFooter(makeFooter(client, `Requested by ${interaction.user.username}`))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [attachment] });
  },
};
