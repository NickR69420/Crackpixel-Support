import { Command, BotInteraction } from '../lib/structures/Command';

export default class Ping extends Command {
	constructor(ctx: Command.Ctx) {
		super(ctx, {
			name: 'ping',
			description: 'Pong!',
		});
	}

	public async run(interaction: BotInteraction) {
		const now = Date.now();
		await this.reply(interaction, { embeds: [this.embeds.create({ description: 'Pinging...' })] });

		interaction.editReply({
			embeds: [
				this.embeds.build({
					description: `:stopwatch: **Roundtrip** \`\`${this.client.ws.ping}ms\`\`\n:heartpulse: **Heartbeat** \`\`${Math.round(
						Date.now() - now
					)}ms\`\``,
				}),
			],
		});
	}
}
