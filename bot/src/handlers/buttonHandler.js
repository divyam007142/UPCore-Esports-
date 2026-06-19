const fs   = require('fs');
const path = require('path');
const { logWarn } = require('../utils/console');

function loadButtons(client) {
  const dir   = path.join(__dirname, '../buttons');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  let count = 0;
  for (const file of files) {
    try {
      const btn = require(path.join(dir, file));
      if (btn.id && btn.execute) {
        client.buttons.set(btn.id, btn);
        count++;
      }
    } catch (err) {
      logWarn('ButtonHandler', `Failed to load ${file}: ${err.message}`);
    }
  }
  return count;
}

module.exports = { loadButtons };
