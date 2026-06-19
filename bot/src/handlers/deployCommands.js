require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const commands = [];
const commandsPath = path.join(__dirname, '../commands');
const categories = fs.readdirSync(commandsPath);

for (const category of categories) {
  const categoryPath = path.join(commandsPath, category);
  if (!fs.statSync(categoryPath).isDirectory()) continue;
  const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const command = require(path.join(categoryPath, file));
      if (command.data) {
        commands.push(command.data.toJSON());
        console.log(chalk.green(`  ✔ Queued: /${command.data.name}`));
      }
    } catch (e) {
      console.error(chalk.red(`  ✘ Failed: ${file} — ${e.message}`));
    }
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

const GUILD_IDS = [
  '1341952972069797982',
];

(async () => {
  for (const guildId of GUILD_IDS) {
    try {
      console.log(chalk.cyan(`\n  Deploying ${commands.length} slash commands to guild ${guildId}...`));
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
        { body: commands }
      );
      console.log(chalk.green.bold(`  ✔ Successfully deployed ${data.length} commands to ${guildId}!\n`));
    } catch (error) {
      console.error(chalk.red(`  ✘ Deploy failed for ${guildId}:`), error);
    }
  }
})();
