<div align="center">

<img src="bot/assets/logo.webp" alt="UPCORE Esports Logo" width="120" />

# UPCORE Esports Bot

**All-in-one Discord server management bot built for UPCORE Esports**

[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/node.js-v24-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongoosejs.com)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

</div>

---

## Overview

UPCORE Esports Bot is a feature-rich, self-hosted Discord bot designed specifically for esports communities. It handles everything from moderation and ticketing to voice management and welcome cards — all in one place.

- **60 slash commands** across 8 categories
- **Advanced ticket system** with 5 categories, transcripts, and staff workflows
- **Full moderation suite** — bans, mutes, kicks, cases, warnings, notes, triggers
- **Welcome card generator** with custom canvas-rendered images
- **Voice moderation** — mute, deafen, kick, and move members across VCs
- **Role management** — bulk add/remove roles across the entire server
- **Auto-moderation** — bad-word filter with configurable triggers
- **Auto-translation** — non-English ticket submissions translated to English automatically

---

## Features

### 🎫 Ticket System
- 5 ticket categories: General, Tournament, Club Join, Business, Others
- Per-category Discord channel categories
- Modal forms with file upload support
- Staff claim, lock, escalate, and special-flag workflows
- Auto-generated HTML transcripts sent to the user via DM on close
- Ticket blacklist / whitelist system
- Confirmation prompt before closing

### 🛡️ Moderation
- Ban, kick, mute (timeout), warn, unwarn, unban
- Case system with full history per user
- Staff notes per user
- Auto-trigger responses (keyword → reply)
- Message snipe, purge, nickname management
- Lockdown (server-wide or per-channel)
- Hack/edited message logging

### 🎙️ Voice
- VC kick, mute, deafen, unmute, undeafen
- Move members between voice channels

### 👥 Role Management
- Add / remove roles from individual members
- Bulk add / remove roles to every server member

### ℹ️ Information
- User info, server info, channel info
- Avatar and banner lookup

### 🛠️ Utility
- AFK set / remove
- Reminders
- Translation (any language → English)
- Say (bot announcement) and Stats

### 🎉 Fun
- Anime command

---

## Commands

<details>
<summary><strong>Ticket (15)</strong></summary>

| Command | Description |
|---|---|
| `/panel` | Post the support panel |
| `/close` | Close a ticket (with confirmation) |
| `/claim` | Claim a ticket |
| `/unclaim` | Unclaim a ticket |
| `/add` | Add a user to a ticket |
| `/remove` | Remove a user from a ticket |
| `/lock` | Lock a ticket channel |
| `/unlock` | Unlock a ticket channel |
| `/rename` | Rename a ticket channel |
| `/transcript` | Generate a ticket transcript |
| `/delete` | Force-delete a ticket channel |
| `/escalate` | Escalate a ticket to senior staff |
| `/special` | Mark a ticket as special |
| `/blacklist-user` | Blacklist a user from opening tickets |
| `/whitelist-user` | Remove a user from the ticket blacklist |

</details>

<details>
<summary><strong>Moderation (21)</strong></summary>

| Command | Description |
|---|---|
| `/ban` | Ban a member |
| `/unban` | Unban a user |
| `/kick` | Kick a member |
| `/mute` | Timeout a member |
| `/unmute` | Remove a member's timeout |
| `/warn` | Warn a member |
| `/unwarn` | Remove a warning |
| `/warnings` | View all warnings for a member |
| `/purge` | Bulk-delete messages |
| `/nick` | Change a member's nickname |
| `/cases-show` | View moderation cases for a member |
| `/note` | Add a staff note to a member |
| `/note-show` | View staff notes for a member |
| `/snipe` | Recover the last deleted message |
| `/trigger-create` | Create an auto-trigger response |
| `/trigger-remove` | Remove an auto-trigger |
| `/trigger-show` | List all triggers |
| `/lockdown-start` | Start a server/channel lockdown |
| `/lockdown-end` | End a lockdown |
| `/hack` | Show recent edits/deletes for a user |
| `/edited` | Show recently edited messages |

</details>

<details>
<summary><strong>Voice (6)</strong></summary>

