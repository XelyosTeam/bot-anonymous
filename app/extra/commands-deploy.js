// Manually registers slash commands and context menus with Discord.
// Not needed when DEPLOY_COMMANDS_ON_START=true (default): the bot does it on every start.
const settings = require('../settings');
const { REST, Routes } = require('discord.js');
const { getApplicationCommandsPayload } = require('../tools/loader');

if (!settings.token) {
    console.error('DISCORD_BOT_TOKEN is missing.');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(settings.token);

(async () => {
    try {
        const application = await rest.get(Routes.currentApplication());
        const commands = getApplicationCommandsPayload();

        console.log(`Deploying ${commands.length} commands for application ${application.name} (${application.id})…`);
        // PUT = bulk overwrite: commands keep their ID, removed ones are deleted
        await rest.put(Routes.applicationCommands(application.id), {
            body: commands,
        });
        console.log('Done!');
        process.exit(0);
    } catch (error) {
        console.error('Error deploying commands:', error);
        process.exit(1);
    }
})();
