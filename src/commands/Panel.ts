import { hyperlink } from '@discordjs/builders';
import { ChannelType, MessageEditOptions, MessageCreateOptions, ApplicationCommandOptionType } from 'discord.js';
import { Command, BotInteraction } from '../lib/structures/Command';

export default class Panel extends Command {
	constructor(ctx: Command.Ctx) {
		super(ctx, {
			name: 'panel',
			description: 'Configurates the ticket panel.',
			options: [
				{
					name: 'create',
					description: 'Creates a ticket panel.',
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: 'channel',
							description: 'The channel in which to create the panel.',
							type: ApplicationCommandOptionType.Channel,
							channelTypes: [ChannelType.GuildAnnouncement, ChannelType.GuildText],
							required: false,
						},
					],
				},
				{
					name: 'refresh',
					description: 'Updates a ticket panel with the updated configs.',
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: 'panel',
							description: 'The message Id of the panel. Make sure to run this command in the same channel as the panel.',
							type: ApplicationCommandOptionType.String,
							required: true,
						},
					],
				},
			],
			ephemeral: true,
		});
	}

	public async run(interaction: BotInteraction) {
		const subCommand = interaction.options.getSubcommand();

		switch (subCommand) {
			case 'create': {
				const channel = this.getChannel(interaction, 'channel') ?? interaction.channel;
				const panel = this.client.tickets.createPanel();

				const m = await channel.send(panel as MessageCreateOptions);

				this.reply(interaction, { embeds: [this.embeds.create({ description: `Panel created. ${hyperlink('Click here to view panel', m.url)}` })] });

				break;
			}
			case 'refresh': {
				const panelId = interaction.options.getString('panel');
				const message = await interaction.channel.messages.fetch(panelId);

				if (!message || !message.embeds)
					return this.error(interaction, { title: 'Invalid Panel', message: 'Found no panel in this channel with the provided Id.' });

				const m = await message.edit(this.refreshPanel() as MessageEditOptions);

				this.reply(interaction, {
					embeds: [this.embeds.create({ description: `Panel refreshed. ${hyperlink('Click here to view panel', m.url)}` })],
				});

				break;
			}
		}
	}

	private refreshPanel() {
		this.client.refreshConfig();

		return this.client.tickets.createPanel();
	}
}
