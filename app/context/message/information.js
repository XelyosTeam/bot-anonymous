const {
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    InteractionContextType,
    ApplicationIntegrationType,
    MessageFlags,
    PermissionsBitField,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorSpacingSize,
    SeparatorBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
} = require('discord.js');

const settings = require('../../settings');
const messageStore = require('../../services/messageStore');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Show information')
        .setNameLocalizations({
            fr: 'Afficher les infos',
        })
        .setType(ApplicationCommandType.Message)
        .setContexts([InteractionContextType.Guild])
        .setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (interaction.targetMessage.author.id !== client.user.id) {
            return interaction.editReply({
                content: 'This command can only be used on messages sent by the bot.',
            });
        }

        const messageInformation = messageStore.find(interaction.guild.id, interaction.targetMessage.id);

        if (!messageInformation) {
            return await interaction.editReply({
                content:
                    'No information found for this message (sent before the bot was installed, or purged by the retention policy).',
            });
        }

        const components = [];

        const container = new ContainerBuilder()
            .setAccentColor(settings.color)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Message Information'))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Author:** <@${messageInformation.authorId}> (${messageInformation.authorId})`
                )
            );

        if (messageInformation.encryptionKey) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Encryption Key:** \`${messageInformation.encryptionKey}\``)
            );
        }

        const rawContent = messageInformation.content ?? '';
        const messageContent = rawContent.length > 1900 ? `${rawContent.substring(0, 1897)}...` : rawContent;

        container
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Message content:**\n${messageContent || '*(attachments only)*'}`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    '||Only people with message management permissions can show this command||'
                )
            );

        components.push(container);

        if (messageInformation.replyOfMessageId) {
            const button = new ButtonBuilder()
                .setLabel('Click here to see the message this message is replying to')
                .setStyle(ButtonStyle.Link)
                .setURL(
                    `https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${messageInformation.replyOfMessageId}`
                );
            const row = new ActionRowBuilder().addComponents(button);
            components.push(row);
        }

        return await interaction.editReply({
            components: components,
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
