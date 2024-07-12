import { ComponentType } from 'discord.js';
import { Command, BotInteraction } from '../lib/structures/Command';
import { Err } from '../lib/structures/Err';

export default class Create extends Command {
	constructor(ctx: Command.Ctx) {
		super(ctx, {
			name: 'create',
			description: 'Creates a new ticket.',
			ephemeral: true,
		});
	}

	public async run(interaction: BotInteraction) {
		this.reply(interaction, {
			embeds: [
				this.embeds.build({
					title: 'Please select a ticket category!',
				}),
			],
			components: this.client.tickets.createMenu(false, 'create-menu', 'create'),
		});

		const collector = interaction.channel.createMessageComponentCollector({
			componentType: ComponentType.SelectMenu,
			time: 30000,
		});

		collector.on('collect', async (i) => {
			const type = i.values[0].split('.')[1];
			const openTicket = await this.client.tickets.hasOpenTicket(interaction.user.id, type);

			if (openTicket) {
				this.reply(interaction, {
					embeds: [this.embeds.error('You already have an open ticket. Please use your existing ticket or close it.', 'Existing Open Ticket')],
					components: [],
				});
				return;
			}

			this.client.tickets
				.create(interaction.user.id, type)
				.then((channel) => {
					this.reply(interaction, {
						embeds: [
							this.embeds.build({
								title: 'Ticket Created',
								description: `Your ticket has been created. <#${channel.id}>`,
							}),
						],
					});
				})
				.catch((err: Err.Res) => {
					this.reply(interaction, {
						embeds: [this.embeds.error(err.message, err.title)],
						components: [],
					});
					return;
				});

			collector.stop();
		});

		collector.on('end', (_, i) => {
			if (i == 'time') {
				interaction.editReply({ components: this.client.tickets.createMenu(true, 'create-menu', 'create') });
			}
		});
	}
}
