const { MessageFlags } = require('discord.js');
const { sendAnonymousMessage, anonymousDownloadImages } = require('../../tools/anonymous');

module.exports = {
    data: {
        name: 'modalReply',
    },
    async execute(interaction, client, { messageId }) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const key = interaction.fields.getTextInputValue('key');
        const content = interaction.fields.getTextInputValue('content');

        const files = interaction.fields.getUploadedFiles('file');
        let attachments = [];
        if (files?.size > 0) {
            ({ files: attachments } = await anonymousDownloadImages(interaction.guild, files.values()));
        }

        const response = await sendAnonymousMessage({
            guild: interaction.guild,
            author: interaction.user,
            source: 'reply',
            messageChannel: interaction.channel,
            messageContent: content,
            messageAttachments: attachments,
            encryptionKey: key || null,
            replyToMessageId: messageId,
        });

        return interaction.editReply({ content: response.content });
    },
};
