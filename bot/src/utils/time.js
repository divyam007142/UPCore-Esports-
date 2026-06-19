const moment = require('moment-timezone');
const ms = require('ms');
const { timezone } = require('../config/config');

function toIST(date = new Date()) {
  return moment(date).tz(timezone);
}

function formatIST(date = new Date(), format = 'DD/MM/YYYY hh:mm:ss A') {
  return toIST(date).format(format);
}

function getRelativeTime(date) {
  return moment(date).fromNow();
}

function parseDuration(str) {
  if (!str) return null;
  const parsed = ms(str);
  if (!parsed) return null;
  return parsed;
}

function formatDuration(ms_val) {
  if (!ms_val) return 'Permanent';
  const d = Math.floor(ms_val / 86400000);
  const h = Math.floor((ms_val % 86400000) / 3600000);
  const m = Math.floor((ms_val % 3600000) / 60000);
  const s = Math.floor((ms_val % 60000) / 1000);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s) parts.push(`${s}s`);
  return parts.join(' ') || '0s';
}

function getAccountAge(createdAt) {
  const now = moment();
  const created = moment(createdAt);
  const years = now.diff(created, 'years');
  const months = now.diff(created, 'months') % 12;
  const days = now.diff(created, 'days') % 30;
  const parts = [];
  if (years) parts.push(`${years}y`);
  if (months) parts.push(`${months}mo`);
  if (days) parts.push(`${days}d`);
  return parts.join(' ') || '0d';
}

function discordTimestamp(date, style = 'f') {
  const unix = Math.floor(new Date(date).getTime() / 1000);
  return `<t:${unix}:${style}>`;
}

module.exports = { toIST, formatIST, getRelativeTime, parseDuration, formatDuration, getAccountAge, discordTimestamp };
