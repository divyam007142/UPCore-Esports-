const fs   = require('fs');
const path = require('path');
const { logWarn } = require('../utils/console');

function loadModals(client) {
  const dir   = path.join(__dirname, '../modals');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  let count = 0;
  for (const file of files) {
    try {
      const modal = require(path.join(dir, file));
      if (modal.id && modal.execute) {
        client.modals.set(modal.id, modal);
        count++;
      }
    } catch (err) {
      logWarn('ModalHandler', `Failed to load ${file}: ${err.message}`);
    }
  }
  return count;
}

module.exports = { loadModals };
