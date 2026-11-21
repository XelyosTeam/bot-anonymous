const { SlashCommandBuilder, InteractionContextType, MessageFlags, ApplicationIntegrationType } = require('discord.js');

const { sendAnonymousMessage } = require('../tools/anonymous');
const { checkAnonymousCommandChannel } = require('../tools/channel');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mask')
        .setContexts([InteractionContextType.Guild])
        .setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
        .setDescription('Send your message anonymously!')
        .setDescriptionLocalizations({
            fr: 'Envoyez votre message anonymement !',
        })
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
        const response = await sendAnonymousMessage({
            guild: interaction.guild,
            author: interaction.user,
            source: 'mask',
            messageChannel: interaction.channel,
            messageContent: message,
        });

        return interaction.editReply({ content: response.content });
    },
};
