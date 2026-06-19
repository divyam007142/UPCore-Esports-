const fs   = require('fs');
const path = require('path');
const { logWarn } = require('../utils/console');

function loadSelectMenus(client) {
  const dir   = path.join(__dirname, '../selectmenus');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  let count = 0;
  for (const file of files) {
    try {
      const menu = require(path.join(dir, file));
      if (menu.id && menu.execute) {
        client.selectMenus.set(menu.id, menu);
        count++;
      }
    } catch (err) {
      logWarn('SelectMenuHandler', `Failed to load ${file}: ${err.message}`);
    }
  }
  return count;
}

module.exports = { loadSelectMenus };
