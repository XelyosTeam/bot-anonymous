# Anonymous RP Bot (self-hosted)

A Discord bot to post anonymous messages (roleplay, confessions…). The real author is logged in a private channel
for moderators.

You **host the bot yourself**. It runs as a single process and needs no external services: no database server, no
Redis. Its data lives in a local SQLite file.

## Features

| Command / action                   | Description                                                             |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `/ano` or `/mask`                  | Post an anonymous message in the channel                                |
| `/maskfile`                        | Post a file (and an optional message) anonymously                       |
| `/encrypt` / `/decrypt`            | Post / decrypt a message encrypted with a 2-letter key                  |
| Right-click > _Reply anonymously_  | Reply anonymously to a message (text, optional key, files)              |
| Right-click > _Decrypt message_    | Decrypt a message posted by the bot                                     |
| Right-click > _Show information_   | (Moderators with _Manage Messages_) show the real author of a message   |
| _Automask_ channels                | Every message posted there is deleted and re-posted anonymously         |

Every anonymous message is logged in the log channel with its author, content and key. **If no log channel is
configured, the bot refuses to send anonymous messages.**

Slash commands come with French translations: Discord shows them automatically to users whose client is set to
French.

## 1. Create the bot on Discord

1. Go to <https://discord.com/developers/applications> and click **New Application**.
2. In the **Bot** tab:
    - click **Reset Token** and copy the token. This is your `DISCORD_BOT_TOKEN`: keep it secret.
    - enable **Message Content Intent** (under _Privileged Gateway Intents_). The automask channels need it.
    - disable **Public Bot**, so that only you can invite the bot. One instance serves a single server: anonymous
      messages only work on the server that owns `LOG_CHANNEL_ID`.
3. Invite the bot. On startup, the bot writes an **invite link** to its logs. The link already includes the required
   permissions: View Channels, Send Messages, Send Messages in Threads, Embed Links, Attach Files, Read Message History
   and Manage Messages.

## 2. Configure

```bash
cp .env.example .env
```

Then edit `.env`:

| Variable                   | Required | Description                                                                   |
| -------------------------- | -------- | ----------------------------------------------------------------------------- |
| `DISCORD_BOT_TOKEN`        | yes      | Bot token                                                                     |
| `LOG_CHANNEL_ID`           | yes      | ID of the **private** channel where real authors are logged                   |
| `FRAME`                    |          | Text displayed above and below anonymous messages (e.g. `"═══════"`)          |
| `RESTRICTED_CHANNELS`      |          | Comma-separated IDs of channels where commands are allowed (empty = all)      |
| `AUTOMASK_CHANNELS`        |          | Comma-separated IDs of channels where every message is made anonymous         |
| `EMBED_COLOR`              |          | Log message color (hexadecimal, default `#5906DA`)                            |
| `MESSAGE_RETENTION_DAYS`   |          | How long the message → author mapping is kept (0 = forever)                   |
| `DEPLOY_COMMANDS_ON_START` |          | Register slash commands on startup (`true` by default)                        |
| `TZ`                       |          | Log timezone (Docker, default `Europe/Paris`)                                 |

> To get an ID: Discord Settings > Advanced > **Developer Mode**, then right-click the channel > _Copy Channel ID_.
>
> If `FRAME` contains spaces or a `#`, wrap the value in quotes.

Restart the bot after any change to `.env`. On startup, the bot checks that the configured channels exist and that it
has the right permissions, and reports any problem in its logs.

## 3. Run the bot

### Option A — Docker (recommended)

Requirements: Docker and Docker Compose.

```bash
docker compose up -d --build     # or: make up
docker compose logs -f           # or: make logs
```

The data (SQLite database and log files) is stored in the `bot_data` Docker volume.

You can use an image already built by the CI instead of building on the server. Set `BOT_IMAGE` in `.env` (e.g.
`ghcr.io/<owner>/<repo>:latest`), then run:

```bash
docker compose pull && docker compose up -d --no-build   # or: make pull
```

### Option B — pm2 (without Docker)

Requirements: **Node.js 22.13 or later** (24 or 26 recommended) and pm2 (`npm install -g pm2`).

```bash
cd app
npm ci --omit=dev
pm2 start ecosystem.config.js
pm2 save && pm2 startup          # restart automatically when the server reboots
```

The SQLite database goes in `data/` and the logs in `logs/`, at the project root. Change the locations with
`DATA_DIR` and `LOG_DIR`.

> ⚠️ Run **only one instance** of the bot per token. Two instances would process every message twice.

### Monitoring

When `HEALTH_PORT` is set, `GET /health` returns `200` while the bot is connected to Discord and `503` otherwise.
Docker sets it automatically to port 3000 inside the container.

## 4. Update

- Docker (local build): `git pull && docker compose up -d --build` (or `make update`)
- Docker (CI image): `make pull`
- pm2: `git pull && cd app && npm ci --omit=dev && pm2 restart bot-anonymous`

## 5. Backups and personal data

For each anonymous message, `anonymous.sqlite` stores **the Discord ID of the real author and the content**. The
_Show information_ action relies on this data.

- Backup: `make backup` (Docker), or copy `data/anonymous.sqlite` while the bot is stopped (pm2).
- You are responsible for this data (GDPR). Tell your members it is collected, and set `MESSAGE_RETENTION_DAYS` to
  suit your needs (e.g. `90`).

## 6. CI/CD (optional)

Two pipelines are included. Both check formatting (Prettier), run the tests and `npm audit`. Then, on the default
branch and on `v*` tags, they build and publish the Docker image.

### GitHub Actions (`.github/workflows/ci.yml`)

- Publishes the image to `ghcr.io/<owner>/<repo>`, tagged `latest`, `sha-xxxxxxx`, and `1.2.3` / `1.2` for a `v1.2.3`
  tag.
- Deploys over SSH when the `DEPLOY_HOST` variable is set:
    - _Settings > Secrets and variables > Actions > Variables_: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`,
      `DEPLOY_PORT` (optional);
    - _Secrets_: `DEPLOY_SSH_KEY` (SSH private key).

### GitLab CI (`.gitlab-ci.yml`)

- Publishes the image to the project's Container Registry, tagged `latest`, the short SHA, and the version for a
  `v1.2.3` tag.
- Deploys over SSH when the `DEPLOY_HOST` variable is set (_Settings > CI/CD > Variables_): `DEPLOY_HOST`,
  `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_PORT` (optional), `DEPLOY_SSH_KEY` (masked, protected).

In both cases, the server needs Docker, Docker Compose and a filled-in `.env` in `DEPLOY_PATH`. The pipeline copies
`docker-compose.yml` there, updates `BOT_IMAGE` in the `.env` and restarts the bot (see `scripts/remote-update.sh`).

## Troubleshooting

| Symptom                                        | Likely cause                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| `Used disallowed intents` on startup           | _Message Content Intent_ is not enabled in the Developer Portal            |
| `No log channel is configured for this server` | `LOG_CHANNEL_ID` is empty or points to a channel on another server         |
| Commands don't show up                         | Wait a few minutes or restart Discord; check the startup logs              |
| Automask channels don't react                  | Wrong ID in `AUTOMASK_CHANNELS`, or the _Manage Messages_ permission is missing |

## Development

```bash
cd app
npm install
npm run dev      # auto-reload
npm test         # tests (node:test)
npm run lint     # Prettier check (npm run format to fix)
```
