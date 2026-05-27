# Lab Paper Bot

WhatsApp Bot, der eure Lab-Gruppe auf DOI-Links überwacht, automatisch RIS-Dateien für EndNote erzeugt und eine Zusammenfassung in den Chat postet.

## Was passiert?

```
WhatsApp-Gruppe ─→ Bot ─→ Crossref (Metadaten holen)
                    │
                    ├──→ .ris Datei + PDF ─→ SHARED DISK (eure Lab-Festplatte)
                    │                              │
                    └──→ Zusammenfassung ─→ WhatsApp-Gruppe
                                                   │
                                    Windows-Rechner liest vom shared disk
                                    PowerShell Watchdog öffnet .ris in EndNote
                                    EndNote syncs in geteilte Bibliothek
                                    → Alle im Labor haben das Paper
```

## Was du brauchst

| Was | Wofür | Kosten |
|---|---|---|
| **Altes Android-Handy** | WhatsApp-Zugang für den Bot | 0 € (habt ihr rumliegen) |
| **Prepaid-SIM** | Eigene Nummer für den Bot | ~10 € einmalig |
| **Bot-Rechner** (Linux/Windows) | Läuft 24/7, Bot-Software drauf | vorhanden (Lab-Server?) |
| **Shared Lab Disk** | .ris + .pdf liegen hier, beide Rechner lesen/schreiben | vorhanden |
| **Windows-Rechner** | EndNote Desktop, PowerShell Watchdog | vorhanden |

---

# Setup – Schritt für Schritt

## Schritt 1: Prepaid-SIM besorgen + Handy vorbereiten

- Kauf eine Prepaid-SIM (Aldi Talk, Congstar, Lidl Connect – 10 € im Supermarkt)
- Steck sie in das alte Handy
- Lade WhatsApp runter
- Registriere WhatsApp **mit der neuen Nummer**
- Geh in die Android-Einstellungen → Akku → WhatsApp: "Akku-Optimierung deaktivieren"
- Schließ das Handy ans Ladegerät an
- **Das Handy muss permanent mit dem WLAN verbunden sein und WhatsApp geöffnet haben**

> Das Handy ist die "Basisstation" für den Bot. Solange es online ist, bleibt der Bot verbunden. Fällt das WLAN aus, verliert der Bot nach ein paar Stunden die Session.

---

## Schritt 2: Ordner auf dem shared disk anlegen

Legt auf eurer geteilten Lab-Festplatte einen Ordner an, z.B.:

```
\\SERVER\LabData\PaperBot\
├── outbox\        ← Hier schreibt der Bot .ris + .pdf rein
└── pdf-import\    ← Hier kopiert der Bot PDFs für EndNotes Auto Import
```

**Notier dir den Pfad.** Du brauchst ihn später:
- Als `OUTBOX_DIR` in der Bot-Konfiguration
- Als `-WatchFolder` für das PowerShell-Skript auf dem Windows-Rechner

---

## Schritt 3: Bot-Rechner vorbereiten (Node.js installieren)

Der Bot läuft entweder auf einem Linux-Server (z.B. Lab-Server) oder auf einem Windows-Rechner.

### Linux (empfohlen für 24/7 Betrieb)

```bash
# Node.js installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Prüfen:
node --version   # Soll >= 18 sein
npm --version
```

### Windows

1. Geh auf https://nodejs.org/
2. Lade die LTS Version runter (mindestens 18.x)
3. Installieren – einfach immer "Next"

---

## Schritt 4: Bot herunterladen

Öffne ein Terminal (Bash auf Linux, Eingabeaufforderung auf Windows).

```bash
# In einen Ordner deiner Wahl
cd C:\Users\DeinName   # oder
cd ~

# Bot holen
git clone <REPO-URL> lab-paper-bot
cd lab-paper-bot

# Abhängigkeiten installieren
npm install
```

---

## Schritt 5: Bot konfigurieren

```bash
cp .env.example .env
```

Öffne `.env` mit einem Texteditor und setze diese Werte:

