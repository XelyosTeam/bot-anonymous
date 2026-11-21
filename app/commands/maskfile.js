const { SlashCommandBuilder, InteractionContextType, MessageFlags, ApplicationIntegrationType } = require('discord.js');

const { sendAnonymousMessage, anonymousDownloadImages, getGuildMaxFileSizeMB } = require('../tools/anonymous');
const { checkAnonymousCommandChannel } = require('../tools/channel');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maskfile')
        .setContexts([InteractionContextType.Guild])
        .setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
        .setDescription('Send a message with a file anonymously!')
        .setDescriptionLocalizations({
            fr: 'Envoyer un message avec un fichier anonymement !',
        })
        .addAttachmentOption((option) =>
            option
                .setName('attachment')
                .setNameLocalizations({
                    fr: 'fichier',
                })
                .setDescription('Select a file to send')
                .setDescriptionLocalizations({
                    fr: 'Sélectionner un fichier à envoyer',
                })
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
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const channelError = checkAnonymousCommandChannel(interaction);
        if (channelError) {
            return interaction.editReply({ content: channelError });
        }

        const message = interaction.options.getString('content');

        const attachment = interaction.options.getAttachment('attachment');

        const maxFileSizeMB = getGuildMaxFileSizeMB(interaction.guild);
        const MAX_FILE_SIZE = maxFileSizeMB * 1024 * 1024; // MB => bytes
        if (attachment.size > MAX_FILE_SIZE) {
            return interaction.editReply({
                content: `The file is too large. Maximum allowed size is ${maxFileSizeMB} MB.`,
            });
        }

        const { files: attachments } = await anonymousDownloadImages(interaction.guild, [attachment]);
        if (attachments.length === 0) {
            return interaction.editReply({
                content: 'Unable to retrieve your file, please try again.',
            });
        }

        const response = await sendAnonymousMessage({
            guild: interaction.guild,
            author: interaction.user,
            source: 'maskfile',
            messageChannel: interaction.channel,
            messageContent: message,
            messageAttachments: attachments,
        });

        return interaction.editReply({ content: response.content });
    },
};
