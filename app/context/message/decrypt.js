const {
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    InteractionContextType,
    ApplicationIntegrationType,
    LabelBuilder,
    MessageFlags,
} = require('discord.js');
const settings = require('../../settings');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Decrypt message')
        .setNameLocalizations({
            fr: 'Déchiffrer le message',
        })
        .setType(ApplicationCommandType.Message)
        .setContexts([InteractionContextType.Guild])
        .setIntegrationTypes([ApplicationIntegrationType.GuildInstall]),
    async execute(interaction, client) {
        // Only messages sent by the bot can be decrypted
        if (interaction.targetMessage.author.id !== client.user.id) {
            return interaction.reply({
                content: 'You can only decrypt messages sent by the bot.',
                flags: MessageFlags.Ephemeral,
            });
        }

        // Strip the frame from the message
        const { frame } = settings;
        let content = interaction.targetMessage.content;
        if (frame && content.length >= 2 * frame.length && content.startsWith(frame) && content.endsWith(frame)) {
            content = content.slice(frame.length, -frame.length).trim();
        }

        const modal = new ModalBuilder()
            .setCustomId(
                JSON.stringify({
                    name: 'modalDecryptMessage',
                    metadata: {},
                })
            )
            .setTitle('Decrypt message');

        // key for decryption
        const keyInput = new TextInputBuilder()
            .setCustomId('key')
            .setPlaceholder('Enter the 2-character decryption key')
            .setMinLength(2)
            .setMaxLength(2)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const keyLabel = new LabelBuilder().setLabel('Decryption Key:').setTextInputComponent(keyInput);
        modal.addLabelComponents(keyLabel);

        // message content
        const contentInput = new TextInputBuilder()
            .setCustomId('content')
            .setPlaceholder('Enter the message to decrypt')
            .setMinLength(1)
            .setMaxLength(1000)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setValue(content);

        const contentLabel = new LabelBuilder().setLabel('Message Content:').setTextInputComponent(contentInput);
        modal.addLabelComponents(contentLabel);

        await interaction.showModal(modal);
    },
};
