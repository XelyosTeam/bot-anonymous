// Removes all bot commands: global commands + commands registered per server.
// Useful before uninstalling the bot or to start from a clean slate.
const settings = require('../settings');
const { REST, Routes } = require('discord.js');

if (!settings.token) {
    console.error('DISCORD_BOT_TOKEN is missing.');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(settings.token);

async function fetchAllGuilds() {
    const allGuilds = [];
    let after = '0';

    while (true) {
        const batch = await rest.get(Routes.userGuilds(), {
            query: new URLSearchParams({ limit: '200', after }),
        });
        allGuilds.push(...batch);
        if (batch.length < 200) break;
        after = batch[batch.length - 1].id;
    }

    return allGuilds;
}

(async () => {
    try {
        const { id: appId } = await rest.get(Routes.currentApplication());

        await rest.put(Routes.applicationCommands(appId), { body: [] });
        console.info('Global commands removed.');

        const guilds = await fetchAllGuilds();
        console.info(`Bot present on ${guilds.length} server(s).`);

        for (const guild of guilds) {
            try {
                const guildCommands = await rest.get(Routes.applicationGuildCommands(appId, guild.id));
                if (guildCommands.length === 0) continue;

                await rest.put(Routes.applicationGuildCommands(appId, guild.id), {
                    body: [],
                });
                console.info(`[${guild.name}] ${guildCommands.length} guild command(s) removed.`);
            } catch (err) {
                // 50001 = Missing Access — the bot has no access to this server
                console.warn(`[${guild.name} (${guild.id})] Error: ${err.code || err.message}`);
            }
        }

        console.info('Purge completed.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
