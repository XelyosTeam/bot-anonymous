# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [10.0.0] - 2026-11-21

The bot is now **self-hosted**: the shared hosted bot is retired, and each community runs its own instance with its own Discord application. A single process, no external services, set up in a few minutes with Docker or pm2.

### ⚠️ Breaking changes

- Each server must now **create its own Discord application** and run its own instance (see the [installation guide](https://github.com/XelyosTeam/bot-anonymous#readme)).
- Configuration moved from the web dashboard to the **`.env` file**: `LOG_CHANNEL_ID`, `FRAME`, `RESTRICTED_CHANNELS` and `AUTOMASK_CHANNELS`. Changes require a restart.
- The bot no longer relies on an external API or Redis. The anonymous message → author mapping is now stored in a local SQLite database. **Messages sent before this version have no "Show information" data.**
- One instance serves one server: anonymous messages only work on the server that owns `LOG_CHANNEL_ID`.
- Requires Node.js **22.13 or later** when running without Docker.

### ✨ Added

- **Docker** image (`ghcr.io/xelyosteam/bot-anonymous`) and `docker-compose.yml`. The container runs as a non-root user and stores its data in a volume.
- **pm2** support with `ecosystem.config.js`.
- Slash commands are **registered automatically on startup**, and an **invite link** with the right permissions is written to the logs.
- **Configuration check on startup**: missing channels and missing permissions are reported in the logs.
- `GET /health` endpoint for the Docker healthcheck and monitoring tools.
- `MESSAGE_RETENTION_DAYS` to automatically purge old message → author mappings.
- `EMBED_COLOR` to customise the log messages.
- **GitHub Actions** and **GitLab CI** pipelines: lint, tests, `npm audit`, image build and publish, and an optional SSH deployment.
- `Makefile` shortcuts: `make up`, `make logs`, `make pull`, `make backup`…
- Automated tests (`npm test`).
- Released under the **MIT License**.

### 🐛 Fixed

- The log channel is now checked **before** sending, so no anonymous message is posted then deleted.
- In automask channels, the author now gets a DM when their message could not be re-posted anonymously.
- *Reply anonymously* now respects the restricted channels and the bot permissions.
- Re-deploying commands no longer wipes the command permissions set by server admins.
- Corrected the "missing permissions" error message, which mentioned the log channel instead of the current channel.
- Attachments are handled in memory, so no temporary files are left behind after an error.

### 🗑️ Removed

- Web dashboard integration, guild statistics and the multi-shard setup.
- Redis, Express and 7 other dependencies: `discord.js` is now the only runtime dependency.

[10.0.0]: https://github.com/XelyosTeam/bot-anonymous/releases/tag/v10.0.0