```env
# Name der WhatsApp-Gruppe (muss exakt stimmen)
BOT_GROUP_NAME=Lab Paper Chat

# Pfad zum shared-disk-Ordner
# Linux:  /mnt/labdata/PaperBot/outbox
# Windows: //SERVER/LabData/PaperBot/outbox
# Windows: C:/Users/DeinName/PaperBot/outbox
OUTBOX_DIR=//SERVER/LabData/PaperBot/outbox

# Deine Email (für Crossref Rate-Limits)
CROSSREF_MAIL=dein.name@uni.de

# Optional: EndNote PDF Auto Import Ordner
PDF_AUTO_IMPORT_DIR=

# Optional: KI-Zusammenfassungen
# LLM_API_KEY=sk-proj-...
# LLM_MODEL=gpt-4o-mini
# LLM_ENDPOINT=https://api.openai.com/v1/chat/completions
```

**Pfade in .env:** Immer **forward slashes** (`/`) verwenden, auch auf Windows. Node.js kommt damit klar. Keine Anführungszeichen um die Werte (sonst frisst dotenv die Backslashes).

---

## Schritt 6: Bot starten + QR-Code scannen

```bash
npm start
```

Es erscheint ein QR-Code im Terminal.

1. Nimm das **alte Handy** (das mit der Prepaid-SIM)
2. Öffne WhatsApp → drei Punkte → "Verknüpfte Geräte" → "Gerät verknüpfen"
3. Scanne den QR-Code

Der Bot ist jetzt verbunden. Er reagiert auf Nachrichten in der Gruppe.

---

## Schritt 7: Bot dauerhaft laufen lassen

### Linux (systemd)

```bash
# Service-Datei anpassen
nano config/lab-paper-bot.service
```

Ändere folgende Zeilen:
```
User=dein-linux-benutzername
WorkingDirectory=/pfad/zu/lab-paper-bot
ReadWritePaths=/pfad/zu/lab-paper-bot/data /mnt/labdata/PaperBot
```

Dann:
```bash
sudo cp config/lab-paper-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now lab-paper-bot

# Status prüfen:
sudo systemctl status lab-paper-bot
```

### Windows

Erstelle `start.bat` im Bot-Ordner:

```batch
@echo off
cd C:\Users\DeinName\lab-paper-bot
:loop
node src/index.js
if %ERRORLEVEL% equ 42 (
    timeout /t 2 /nobreak
    goto loop
)
timeout /t 10 /nobreak
goto loop
```

Dann: `Windows + R` → `shell:startup` → `start.bat` da rein kopieren.

Stell sicher dass der Rechner nie in den Ruhemodus geht (Energieoptionen → "Nie").

---

## Schritt 8: WhatsApp-Gruppe erstellen + Bot einladen

1. Erstelle auf **deinem normalen Handy** eine Gruppe (z.B. "Lab Paper Chat")
2. Füge die Bot-Nummer (die Prepaid-SIM) als Mitglied hinzu
3. Stell sicher, dass `BOT_GROUP_NAME` in `.env` genau so heißt
4. Poste einen DOI-Link in die Gruppe, z.B. `https://doi.org/10.1038/nature12373`
5. Der Bot sollte innerhalb von Sekunden mit einer Zusammenfassung antworten

---

## Schritt 9: EndNote-Watchdog auf dem Windows-Rechner einrichten

**Das PowerShell-Skript überwacht den shared-disk-Ordner und importiert neue .ris-Dateien in EndNote.**

### 9a: Windows muss auf den shared disk zugreifen können

Stell sicher, dass der Windows-Rechner den shared-disk-Ordner sehen kann:
```
\\SERVER\LabData\PaperBot\outbox\
```

Wenn nicht: Frag euren IT-Admin ob der Rechner Zugriff auf die Freigabe hat.

### 9b: .ris-Datei-Verknüpfung mit EndNote prüfen

- Kopier eine beliebige `.ris` Datei auf den Windows-Rechner
- Doppelklick drauf
- Wenn sich EndNote öffnet und die Referenz importiert: ✅ funktioniert
- Wenn nicht: Rechtsklick → "Öffnen mit" → "Andere App auswählen" → EndNote → "Immer verwenden"

