const fs = require('fs');
const path = require('path');
const { logEventsTable, logWarn } = require('../utils/console');

async function loadEvents(client) {
  const events = [];
  const eventsPath = path.join(__dirname, '../events');
  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    try {
      const event = require(path.join(eventsPath, file));
      if (!event.name || !event.execute) {
        logWarn('EventHandler', `Skipping ${file} — missing name or execute`);
        continue;
      }
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      events.push(event.name);
    } catch (err) {
      logWarn('EventHandler', `Failed to load ${file}: ${err.message}`);
    }
  }

  logEventsTable(events);
  return events;
}

module.exports = { loadEvents };
