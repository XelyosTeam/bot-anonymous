const { SlashCommandBuilder, InteractionContextType, MessageFlags, ApplicationIntegrationType } = require('discord.js');

const { sendAnonymousMessage } = require('../tools/anonymous');
const { checkAnonymousCommandChannel } = require('../tools/channel');

/* Same as /ano, with an encryption key */
module.exports = {
    data: new SlashCommandBuilder()
        .setName('encrypt')
        .setContexts([InteractionContextType.Guild])
        .setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
        .setDescription('Send an encrypted message')
        .setDescriptionLocalizations({
            fr: 'Envoyer un message chiffré',
        })
        .addStringOption((option) =>
            option
                .setName('key')
                .setNameLocalizations({
                    fr: 'clé',
                })
                .setDescription('Enter encryption key!')
                .setDescriptionLocalizations({
                    fr: 'Entrer la clé de chiffrage !',
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

        const channelError = checkAnonymousCommandChannel(interaction);
        if (channelError) {
            return interaction.editReply({ content: channelError });
        }

        const message = interaction.options.getString('content');
        const key = interaction.options.getString('key');
        const response = await sendAnonymousMessage({
            guild: interaction.guild,
            author: interaction.user,
            source: 'encrypt',
            messageChannel: interaction.channel,
            messageContent: message,
            encryptionKey: key,
        });

        return interaction.editReply({ content: response.content });
    },
};
