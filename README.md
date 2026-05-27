# Lab Paper Bot

A standalone WhatsApp bot that monitors your lab group chat, detects DOI links, fetches paper metadata, generates RIS files for EndNote, and posts summaries back to the chat.

No AI agent required. Runs on any machine with Node.js.

## How It Works

```
[Lab member shares DOI in WhatsApp group]
        │
[Bot sees message → extracts DOI(s)]
        │
[Fetches metadata from Crossref]
        │
[Generates .ris file + downloads PDF]  ───→  [Shared folder / outbox/]
        │                                        │
[Posts summary back to WhatsApp]            [Windows EndNote watchdog
        │                                     watches this folder]
                                              │
                                         [Opens .ris → EndNote imports]
                                         [Copies .pdf → EndNote auto-import]
                                              │
                                         [EndNote sync → shared library]
```

## Requirements

- **Bot host**: Any machine with Node.js >= 18 (Linux, macOS, Windows)
- **Phone**: A prepaid SIM card in any old Android/iOS phone (10 EUR Aldi Talk, etc.) dedicated to this bot
- **EndNote machine**: A Windows PC with EndNote Desktop installed (for the watchdog)
- **Shared folder**: A folder both machines can access (OneDrive, network share, or the bot host itself)

## Quick Start

```bash
# Clone and install
git clone <repo-url> lab-paper-bot
cd lab-paper-bot
npm install
cp .env.example .env
```

Edit `.env`:
```
BOT_GROUP_NAME="Dein Lab Name Paper Chat"
CROSSREF_MAIL="deine@email.de"
```

```bash
# Run it
npm start

# Scan the QR code with your lab phone → done
```

## Infrastructure Setup

### 1. Phone

Grab a prepaid SIM (10 EUR), put it in an old phone. Install WhatsApp, register with that number. Keep the phone on WiFi + power. That's it -- it just needs to stay alive.

### 2. Bot machine (Linux recommended)

The bot runs on any always-on machine (Raspberry Pi, lab server, old laptop).

**As a systemd service (Linux):**
```bash
# Edit the service file to point to your install path
sudo cp config/lab-paper-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now lab-paper-bot
```

**As a PM2 process (any OS):**
```bash
npm install -g pm2
npm run start:pm2
pm2 save
pm2 startup
```

### 3. EndNote Watchdog (Windows)

On the Windows machine where EndNote Desktop runs:

1. Set EndNote's PDF Auto Import folder: `Edit → Preferences → PDF Handling → Enable automatic importing`
2. Open PowerShell as Administrator, run:
```powershell
# Edit the path first, then:
powershell -ExecutionPolicy Bypass -File scripts\endnote-watchdog.ps1
```

For permanent operation, create a Scheduled Task that runs on boot:
```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"C:\Users\...\lab-paper-bot\scripts\endnote-watchdog.ps1`""
$trigger = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -TaskName "LabPaperBot Watchdog" -Action $action -Trigger $trigger -RunLevel Highest
```

## Session Persistence

- Session is saved to `data/sessions/` -- survives restarts
- Phone must stay connected to WiFi. If phone disconnects, session can expire within hours
- Typical session without phone disconnect: **2-14 days**
- On disconnect/auth failure: bot auto-exits with code 42, systemd/PM2 restarts it
- **First run**: scan QR code. After that: no QR needed until session expires

## Message Format

The bot detects DOIs anywhere in messages, including:
- `doi.org/10.xxxx/xxxxx`
- `dx.doi.org/10.xxxx/xxxxx`
- Plain `10.xxxx/xxxxx` in text
- Links to nature.com, science.org, PubMed, arXiv, etc. (if they contain DOIs)

## Optional: LLM Summaries

By default, the bot posts the paper's abstract as the summary. For better summaries:

```env
LLM_API_KEY="sk-..."
LLM_MODEL="gpt-4o-mini"
LLM_ENDPOINT="https://api.openai.com/v1/chat/completions"
```

Works with any OpenAI-compatible API (OpenAI, DeepSeek, Together, etc.).

## Project Structure

```
lab-paper-bot/
├── src/
│   ├── index.js              # Entry point - WhatsApp client
│   ├── config.js              # Config from .env
│   ├── handlers/
│   │   └── message.js         # Message handler
│   ├── services/
│   │   ├── crossref.js        # Crossref API
│   │   ├── ris.js             # RIS file generator
│   │   ├── summary.js         # Summary generator
│   │   └── download.js        # PDF downloader
│   └── utils/
│       ├── doi.js             # DOI detection
│       └── file.js            # File operations
├── scripts/
│   ├── setup.sh               # One-time setup
│   ├── start.sh               # Start with auto-restart
│   └── endnote-watchdog.ps1   # Windows EndNote importer
├── config/
│   └── lab-paper-bot.service  # systemd unit
├── data/
│   ├── outbox/                # RIS + PDF output (watch this)
│   └── sessions/              # WhatsApp session data
├── .env.example
├── package.json
└── README.md
```

## Troubleshooting

**Bot doesn't see messages:**
- Make sure the bot is in the group
- Check `BOT_GROUP_NAME` in `.env`
- Check logs for QR/auth issues

**EndNote doesn't auto-import RIS:**
- Double-click a `.ris` file manually -- if it doesn't open EndNote, fix the file association (Windows: Open with → EndNote, check "Always")
- Make sure EndNote Desktop is not in the middle of a modal dialog

**Session keeps dying quickly:**
- Phone WiFi is unstable or phone goes to sleep (disable battery optimization for WhatsApp)
- Phone internet connection is poor
- Switch phone to a device that stays permanently on WiFi
