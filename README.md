# Lab Paper Bot

WhatsApp bot that monitors your lab group for DOI links, automatically generates RIS files for EndNote, and posts a summary to the chat.

## How It Works

```
WhatsApp Group ─→ Bot ─→ Crossref (fetch metadata)
                    │
                    ├──→ .ris file + PDF ─→ SHARED DISK (your lab drive)
                    │                              │
                    └──→ Summary ─→ WhatsApp Group
                                                   │
                                    Windows machine reads from shared disk
                                    PowerShell Watchdog opens .ris in EndNote
                                    EndNote syncs to shared library
                                    → Everyone in the lab gets the paper
```

## What You Need

| Item | Purpose | Cost |
|---|---|---|
| **Old Android phone** | WhatsApp access for the bot | 0 EUR (spare drawer phone) |
| **Prepaid SIM** | A dedicated number for the bot | ~10 EUR one-time |
| **Bot machine** (Linux/Windows) | Runs 24/7, bot software lives here | already have one (lab server?) |
| **Shared lab disk** | .ris + .pdf files live here, both machines read/write | already have one |
| **Windows machine** | EndNote Desktop + PowerShell Watchdog | already have one |

---

# Setup – Step by Step

## Step 1: Get a prepaid SIM + prepare the phone

- Buy a prepaid SIM (Aldi Talk, Congstar, Lidl Connect -- 10 EUR at any supermarket)
- Insert it into the old phone
- Download WhatsApp
- Register WhatsApp **with the new number**
- Go to Android Settings → Battery → WhatsApp: disable battery optimization
- Plug the phone into a charger
- **The phone must stay connected to WiFi with WhatsApp open at all times**

> The phone is the bot's "base station." As long as it's online, the bot stays connected. If WiFi drops, the bot's session will expire within a few hours.

---

## Step 2: Create a folder on the shared disk

On your shared lab drive, create a folder structure like:

```
\\SERVER\LabData\PaperBot\
├── outbox\        ← Bot writes .ris + .pdf files here
└── pdf-import\    ← Bot copies PDFs here for EndNote's Auto Import
```

**Note down the path.** You'll need it for:
- `OUTBOX_DIR` in the bot configuration
- `-WatchFolder` in the PowerShell script on the Windows machine

---

## Step 3: Prepare the bot machine (install Node.js)

The bot runs on either a Linux server (e.g., lab server) or a Windows machine.

### Linux (recommended for 24/7 operation)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify:
node --version   # Should be >= 18
npm --version
```

### Windows

1. Go to https://nodejs.org/
2. Download the LTS version (at least 18.x)
3. Install -- just keep clicking "Next"

---

## Step 4: Download the bot

Open a terminal (Bash on Linux, Command Prompt on Windows).

```bash
# Navigate to where you want it
cd C:\Users\YourName   # or
cd ~

# Clone
git clone <REPO-URL> lab-paper-bot
cd lab-paper-bot

# Install dependencies
npm install
```

---

## Step 5: Configure the bot

```bash
cp .env.example .env
```

Open `.env` with a text editor and set these values:

```env
# Name of the WhatsApp group
BOT_GROUP_NAME=Lab Paper Chat

# Path to the shared disk folder
# Windows: \\server\LabData\PaperBot\outbox
# Linux:   /mnt/labdata/PaperBot/outbox
OUTBOX_DIR=\\server\LabData\PaperBot\outbox

# Your email (for Crossref rate limits)
CROSSREF_MAIL=your.name@uni.edu

# Optional: EndNote PDF Auto Import folder
PDF_AUTO_IMPORT_DIR=\\server\LabData\PaperBot\pdf-import

# Optional: AI summaries
# LLM_API_KEY=sk-proj-...
# LLM_MODEL=gpt-4o-mini
# LLM_ENDPOINT=https://api.openai.com/v1/chat/completions
```

**Important:** Do NOT wrap paths containing backslashes in double quotes. `dotenv` would interpret the backslashes as escape sequences. Either leave them unquoted or use single quotes (`'\\server\path'`).

---

## Step 6: Start the bot + scan the QR code

```bash
npm start
```

A QR code will appear in the terminal.

1. Pick up the **old phone** (the one with the prepaid SIM)
2. Open WhatsApp → three dots → "Linked Devices" → "Link a Device"
3. Scan the QR code

The bot is now connected. It will respond to messages in the group.

---

## Step 7: Keep the bot running permanently

### Linux (systemd)

```bash
# Edit the service file
nano config/lab-paper-bot.service
```

Change these lines:
```
User=your-linux-username
WorkingDirectory=/path/to/lab-paper-bot
ReadWritePaths=/path/to/lab-paper-bot/data /mnt/labdata/PaperBot
```

Then:
```bash
sudo cp config/lab-paper-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now lab-paper-bot

