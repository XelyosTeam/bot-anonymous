const { MessageFlags } = require('discord.js');
const { decryptAnonymousMessage } = require('../../tools/anonymous');

module.exports = {
    data: {
        name: 'modalDecryptMessage',
    },
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const key = interaction.fields.getTextInputValue('key');
        const content = interaction.fields.getTextInputValue('content');

        const response = await decryptAnonymousMessage({
            messageContent: content,
            encryptionKey: key,
        });

        return interaction.editReply(response);
    },
};
