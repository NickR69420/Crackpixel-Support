import { Command, BotInteraction } from '../lib/structures/Command';

export default class Lock extends Command {
	constructor(ctx: Command.Ctx) {
		super(ctx, {
			name: 'lock',
			description: 'Locks a ticket.',
			ephemeral: true,
		});
	}

	public async run(interaction: BotInteraction) {
		const ticket = await this.client.tickets.fetchTicket(interaction.channel.id);

		if (!ticket) return this.error(interaction, { title: 'Invalid Ticket', message: ':x: This channel is not linked with any existing ticket' });
		if (ticket.locked) return this.error(interaction, { title: 'Ticket Already Locked', message: ':x: This is ticket is already locked.' });

		await this.client.tickets.lock(interaction, ticket);

		this.reply(interaction, { embeds: [this.embeds.create({ description: 'Ticket locked.' })] });
	}
}
