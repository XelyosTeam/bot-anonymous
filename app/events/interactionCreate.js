const { Events, MessageFlags } = require('discord.js');
const logger = require('../logger');

async function errorReply(interaction) {
    try {
        const payload = {
            content: 'Execution command error',
            flags: MessageFlags.Ephemeral,
        };
        if (interaction.deferred || interaction.replied) {
            return await interaction.editReply(payload);
        }
        return await interaction.reply(payload);
    } catch (_) {
        // Interaction expired or already handled — silently ignore
    }
}

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(client, interaction) {
        /* Slash commands */
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2500) {
                logger.warn(Events.InteractionCreate, `Interaction dropped (already expired)`, {
                    command: interaction.commandName,
                    age: `${interactionAge}ms`,
                    wsPing: `${client.ws.ping}ms`,
                    shardId: interaction.guild?.shardId ?? 'unknown',
                });
                return;
            }

            try {
                return await command.execute(interaction, client);
            } catch (error) {
                if (error.code === 10062) {
                    logger.warn(Events.InteractionCreate, `Interaction expired during execution (10062)`, {
                        command: interaction.commandName,
                        age: `${Date.now() - interaction.createdTimestamp}ms`,
                        wsPing: `${client.ws.ping}ms`,
                        shardId: interaction.guild?.shardId ?? 'unknown',
                    });
                    return;
                }
                logger.error(Events.InteractionCreate, `Command execution: ${interaction.commandName}`, error);
                return await errorReply(interaction);
            }
        }
        /* Slash commands */

        /* Message context menus */
        if (interaction.isMessageContextMenuCommand()) {
            const context = client.messageContext.get(interaction.commandName);
            if (!context) return;

            try {
                return await context.execute(interaction, client);
            } catch (error) {
                logger.error(Events.InteractionCreate, `Context message execution: ${interaction.commandName}`, error);
                return await errorReply(interaction);
            }
        }
        /* Message context menus */

        /* Buttons */
        if (interaction.isButton()) {
            if (interaction.message.author.id !== client.user.id) return; // Only react to our own messages
            const button = client.buttonReactions.get(interaction.customId);
            if (!button) return;

            try {
                return await button.execute(interaction, client);
            } catch (error) {
                logger.error(Events.InteractionCreate, `Button execution: ${interaction.customId}`, error);
                return await errorReply(interaction);
            }
        }
        /* Buttons */

        /* Select menus */
        if (interaction.isStringSelectMenu()) {
            if (interaction.message.author.id !== client.user.id) return; // Only react to our own messages
            const selectMenu = client.selectReactions.get(interaction.customId);
            if (!selectMenu) return;

            try {
                return await selectMenu.execute(interaction, client);
            } catch (error) {
                logger.error(Events.InteractionCreate, `SelectMenu execution: ${interaction.customId}`, error);
                return await errorReply(interaction);
            }
        }
        /* Select menus */

        /* Modals */
        if (interaction.isModalSubmit()) {
            let modalData;
            try {
                modalData = JSON.parse(interaction.customId);
            } catch {
                return;
            }
            const modal = client.modals.get(modalData?.name);
            if (!modal) return;

            try {
                return await modal.execute(interaction, client, modalData.metadata);
            } catch (error) {
                logger.error(Events.InteractionCreate, `Modal execution: ${interaction.customId}`, error);
                return await errorReply(interaction);
            }
        }
        /* Modals */
    },
};
