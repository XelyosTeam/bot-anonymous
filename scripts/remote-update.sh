#!/bin/sh
# Runs ON THE SERVER, called by the CI over ssh, to update the bot.
# Usage: sh remote-update.sh <image>
# Server requirements: docker + docker compose, and a filled-in .env in the deployment folder.
set -eu

IMAGE="$1"

if [ ! -f .env ]; then
    echo "No .env file in $(pwd): copy .env.example and fill it in before the first deployment." >&2
    exit 1
fi

# Update (or add) BOT_IMAGE in the .env
if grep -q '^BOT_IMAGE=' .env; then
    sed -i "s|^BOT_IMAGE=.*|BOT_IMAGE=${IMAGE}|" .env
else
    printf '\nBOT_IMAGE=%s\n' "$IMAGE" >> .env
fi

docker compose pull bot
docker compose up -d --no-build --remove-orphans
docker image prune -f
