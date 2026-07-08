const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');
const { e } = require('../../utils/emoji');

// Register system fonts for better typography
try {
  GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'DejaVuBold');
  GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'DejaVu');
} catch { }

// ─── Score & label ─────────────────────────────────────────────────────────────
function getShipScore(id1, id2) {
  const [a, b] = [BigInt(id1), BigInt(id2)].sort();
  return Number((a ^ b) % 101n);
}

function getShipLabel(pct) {
  if (pct >= 90) return { label: '💞  Soulmates',      color: '#ff3d9a' };
  if (pct >= 75) return { label: '💕  Perfect Match',  color: '#ff6ec7' };
  if (pct >= 60) return { label: '💓  Great Couple',   color: '#ff8fab' };
  if (pct >= 45) return { label: '💛  Good Vibes',     color: '#f5c842' };
  if (pct >= 30) return { label: '🌸  Something There', color: '#f59f42' };
  if (pct >= 15) return { label: '😬  Awkward',        color: '#8888aa' };
  return            { label: '💔  No Spark',           color: '#555577' };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
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
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function drawAvatar(ctx, url, x, y, size) {
  const r = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
  ctx.clip();
  try {
    ctx.drawImage(await loadImage(url), x, y, size, size);
  } catch {
    ctx.fillStyle = '#1e1e3a';
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
}

function drawRing(ctx, cx, cy, r, color, blur = 0) {
  ctx.save();
  if (blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

function drawHeart(ctx, cx, cy, size, color) {
  const s = size;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.35);
  ctx.bezierCurveTo(cx - s * 0.05, cy + s * 0.15, cx - s, cy + s * 0.05, cx - s, cy - s * 0.35);
  ctx.bezierCurveTo(cx - s, cy - s * 0.8, cx, cy - s * 0.7, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx, cy - s * 0.7, cx + s, cy - s * 0.8, cx + s, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s, cy + s * 0.05, cx + s * 0.05, cy + s * 0.15, cx, cy + s * 0.35);
  ctx.fill();
  ctx.restore();
}

function drawSparkle(ctx, x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 - Math.PI / 4;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    const ai = a + Math.PI / 4;
    ctx.lineTo(x + Math.cos(ai) * r * 0.35, y + Math.sin(ai) * r * 0.35);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawNameTag(ctx, name, cx, y) {
  ctx.save();
  ctx.font = '13px "DejaVu"';
  const tw = ctx.measureText(name).width;
  const pw = tw + 20, ph = 24, px = cx - pw / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  roundRect(ctx, px, y - ph / 2, pw, ph, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  roundRect(ctx, px, y - ph / 2, pw, ph, 12);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, cx, y);
  ctx.restore();
}

// ─── Main card generator ───────────────────────────────────────────────────────
async function generateShipCard(user1, user2, score, label, accent) {
  const W = 800, H = 290;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background base
  ctx.fillStyle = '#0b0b1a';
  ctx.fillRect(0, 0, W, H);

  // Left radial glow (blue)
  const gL = ctx.createRadialGradient(150, H / 2, 0, 150, H / 2, 210);
  gL.addColorStop(0, 'rgba(40,80,255,0.18)');
  gL.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gL;
  ctx.fillRect(0, 0, W, H);

  // Right radial glow (accent)
  const gR = ctx.createRadialGradient(650, H / 2, 0, 650, H / 2, 210);
  gR.addColorStop(0, rgba(accent, 0.18));
  gR.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gR;
  ctx.fillRect(0, 0, W, H);

  // Center glow (heart area)
  const gC = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 120);
  gC.addColorStop(0, rgba(accent, 0.08));
  gC.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gC;
  ctx.fillRect(0, 0, W, H);

  // Bokeh blobs
  const blobs = [
    { x: 60,  y: 30,  r: 55, c: '#3366ff', a: 0.06 },
    { x: 730, y: 35,  r: 60, c: accent,    a: 0.06 },
    { x: 200, y: 250, r: 40, c: '#6644ff', a: 0.05 },
    { x: 600, y: 255, r: 45, c: accent,    a: 0.05 },
    { x: 400, y: 15,  r: 35, c: '#ff44aa', a: 0.06 },
    { x: 380, y: 280, r: 30, c: '#4488ff', a: 0.05 },
  ];
  for (const b of blobs) {
    ctx.save();
    const bg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    bg.addColorStop(0, rgba(b.c, b.a * 2));
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Divider lines
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.beginPath(); ctx.moveTo(200, H / 2 - 4); ctx.lineTo(310, H / 2 - 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(490, H / 2 - 4); ctx.lineTo(600, H / 2 - 4); ctx.stroke();
  ctx.restore();

  // Sparkles
  const sparks = [
    { x: 240, y: 52, r: 5.5 }, { x: 558, y: 50, r: 5.5 },
    { x: 218, y: 222, r: 4 }, { x: 580, y: 220, r: 4 },
    { x: 400, y: 28, r: 4.5 }, { x: 345, y: 260, r: 3.5 }, { x: 455, y: 262, r: 3.5 },
  ];
  for (const s of sparks) drawSparkle(ctx, s.x, s.y, s.r, 'rgba(255,255,255,0.22)');

  // Bottom accent bar
  const bottomBar = ctx.createLinearGradient(0, 0, W, 0);
  bottomBar.addColorStop(0,   'rgba(40,100,255,0.0)');
  bottomBar.addColorStop(0.2, rgba('#4488ff', 0.7));
  bottomBar.addColorStop(0.5, rgba(accent, 0.9));
  bottomBar.addColorStop(0.8, rgba('#4488ff', 0.7));
  bottomBar.addColorStop(1,   'rgba(40,100,255,0.0)');
  ctx.fillStyle = bottomBar;
  ctx.fillRect(0, H - 3, W, 3);

  // ── Avatars ──────────────────────────────────────────────────────────────────
  const AV = 148;
  const avY = (H - AV) / 2 - 12;
  const LX = 26, RX = W - 26 - AV;
  const lcx = LX + AV / 2, lcy = avY + AV / 2;
  const rcx = RX + AV / 2, rcy = avY + AV / 2;

  // Outer glow rings
  drawRing(ctx, lcx, lcy, AV / 2 + 10, rgba('#4488ff', 0.18), 0);
  drawRing(ctx, lcx, lcy, AV / 2 + 5,  rgba('#4488ff', 0.50), 18);
  drawRing(ctx, lcx, lcy, AV / 2 + 1,  rgba('#4488ff', 0.80), 0);

  drawRing(ctx, rcx, rcy, AV / 2 + 10, rgba(accent, 0.18), 0);
  drawRing(ctx, rcx, rcy, AV / 2 + 5,  rgba(accent, 0.50), 18);
  drawRing(ctx, rcx, rcy, AV / 2 + 1,  rgba(accent, 0.80), 0);

  await drawAvatar(ctx, user1.displayAvatarURL({ extension: 'png', size: 256 }), LX, avY, AV);
  await drawAvatar(ctx, user2.displayAvatarURL({ extension: 'png', size: 256 }), RX, avY, AV);

  // Name tags
  const n1 = (user1.globalName ?? user1.username).slice(0, 13);
  const n2 = (user2.globalName ?? user2.username).slice(0, 13);
  drawNameTag(ctx, n1, lcx, avY + AV + 20);
  drawNameTag(ctx, n2, rcx, avY + AV + 20);

  // ── Centre ───────────────────────────────────────────────────────────────────
  const MX = W / 2, MY = H / 2;

  // Heart above percentage
  drawHeart(ctx, MX, MY - 52, 13, accent);

  // Percentage — layered for glow
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Soft glow pass
  ctx.shadowColor = accent;
  ctx.shadowBlur = 32;
  ctx.fillStyle = rgba(accent, 0.4);
  ctx.font = 'bold 62px "DejaVuBold"';
  ctx.fillText(`${score}%`, MX, MY - 6);

  // Crisp main pass
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${score}%`, MX, MY - 6);
  ctx.restore();

  // Label
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '15px "DejaVu"';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(label, MX, MY + 34);
  ctx.restore();

  // Progress bar
  const BW = 180, BH = 11, BX = MX - BW / 2, BY = MY + 56;

  // Track
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  roundRect(ctx, BX, BY, BW, BH, BH / 2);
  ctx.fill();

  // Fill
  const fw = Math.max(BH, (score / 100) * BW);
  const fillGrad = ctx.createLinearGradient(BX, 0, BX + fw, 0);
  fillGrad.addColorStop(0, '#4488ff');
  fillGrad.addColorStop(1, accent);
  ctx.fillStyle = fillGrad;
  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = 8;
  roundRect(ctx, BX, BY, fw, BH, BH / 2);
  ctx.fill();
  ctx.restore();

  // Inner shine on bar
  const shine = ctx.createLinearGradient(BX, BY, BX, BY + BH);
  shine.addColorStop(0, 'rgba(255,255,255,0.28)');
  shine.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  roundRect(ctx, BX, BY, fw, BH / 2 + 1, BH / 2);
  ctx.fill();

  return canvas.toBuffer('image/png');
}

// ─── Command ───────────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Generate a fun compatibility card between two members')
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
    const { label, color } = getShipLabel(score);

    const [m1, m2] = await Promise.all([
      interaction.guild.members.fetch(user1.id).catch(() => null),
      interaction.guild.members.fetch(user2.id).catch(() => null),
    ]);

    // Attach display names for the card
    user1.globalName = m1?.displayName ?? user1.username;
    user2.globalName = m2?.displayName ?? user2.username;

    const name1 = user1.globalName;
    const name2 = user2.globalName;
    const shipName = name1.slice(0, Math.ceil(name1.length / 2)) + name2.slice(Math.floor(name2.length / 2));

    const buffer     = await generateShipCard(user1, user2, score, label, color);
    const attachment = new AttachmentBuilder(buffer, { name: 'ship.png' });

    const embed = new EmbedBuilder()
      .setColor(parseInt(color.replace('#', ''), 16))
      .setTitle(`${emojis.star}  ${name1} & ${name2}`)
      .setDescription(`**Ship Name:** \`${shipName}\`\n**Compatibility:** \`${score}%\` — ${label}`)
      .setImage('attachment://ship.png')
      .setFooter(makeFooter(client, `Requested by ${interaction.user.username}`))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [attachment] });
  },
};
