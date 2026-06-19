const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logCommandsTable, logWarn } = require('../utils/console');

async function loadCommands(client) {
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
        if (!command.data || !command.execute) {
          logWarn('CommandHandler', `Skipping ${file} — missing data or execute`);
          continue;
        }
        command.category = category;
        client.commands.set(command.data.name, command);
        commands.push({ name: command.data.name, category });
      } catch (err) {
        logWarn('CommandHandler', `Failed to load ${file}: ${err.message}`);
      }
    }
  }

  logCommandsTable(commands);
  return commands;
}

module.exports = { loadCommands };