| Command | Description |
|---|---|
| `/vc-kick` | Kick a member from their VC |
| `/vc-mute` | Server-mute a member |
| `/vc-unmute` | Remove server-mute |
| `/vc-deafen` | Server-deafen a member |
| `/vc-undeafen` | Remove server-deafen |
| `/vc-move` | Move a member to another VC |

</details>

<details>
<summary><strong>Role (5)</strong></summary>

| Command | Description |
|---|---|
| `/role-add` | Add a role to a member |
| `/role-remove` | Remove a role from a member |
| `/role-all-add` | Add a role to every server member |
| `/role-all-remove` | Remove a role from every server member |
| `/role-info` | View details about a role |

</details>

<details>
<summary><strong>Information (5)</strong></summary>

| Command | Description |
|---|---|
| `/user-info` | View info about a user |
| `/server-info` | View server statistics |
| `/channel-info` | View info about a channel |
| `/avatar` | View a user's avatar |
| `/banner` | View a user's banner |

</details>

<details>
<summary><strong>Utility (7)</strong></summary>

| Command | Description |
|---|---|
| `/help` | View all commands |
| `/afk-set` | Set your AFK status |
| `/afk-remove` | Remove your AFK status |
| `/remind` | Set a reminder |
| `/say` | Make the bot send a message |
| `/translate` | Translate text to English |
| `/stats` | View bot statistics |

</details>

<details>
<summary><strong>Fun (1)</strong></summary>

| Command | Description |
|---|---|
| `/anime` | Anime-related fun command |

</details>

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24 |
| Discord API | discord.js v14 |
| Database | MongoDB via Mongoose |
| Canvas | @napi-rs/canvas |
| HTTP | Axios |
| Timezone | IST (Asia/Kolkata) |

---

## Getting Started

See [SETUP.md](SETUP.md) for full installation and configuration instructions.

---

## Project Structure

```
bot/
├── assets/               # Static images and GIFs used in embeds
├── src/
│   ├── index.js          # Entry point
│   ├── buttons/          # Button interaction handlers
│   ├── commands/         # Slash command files (by category)
│   ├── config/           # Bot config and emoji name map
│   ├── events/           # Discord gateway event handlers
│   ├── handlers/         # Command, event, button, modal, select menu loaders
│   ├── modals/           # Modal submit handlers
│   ├── models/           # Mongoose schemas
│   ├── selectmenus/      # Select menu handlers
│   ├── services/         # Business logic (welcome, automod, cases, etc.)
│   └── utils/            # Shared utilities (emoji, permissions, transcript, etc.)
├── .env.example          # Environment variable template
├── production.env        # Production environment variables (never commit)
└── package.json
```

---

## Environment Variables

Copy `.env.example` to `.env` (development) or fill in `production.env` (production).

| Variable | Description |
|---|---|
| `DISCORD_BOT_TOKEN` | Your bot token from Discord Developer Portal |
| `CLIENT_ID` | Your bot's application/client ID |
| `GUILD_ID` | Your Discord server ID |
| `MONGODB_URI` | MongoDB connection string |
| `ADMIN_ROLE_ID` | Role ID for bot admins |
| `WELCOME_CHANNEL_ID` | Channel where welcome cards are sent |
| `WELCOME_LOG_CHANNEL_ID` | Channel for welcome logs |
| `LOGS_CHANNEL_ID` | General logs channel |
| `TICKET_PANEL_ID` | Channel where the ticket panel is posted |
| `TICKET_LOG_CHANNEL_ID` | Channel for ticket action logs |
| `TICKET_SUPPORT_ROLE_ID` | Role that can manage tickets |
| `TICKET_CATEGORY_ID1` | Discord category for General Support tickets |
| `TICKET_CATEGORY_ID2` | Discord category for Tournament Support tickets |
| `TICKET_CATEGORY_ID3` | Discord category for Club Join Request tickets |
| `TICKET_CATEGORY_ID4` | Discord category for Business Enquiry tickets |
| `TICKET_CATEGORY_ID5` | Discord category for Others tickets |

---

## License

MIT © UPCORE Esports