# Check status:
sudo systemctl status lab-paper-bot
```

### Windows

Create `start.bat` in the bot folder:

```batch
@echo off
cd C:\Users\YourName\lab-paper-bot
:loop
node src/index.js
if %ERRORLEVEL% equ 42 (
    timeout /t 2 /nobreak
    goto loop
)
timeout /t 10 /nobreak
goto loop
```

Then: `Windows + R` → `shell:startup` → copy `start.bat` into that folder.

Make sure the machine never goes to sleep (Power Options → "Never").

---

## Step 8: Create the WhatsApp group + invite the bot

1. On **your normal phone**, create a group (e.g., "Lab Paper Chat")
2. Add the bot number (the prepaid SIM) as a member
3. Make sure `BOT_GROUP_NAME` in `.env` matches exactly
4. Post a DOI link in the group, e.g. `https://doi.org/10.1038/nature12373`
5. The bot should reply with a summary within seconds

---

## Step 9: Set up the EndNote Watchdog on the Windows machine

**The PowerShell script monitors the shared disk folder and imports new .ris files into EndNote.**

### 9a: Make sure Windows can access the shared disk

Verify the Windows machine can see the shared disk folder:
```
\\SERVER\LabData\PaperBot\outbox\
```

If not, ask your IT admin for access to the share.

### 9b: Check .ris file association with EndNote

- Copy any `.ris` file to the Windows machine
- Double-click it
- If EndNote opens and imports the reference: ✅ working
- If not: Right-click → "Open with" → "Choose another app" → EndNote → "Always use this app"

### 9c: Test the Watchdog

Open PowerShell **as Administrator** on the Windows machine:

```powershell
cd C:\Users\YourName\lab-paper-bot

.\scripts\endnote-watchdog.ps1 -WatchFolder "\\SERVER\LabData\PaperBot\outbox"
```

Now post a DOI in the WhatsApp group. The bot will reply, write a `.ris` file to the shared disk, and the Watchdog will open it in EndNote.

### 9d: Install the Watchdog as a Scheduled Task (autostart)

```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"C:\Users\YourName\lab-paper-bot\scripts\endnote-watchdog.ps1`" -WatchFolder `"\\SERVER\LabData\PaperBot\outbox`""
$trigger = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -TaskName "LabPaperBot Watchdog" -Action $action -Trigger $trigger -RunLevel Highest
```

The Watchdog will now start automatically whenever the Windows machine boots up.

---

## Step 10: Enable EndNote Sync (for the whole lab)

So all lab members can see the imported papers:

1. Open EndNote on the Windows machine
2. Go to `Edit → Preferences → Sync`
3. Enter your EndNote Online credentials
4. Check "Sync Automatically"
5. Go to `File → Share...`
6. Enter the email addresses of your lab colleagues
7. Set permission to "Read & Write" (so everyone can add tags, notes, etc.)
8. Done -- every paper the bot imports is instantly available to everyone

---

## Optional: AI Summaries

By default, the bot posts the abstract from Crossref as the summary. For better summaries:

1. Get an API key from OpenAI (costs ~$1-2/month at this traffic level)
2. Set in `.env`:
```env
LLM_API_KEY="sk-proj-..."
LLM_MODEL="gpt-4o-mini"
LLM_ENDPOINT="https://api.openai.com/v1/chat/completions"
```

Alternatively: DeepSeek (cheaper), Together, or any OpenAI-compatible provider.

---

## Session & QR Code

| Scenario | What happens |
|---|---|
| First start | QR code displayed, scan with the old phone |
| Bot crashes | Auto-restarts, session preserved |
| Machine reboots | Bot auto-starts, session preserved |
| Phone loses WiFi | Session dies after hours → re-scan QR |
| Session expires (>14 days) | Bot exits with code 42, restarts, shows QR |
| QR not scanned for >3 minutes | Bot restarts and tries again |

---

## Project Structure

```
lab-paper-bot/
├── src/
│   ├── index.js              # WhatsApp client
│   ├── config.js              # Reads .env
│   ├── handlers/
│   │   └── message.js         # DOI detection + processing
│   ├── services/
│   │   ├── crossref.js        # Crossref API
│   │   ├── ris.js             # Builds .ris files
│   │   ├── summary.js         # Summary generation (abstract or AI)
│   │   └── download.js        # Downloads PDFs
│   └── utils/
│       ├── doi.js             # DOI extraction
│       └── file.js            # File operations
├── scripts/
│   ├── setup.sh               # One-time setup
│   ├── start.sh               # Start with auto-restart
│   └── endnote-watchdog.ps1   # Windows: shared disk → EndNote import
├── config/
│   └── lab-paper-bot.service  # systemd (Linux)
├── data/
│   └── sessions/              # WhatsApp session data
├── .env.example
├── package.json
└── README.md
```
