# UPCORE Esports Bot — Setup Guide

This guide walks you through getting the bot running from scratch.

---

## Prerequisites

Before starting, make sure you have:

- **Node.js v18 or higher** — [nodejs.org](https://nodejs.org)
- **npm** (comes with Node.js)
- **A MongoDB database** — [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier works fine)
- **A Discord application** — [Discord Developer Portal](https://discord.com/developers/applications)

---

## Step 1 — Create a Discord Application

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** and give it a name (e.g. `UPCORE Esports`)
3. Go to the **Bot** tab → click **Add Bot**
4. Under **Token**, click **Reset Token** and copy it — this is your `DISCORD_BOT_TOKEN`
5. Copy your **Application ID** from the General Information tab — this is your `CLIENT_ID`

### Required Bot Permissions

Enable the following **Privileged Gateway Intents** on the Bot tab:
- ✅ Server Members Intent
- ✅ Message Content Intent
- ✅ Presence Intent

### Invite the Bot

Generate an invite URL from **OAuth2 → URL Generator**:

- Scopes: `bot`, `applications.commands`
- Bot Permissions: `Administrator` (recommended) or at minimum:
  - Manage Channels, Manage Roles, Manage Messages
  - Ban Members, Kick Members, Moderate Members
  - View Channels, Send Messages, Embed Links, Attach Files
  - Read Message History, Use External Emojis
  - Move Members, Mute Members, Deafen Members

---

## Step 2 — Set Up MongoDB

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user with read/write permissions
3. Whitelist your server IP (or `0.0.0.0/0` for any IP)
4. Click **Connect → Drivers** and copy the connection string
5. Replace `<password>` in the string with your database user's password — this is your `MONGODB_URI`

---

## Step 3 — Configure Environment Variables

Copy the example file:

```bash
cp bot/.env.example bot/.env
```

Open `bot/.env` and fill in every value:

```env
DISCORD_BOT_TOKEN=        # Bot token from Developer Portal
CLIENT_ID=                # Application ID from Developer Portal
GUILD_ID=                 # Right-click your server → Copy Server ID
MONGODB_URI=              # MongoDB connection string

ADMIN_ROLE_ID=            # Role ID for bot administrators
WELCOME_CHANNEL_ID=       # Channel ID where welcome cards are sent
WELCOME_LOG_CHANNEL_ID=   # Channel ID for welcome logs
LOGS_CHANNEL_ID=          # Channel ID for general event logs

# Ticket System
TICKET_PANEL_ID=          # Channel where the support panel embed is posted
TICKET_LOG_CHANNEL_ID=    # Channel where ticket actions are logged
TICKET_SUPPORT_ROLE_ID=   # Role that can manage tickets (support staff)

# Ticket category channel IDs (must be Discord "Category" channels)
TICKET_CATEGORY_ID1=      # General Support
TICKET_CATEGORY_ID2=      # Tournament Support
TICKET_CATEGORY_ID3=      # Club Join Request
TICKET_CATEGORY_ID4=      # Business Enquiries
TICKET_CATEGORY_ID5=      # Others
```

> **How to get IDs** — Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode), then right-click any channel, role, or server and click **Copy ID**.

---

## Step 4 — Install Dependencies

```bash
cd bot
npm install
```

---

## Step 5 — Deploy Slash Commands

Run this once to register all slash commands with Discord:

```bash
cd bot
npm run deploy
```

You should see a confirmation that 60 commands were registered. This only needs to be re-run when you add or remove commands.

---

## Step 6 — Start the Bot

```bash
cd bot
npm start
```

For development with auto-restart on file changes:

```bash
cd bot
npm run dev
```

A successful startup looks like:

```
─────────────────────────────────────────────────
UPCore Esports Bot  |  Version 1.0.0  |  #RiseUP
─────────────────────────────────────────────────
• MongoDB connected
• Commands — 60 loaded  [fun:1  information:5  moderation:21  role:5  ticket:15  utility:7  voice:6]
• Events   — 10 loaded
─────────────────────────────────────────────────
•  Logged in as UPCore Esports#XXXX
•  Successfully registered 60 commands
•  MongoDB connected Successfully
•  Application emojis loaded
```

---

## Step 7 — Post the Ticket Panel

Once the bot is online in your server, run:

```
/panel
```

in the channel configured as `TICKET_PANEL_ID`. This posts the support panel embed with the category select menu.

---

## Discord Server Setup Checklist

| Item | Notes |
|---|---|
| ✅ Bot invited with correct permissions | See Step 1 |
| ✅ Privileged intents enabled | Members, Message Content, Presence |
| ✅ 5 Discord category channels created | One per ticket type |
| ✅ Ticket support role created | Assigned to staff members |
| ✅ Welcome channel exists | Where welcome cards are posted |
| ✅ Log channels created | General logs + ticket logs + welcome logs |
| ✅ All env vars filled | No blank values |
| ✅ `/panel` run in ticket channel | Posts the support panel |

---

## Production Deployment

For a production server (VPS, cloud, etc.):

1. Copy `bot/production.env` and fill in your production values
2. Use a process manager like **PM2** to keep the bot alive:

```bash
npm install -g pm2
cd bot
pm2 start src/index.js --name "upcore-bot"
pm2 save
pm2 startup
```

3. To view logs: `pm2 logs upcore-bot`
4. To restart: `pm2 restart upcore-bot`

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `Cannot find module 'discord.js'` | Run `npm install` inside the `bot/` folder |
| Bot not responding to commands | Re-run `npm run deploy` to register commands |
| Ticket category not found | Check that `TICKET_CATEGORY_IDx` points to a Discord **Category** channel, not a text channel |
| MongoDB connection error | Check your `MONGODB_URI`, IP whitelist, and database user credentials |
| Welcome card not showing | Ensure `WELCOME_CHANNEL_ID` is set and the bot has permission to send files in that channel |
| Commands not appearing | Wait up to 1 hour for Discord to propagate global commands, or use `GUILD_ID` for instant guild commands |

---

## Support

For issues specific to UPCORE Esports, open a ticket in the Discord server.
