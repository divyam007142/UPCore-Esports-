// Load .env only if present (secrets already injected in production environment)
try { require('dotenv').config(); } catch (_) {}
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const { connectDatabase } = require('./services/database');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { loadButtons } = require('./handlers/buttonHandler');
const { loadModals } = require('./handlers/modalHandler');
const { loadSelectMenus } = require('./handlers/selectMenuHandler');
const { printStartupBanner, logError } = require('./utils/console');

// ─── Global crash guards ──────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logError('UnhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
});
process.on('uncaughtException', (err) => {
  logError('UncaughtException', err);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
  ],
});

client.commands    = new Collection();
client.cooldowns   = new Collection();
client.buttons     = new Collection();
client.modals      = new Collection();
client.selectMenus = new Collection();
client.sniped      = new Map();
client.editedSniped = new Map();
client.afkUsers    = new Map();
client.invites     = new Map();

async function main() {
  printStartupBanner();
  await connectDatabase();
  await loadCommands(client);
  await loadEvents(client);
  loadButtons(client);
  loadModals(client);
  loadSelectMenus(client);
  await client.login(process.env.DISCORD_BOT_TOKEN);
}

main().catch((err) => {
  logError('Startup', err);
  process.exit(1);
});

module.exports = client;
