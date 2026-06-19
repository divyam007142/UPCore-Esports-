/**
 * EMOJI NAME MAP
 * ─────────────────────────────────────────────────────────────────────────────
 * Left side  = semantic key used throughout the bot  (import & call e('key'))
 * Right side = exact emoji name as uploaded to the Discord Developer Portal
 *
 * How it works:
 *   e('ban')  → looks up EMOJI_NAMES.ban = '187302ban'
 *              → finds '<:187302ban:123456789>' in cache
 *              → returns that string
 *
 * To add/change an emoji: update the right-hand value to match the uploaded name.
 * Run /ping after restarting to confirm all 172 emojis are loading correctly.
 */
const EMOJI_NAMES = {
  success:    '90221success',            // green success
  error:      '33476glowingdotred',      // red dot = error
  warning:    '33036warning',            // warning triangle
  info:       '627252info',              // info circle
  ban:        '187302ban',               // ban hammer
  kick:       '4692ttskickwhite',        // kick icon
  mute:       '3316timeout',             // timeout = mute
  unmute:     '4173ttsremovered',        // removed = unmute
  warn:       '33036warning',            // reuse warning
  unban:      '1927unlocked',            // unlocked = unban
  lock:       '6220locked',              // lock icon
  unlock:     '1927unlocked',            // unlocked icon
  shield:     '553968admin',             // admin shield
  mod:        '8729moderator',           // moderator badge
  log:        '84439logs',               // logs icon
  voice:      '9068voice',               // voice channel icon
  role:       '604037roleids',           // role icon
  stats:      '17576growthids',          // growth chart = stats
  ping:       '479407mention',           // mention = ping
  clock:      '138210clock',             // clock icon
  check:      '78303verifiedgreen',      // green verified = check
  cross:      '12138cross',              // cross/X icon
  loading:    '28213ttsloading',         // loading spinner
  crown:      '74658vipglow',            // VIP = crown
  bot:        '158897bot',               // bot icon
  member:     '928205membericon',        // member icon
  channel:    '3977channelforumpost',    // channel icon
  reminder:   '3848mail',               // mail = reminder DM
  note:       '982002wishnote',          // note icon
  purge:      '793810purge',             // purge/delete icon
  snipe:      '883238search',            // search = snipe
  afk:        '22234idleids',            // idle = AFK
  hack:       '883238search',            // search = surveillance
  tournament: '1349games',               // games = tournament
  screenshot: '2050upload',             // upload = screenshot/attachment
  welcome:    '17533welcomeids',         // welcome icon
  leave:      '38811offlineids',         // offline = leave
  case:       '6951document',            // document = case file
  automod:    '4986usesautomod',         // automod icon
  config:     '412801settings',          // settings = config
  help:       '113845animehelp',         // help icon
  upcore:     '87677verified',           // verified = UPCORE brand
  calendar:   '473488calender',          // calendar (note: "calender" spelling)
  link:       '874011link',              // link icon
  target:     '883238search',            // search = target
  server:     '91177servermanager',      // server manager icon
  join:       '11497joinvcbubbles',      // join VC icon
  dodge:      '4906x',                   // X = dodge/fail
  wrong:      '4906x',                   // X = wrong channel
  nick:       '984149edit',              // edit = nickname change
  key:        '9649id',                  // ID card = key/access
  time:       '8810datetime',            // datetime = time
  star:       '985872star',              // star icon
  fire:       '5186shinybluesparkles',   // sparkles ≈ fire/hype
};

module.exports = { EMOJI_NAMES };
