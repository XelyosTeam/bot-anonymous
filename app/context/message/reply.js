const {
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    InteractionContextType,
    ApplicationIntegrationType,
    LabelBuilder,
    FileUploadBuilder,
    MessageFlags,
} = require('discord.js');
const { checkAnonymousCommandChannel } = require('../../tools/channel');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Reply anonymously')
        .setNameLocalizations({
            fr: 'Répondre anonymement',
        })
        .setType(ApplicationCommandType.Message)
        .setContexts([InteractionContextType.Guild])
        .setIntegrationTypes([ApplicationIntegrationType.GuildInstall]),
    async execute(interaction) {
        const channelError = checkAnonymousCommandChannel(interaction);
        if (channelError) {
            return interaction.reply({
                content: channelError,
                flags: MessageFlags.Ephemeral,
            });
        }

        const modal = new ModalBuilder()
            .setCustomId(
                JSON.stringify({
                    name: 'modalReply',
                    metadata: {
                        messageId: interaction.targetMessage.id,
                    },
                })
            )
            .setTitle('Reply anonymously to this message');

        // key for encryption (optional)
        const keyInput = new TextInputBuilder()
            .setCustomId('key')
            .setPlaceholder('Enter the 2-character encryption key (optional)')
            .setMinLength(2)
            .setMaxLength(2)
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const keyLabel = new LabelBuilder().setLabel('Encryption Key:').setTextInputComponent(keyInput);
        modal.addLabelComponents(keyLabel);

        // message content
        const contentInput = new TextInputBuilder()
            .setCustomId('content')
            .setPlaceholder('Enter your anonymous reply')
            .setMinLength(1)
            .setMaxLength(1000)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const contentLabel = new LabelBuilder().setLabel('Message Content:').setTextInputComponent(contentInput);
        modal.addLabelComponents(contentLabel);

        const fileComponent = new FileUploadBuilder()
            .setCustomId('file')
            .setMinValues(1)
            .setMaxValues(3)
            .setRequired(false);

        const fileLabel = new LabelBuilder().setLabel('Add files').setFileUploadComponent(fileComponent);
        modal.addLabelComponents(fileLabel);

        await interaction.showModal(modal);
    },
};
