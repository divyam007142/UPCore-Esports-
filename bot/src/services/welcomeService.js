const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

const ASSETS = path.join(__dirname, '../../assets');

async function generateWelcomeCard(member, guild) {
  const W = 1200, H = 400;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ── Background banner ──────────────────────────────────────────────────────
  const bgPath = path.join(ASSETS, 'banner.webp');
  if (fs.existsSync(bgPath)) {
    const bg = await loadImage(bgPath);
    ctx.drawImage(bg, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);
  }

  // ── Dark overlay for readability ──────────────────────────────────────────
  const overlay = ctx.createLinearGradient(0, 0, W, 0);
  overlay.addColorStop(0, 'rgba(0,0,0,0.88)');
  overlay.addColorStop(0.55, 'rgba(0,0,0,0.80)');
  overlay.addColorStop(1, 'rgba(0,0,0,0.60)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, W, H);

  // ── Avatar ────────────────────────────────────────────────────────────────
  const avatarSize = 170;
  const avatarX    = 60;
  const avatarY    = (H - avatarSize) / 2;
  const cx         = avatarX + avatarSize / 2;
  const cy         = avatarY + avatarSize / 2;
  const radius     = avatarSize / 2;

  // Outer glow ring — white
  ctx.save();
  ctx.shadowColor   = 'rgba(255,255,255,0.7)';
  ctx.shadowBlur    = 24;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth   = 3;
  ctx.stroke();
  ctx.restore();

  // White ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fill();
  ctx.restore();

  // Avatar clip
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  try {
    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar    = await loadImage(avatarUrl);
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  } catch {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `bold 64px Sans`;
    ctx.textAlign = 'center';
    ctx.fillText(member.user.username[0].toUpperCase(), cx, cy + 22);
  }
  ctx.restore();

  // ── Text area ─────────────────────────────────────────────────────────────
  const textX = avatarX + avatarSize + 55;
  ctx.textAlign = 'left';

  // "WELCOME TO" label — white, bigger
  ctx.font      = 'bold 28px Sans';
  ctx.fillStyle = '#FFFFFF';
  ctx.letterSpacing = '4px';
  ctx.fillText('W E L C O M E  T O', textX, H / 2 - 72);
  ctx.letterSpacing = '0px';

  // Server name
  ctx.font      = 'bold 38px Sans';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(255,255,255,0.25)';
  ctx.shadowBlur  = 8;
  const serverName = guild.name.toUpperCase();
  ctx.fillText(serverName, textX, H / 2 - 28);
  ctx.shadowBlur = 0;

  // Divider line — white
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth   = 1.5;
  const lineEnd   = Math.min(textX + ctx.measureText(serverName).width + 40, W - 60);
  ctx.beginPath();
  ctx.moveTo(textX, H / 2 - 12);
  ctx.lineTo(lineEnd, H / 2 - 12);
  ctx.stroke();

  // Username — smaller
  ctx.font      = 'bold 36px Sans';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur  = 6;
  const displayName = `@${member.user.username}`;
  ctx.fillText(displayName, textX, H / 2 + 42);
  ctx.shadowBlur = 0;

  // Member count badge — white outline
  const countText   = `You are member #${guild.memberCount}`;
  const badgePad    = 14;
  ctx.font          = '20px Sans';
  const badgeWidth  = ctx.measureText(countText).width + badgePad * 2;
  const badgeHeight = 34;
  const badgeX      = textX;
  const badgeY      = H / 2 + 60;

  ctx.fillStyle   = 'rgba(255,255,255,0.08)';
  ctx.strokeStyle = 'rgba(255,255,255,0.50)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(countText, badgeX + badgePad, badgeY + 23);

  // ── UPCore logo (top-right) ────────────────────────────────────────────────
  const logoPath = path.join(ASSETS, 'logo.webp');
  if (fs.existsSync(logoPath)) {
    try {
      const logo     = await loadImage(logoPath);
      const logoSize = 72;
      const logoX    = W - logoSize - 30;
      const logoY    = 24;

      ctx.save();
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 3, 0, Math.PI * 2);
      ctx.fillStyle   = 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.30)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    } catch { }
  }

  return canvas.toBuffer('image/png');
}

module.exports = { generateWelcomeCard };
