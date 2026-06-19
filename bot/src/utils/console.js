const chalk = require('chalk');
const { version } = require('../../package.json');

// ─── Startup Banner ───────────────────────────────────────────────────────────
function printStartupBanner() {
  console.log('');
  console.log(chalk.gray('  ─────────────────────────────────────────────────'));
  console.log(
    chalk.white.bold('  UPCore Esports Bot') +
    chalk.gray('  |  ') +
    chalk.cyan(`Version ${version}`) +
    chalk.gray('  |  ') +
    chalk.white.bold('#RiseUP')
  );
  console.log(chalk.gray('  ─────────────────────────────────────────────────'));
}

// ─── Commands summary ─────────────────────────────────────────────────────────
function logCommandsTable(commands) {
  const byCategory = commands.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {});
  const parts = Object.entries(byCategory).map(([k, v]) => `${k}:${v}`).join('  ');
  console.log(
    chalk.green('  • Commands') +
    chalk.gray(' — ') +
    chalk.white.bold(commands.length) +
    chalk.gray(' loaded  [') +
    chalk.dim(parts) +
    chalk.gray(']')
  );
}

// ─── Events summary ───────────────────────────────────────────────────────────
function logEventsTable(events) {
  console.log(
    chalk.green('  • Events  ') +
    chalk.gray(' — ') +
    chalk.white.bold(events.length) +
    chalk.gray(' loaded')
  );
}

// ─── Ready Summary ────────────────────────────────────────────────────────────
function logReady(client, { commandCount, emojiCount, canvasLoaded } = {}) {
  const cmds   = commandCount ?? client.commands?.size ?? 0;
  const guilds = client.guilds.cache.size;
  const b      = chalk.white.bold('  •');

  console.log(chalk.gray('  ─────────────────────────────────────────────────'));
  console.log(
    chalk.white.bold('  UPCore Esports Bot') +
    chalk.gray('  |  ') +
    chalk.cyan(`Version ${version}`) +
    chalk.gray('  |  ') +
    chalk.white.bold('#RiseUP')
  );
  console.log(chalk.gray('  ─────────────────────────────────────────────────'));
  console.log(`${b}  ${chalk.green('Logged in as')} ${chalk.white.bold(client.user.tag)}`);
  console.log(`${b}  ${chalk.green('Successfully registered')} ${chalk.white.bold(cmds)} ${chalk.green('commands')}`);
  console.log(`${b}  ${chalk.green('MongoDB connected Successfully')}`);
  if (emojiCount !== undefined) {
    console.log(`${b}  ${chalk.green('Application emojis loaded')} ${chalk.white.bold(emojiCount)} ${chalk.green('emojis')}`);
  }
  if (canvasLoaded === true) {
    console.log(`${b}  ${chalk.green('Napi Rs Canvas loaded successfully')}`);
  } else {
    console.log(`${b}  ${chalk.yellow('Napi Rs Canvas')} ${chalk.gray('not available (optional)')}`);
  }
  console.log(`${b}  ${chalk.green('Looking over')} ${chalk.white.bold(guilds)} ${chalk.green(`server${guilds !== 1 ? 's' : ''}`)}`);
  console.log(chalk.gray('  ─────────────────────────────────────────────────\n'));
}

// ─── Utility Loggers ─────────────────────────────────────────────────────────
function logError(source, error) {
  console.error(chalk.red.bold(`  ✘ [${source}]`), chalk.red(error?.message || error));
  if (error?.stack) console.error(chalk.gray(error.stack));
}

function logWarn(source, message) {
  console.warn(chalk.yellow(`  ⚠ [${source}]`), chalk.yellow(message));
}

function logInfo(source, message) {
  console.log(chalk.blue(`  ℹ [${source}]`), chalk.white(message));
}

function logCommand(user, command, guild) {
  console.log(
    chalk.cyan('  ►') +
    chalk.white(` /${command}`) +
    chalk.gray(' — ') +
    chalk.yellow(user) +
    chalk.gray(' in ') +
    chalk.magenta(guild)
  );
}

module.exports = {
  printStartupBanner,
  logCommandsTable,
  logEventsTable,
  logReady,
  logError,
  logWarn,
  logInfo,
  logCommand,
};
