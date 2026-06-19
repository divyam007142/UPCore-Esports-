const { EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');
const { e } = require('./emoji');

const FOOTER_TEXT = 'UPCORE Esports';

function makeFooter(client, extra = '') {
  return {
    text:    extra ? `${FOOTER_TEXT} • ${extra}` : FOOTER_TEXT,
    iconURL: client?.user?.displayAvatarURL({ size: 64 }) ?? undefined,
  };
}

function base(color) {
  return new EmbedBuilder().setColor(color).setTimestamp();
}

function success(description, client) {
  return base(colors.success)
    .setDescription(`${e('success')} ${description}`)
    .setFooter(makeFooter(client));
}

function error(description, client) {
  return base(colors.error)
    .setDescription(`${e('error')} ${description}`)
    .setFooter(makeFooter(client));
}

function warning(description, client) {
  return base(colors.warning)
    .setDescription(`${e('warning')} ${description}`)
    .setFooter(makeFooter(client));
}

function info(description, client) {
  return base(colors.info)
    .setDescription(`${e('info')} ${description}`)
    .setFooter(makeFooter(client));
}

module.exports = { makeFooter, base, success, error, warning, info, FOOTER_TEXT };