### 9c: Watchdog testen

Öffne PowerShell **als Administrator** auf dem Windows-Rechner:

```powershell
cd C:\Users\DeinName\lab-paper-bot

# Forward slashes gehen auch in PowerShell:
.\scripts\endnote-watchdog.ps1 -WatchFolder "//SERVER/LabData/PaperBot/outbox"

# Backslashes gehen natürlich auch:
.\scripts\endnote-watchdog.ps1 -WatchFolder "\\SERVER\LabData\PaperBot\outbox"
```

Jetzt einen DOI in die WhatsApp-Gruppe posten. Der Bot antwortet, schreibt eine `.ris` Datei auf den shared disk, und der Watchdog öffnet sie in EndNote.

### 9d: Watchdog als Scheduled Task (automatischer Start)

```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"C:\Users\DeinName\lab-paper-bot\scripts\endnote-watchdog.ps1`" -WatchFolder `"//SERVER/LabData/PaperBot/outbox`""
$trigger = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -TaskName "LabPaperBot Watchdog" -Action $action -Trigger $trigger -RunLevel Highest
```

Der Watchdog startet jetzt automatisch wenn der Windows-Rechner hochfährt.

---

## Schritt 10: EndNote Sync aktivieren (für alle im Labor)

Damit alle Lab-Mitglieder die Papers sehen:

1. Öffne EndNote auf dem Windows-Rechner
2. Gehe zu `Edit → Preferences → Sync`
3. Gib deine EndNote Online-Zugangsdaten ein
4. Hake "Sync Automatically" an
5. Gehe zu `File → Share...`
6. Gib die Email-Adressen deiner Lab-Kollegen ein
7. Wähle "Read & Write" (dann können alle selbst Tags/Notizen hinzufügen)
8. Fertig – jedes Paper das der Bot importiert, ist sofort für alle da

---

## Optional: KI-Zusammenfassungen

Standardmäßig postet der Bot den Abstract aus Crossref. Für bessere Zusammenfassungen:

1. Hol dir einen API-Key von OpenAI (kostet ~1-2 € pro Monat bei dem Traffic)
2. Setze in `.env`:
```env
LLM_API_KEY="sk-proj-..."
LLM_MODEL="gpt-4o-mini"
LLM_ENDPOINT="https://api.openai.com/v1/chat/completions"
```

Alternativ: DeepSeek (billiger), Together, oder jeder OpenAI-kompatible Anbieter.

---

## Session & QR-Code

| Situation | Was passiert |
|---|---|
| Erster Start | QR-Code anzeigen, mit altem Handy scannen |
| Bot stürzt ab | Startet automatisch neu, Session bleibt |
| Rechner rebootet | Bot startet automatisch, Session bleibt |
| Handy verliert WLAN | Session stirbt nach Stunden → QR neu scannen |
| Session abgelaufen (>14 Tage) | Bot exitet mit Code 42, restartet, zeigt QR |
| QR erscheint >3 Minuten nicht | Bot restartet und versucht es nochmal |

---

## Projektstruktur

```
lab-paper-bot/
├── src/
│   ├── index.js              # WhatsApp-Client
│   ├── config.js              # .env auslesen
│   ├── handlers/
│   │   └── message.js         # DOI erkennen + verarbeiten
│   ├── services/
│   │   ├── crossref.js        # Crossref API
│   │   ├── ris.js             # .ris Dateien bauen
│   │   ├── summary.js         # Zusammenfassung (Abstract oder KI)
│   │   └── download.js        # PDF runterladen
│   └── utils/
│       ├── doi.js             # DOI-Erkennung
│       └── file.js            # Datei-Operationen
├── scripts/
│   ├── setup.sh               # Einmal-Setup
│   ├── start.sh               # Start mit Auto-Restart
│   └── endnote-watchdog.ps1   # Windows: shared disk → EndNote import
├── config/
│   └── lab-paper-bot.service  # systemd (Linux)
├── data/
│   └── sessions/              # WhatsApp-Session
├── .env.example
├── package.json
└── README.md
```
