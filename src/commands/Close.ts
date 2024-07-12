import { ApplicationCommandOptionType } from 'discord.js';
import { Command, BotInteraction } from '../lib/structures/Command';

export default class Close extends Command {
	constructor(ctx: Command.Ctx) {
		super(ctx, {
			name: 'close',
			description: 'Closes an existing ticket.',
			options: [
				{
					name: 'ticket',
					description: 'The number or the channel ID of the ticket to close.',
					type: ApplicationCommandOptionType.String,
					required: false,
				},
				{
					name: 'reason',
					description: 'The reason for closing this ticket.',
					type: ApplicationCommandOptionType.String,
					required: false,
				},
			],
			ephemeral: true,
		});
	}

	public async run(interaction: BotInteraction) {
		const ticket = await this.fetchTicket(interaction);
		if (!ticket) return this.error(interaction, { title: 'Invalid Ticket', message: ':x: Found no ticket associated with this channel.' });

		const confirmed = this.utils.sendConfirmation(
			interaction,
			this.embeds.create({ title: 'Are you sure you want to close this ticket?', footer: { text: 'You have 30 seconds to reply.' } }),
			{ cancel: 'Cancel', confirm: 'Close' }
		);

		if (!confirmed) return this.reply(interaction, { embeds: [this.embeds.error('Canceled the request for closure of ticket.', ':x: Cancelled')] });

		const reason = interaction.options.getString('reason') ?? 'Not provided.';

		await this.client.tickets.close(interaction, ticket.Id, interaction.user.id, reason);
	}

	private async fetchTicket(i: BotInteraction) {
		const input = i.options.getString('ticket') ?? i.channel.id;
		const ticketInput = (await this.resolveById(input)) ?? (await this.resolveByNumber(parseInt(input)));

		return ticketInput;
	}

	private resolveById(id: string) {
		return this.client.prisma.ticket.findUnique({
			where: { Id: id },
		});
	}

	private resolveByNumber(number: number) {
		return this.client.prisma.ticket.findFirst({ where: { number } });
	}
}
