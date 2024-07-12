import { Command, BotInteraction } from '../lib/structures/Command';

export default class Unlock extends Command {
	constructor(ctx: Command.Ctx) {
		super(ctx, {
			name: 'unlock',
			description: 'Unlocks a ticket.',
			ephemeral: true,
		});
	}

	public async run(interaction: BotInteraction) {
		const ticket = await this.client.tickets.fetchTicket(interaction.channel.id);

		if (!ticket) return this.error(interaction, { title: 'Invalid Ticket', message: ':x: This channel is not linked with any existing ticket' });
		if (!ticket.locked) return this.error(interaction, { title: 'Ticket Not Locked', message: ':x: This is ticket is not locked.' });

		await this.client.tickets.unlock(interaction, ticket);

		this.reply(interaction, { embeds: [this.embeds.create({ description: 'Ticket unlocked.' })] });
	}
}
