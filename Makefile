COMPOSE = docker compose
APP_DIR = app

.PHONY: help up down restart logs build update pull deploy-commands shell backup \
        install start-pm2 stop-pm2 logs-pm2 dev test lint

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

##########
# Docker #
##########

up: ## Build (if needed) and start the bot
	$(COMPOSE) up -d --build

down: ## Stop the bot
	$(COMPOSE) down

restart: ## Restart the bot (reloads the .env)
	$(COMPOSE) up -d --force-recreate

logs: ## Follow the logs
	$(COMPOSE) logs -f --tail=200

build: ## Rebuild the image
	$(COMPOSE) build

update: ## Pull the latest code and redeploy
	git pull
	$(COMPOSE) up -d --build

pull: ## Use the published image (BOT_IMAGE in the .env)
	$(COMPOSE) pull
	$(COMPOSE) up -d --no-build

deploy-commands: ## Re-register the slash commands
	$(COMPOSE) exec bot node extra/commands-deploy.js

shell: ## Open a shell in the container
	$(COMPOSE) exec bot sh

backup: ## Back up the SQLite database to ./backups
	mkdir -p backups
	$(COMPOSE) exec -T bot node -e "new (require('node:sqlite').DatabaseSync)('/data/anonymous.sqlite').exec(\"VACUUM INTO '/data/backup.sqlite'\")"
	$(COMPOSE) cp bot:/data/backup.sqlite backups/anonymous-$$(date +%Y%m%d-%H%M%S).sqlite
	$(COMPOSE) exec -T bot rm /data/backup.sqlite

#######
# pm2 #
#######

install: ## Install production dependencies
	cd $(APP_DIR) && npm ci --omit=dev

start-pm2: ## Start the bot with pm2
	cd $(APP_DIR) && pm2 start ecosystem.config.js

stop-pm2: ## Stop the pm2 bot
	pm2 stop bot-anonymous

logs-pm2: ## Show pm2 logs
	pm2 logs bot-anonymous

#######
# Dev #
#######

dev: ## Run the bot locally with auto-reload
	cd $(APP_DIR) && npm install && npm run dev

test: ## Run the tests
	cd $(APP_DIR) && npm test

lint: ## Check formatting
	cd $(APP_DIR) && npm run lint
