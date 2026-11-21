const { SlashCommandBuilder, InteractionContextType, MessageFlags, ApplicationIntegrationType } = require('discord.js');

const { decryptAnonymousMessage } = require('../tools/anonymous');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('decrypt')
        .setContexts([InteractionContextType.Guild])
        .setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
        .setDescription('Decrypt a message!')
        .setDescriptionLocalizations({
            fr: 'Déchiffrer un message !',
        })
        .addStringOption((option) =>
            option
                .setName('key')
                .setNameLocalizations({
                    fr: 'clé',
                })
                .setDescription('Enter encryption key!')
                .setDescriptionLocalizations({
                    fr: 'Entrer la clé de déchiffrage !',
                })
                .setMinLength(2)
                .setMaxLength(2)
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('content')
                .setNameLocalizations({
                    fr: 'message',
                })
                .setDescription('Enter the message to send!')
                .setDescriptionLocalizations({
                    fr: 'Saisissez le message à envoyer !',
                })
                .setMinLength(1)
                .setMaxLength(1000)
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const message = interaction.options.getString('content');
        const key = interaction.options.getString('key');
        const response = await decryptAnonymousMessage({
            messageContent: message,
            encryptionKey: key,
        });

        return interaction.editReply(response);
    },
};
