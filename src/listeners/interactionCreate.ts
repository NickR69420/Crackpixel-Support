import { Interaction, CacheType, PermissionResolvable, ButtonInteraction, EmbedBuilder, SelectMenuInteraction } from 'discord.js';
import { Command, BotInteraction } from '../lib/structures/Command';
import { Err } from '../lib/structures/Err';
import { Listener } from '../lib/structures/Listener';
import ms from 'pretty-ms';

export default class interactionCreate extends Listener {
	constructor(ctx: Listener.Ctx) {
		super(ctx, 'interactionCreate');
	}

	public async run(interaction: Interaction<CacheType>) {
		if (interaction.isCommand()) {
			const command = this.client.commands.get(interaction.commandName);

			if (!command) {
				interaction.reply({
					content: "Something's not right...",
				});

				await interaction.command.delete().catch(() => {});
				return;
			}

			if (!this.isEnabled(command.name)) {
				return command.error(interaction as Command.Interaction, {
					title: 'Command Disabled',
					message: ` The \`${command.name}\` command is disabled.`,
				});
			}

			if (!interaction.memberPermissions.has(command.requiredPermission)) {
				return command.error(interaction as Command.Interaction, {
					title: 'Missing Permissions',
					message: `You are missing the \`${this.formatPerm(command.requiredPermission)}\` permission to run this command.`,
				});
			}

			const ratelimited = await this.client.cooldowns.onCooldown(command.name, interaction.user.id);

			if (ratelimited) {
				return command.error(interaction as BotInteraction, {
					title: 'Ratelimited',
					message: `You may run this command again in \`${ms(ratelimited.cooldown, { verbose: true })}\``,
				});
			}

			this.defer(interaction as Command.Interaction, command.ephemeral);

			try {
				const result = await command.run(interaction as BotInteraction);

				if (result == Err) return;

				if (command.ratelimit > 0) this.client.cooldowns.create(command.name, interaction.user.id, command.ratelimit);
			} catch (error) {
				console.log(error);
				this.handleErr(interaction as BotInteraction, error);
			}
		} else if (interaction.isButton()) {
			await interaction.deferUpdate();

			this.handleAddons(interaction);

			switch (interaction.customId) {
				case 'close': {
					const confirmed = await this.utils.sendConfirmation(
						interaction,
						this.embeds.create({ title: 'Are you sure you want to close this ticket?', footer: { text: 'You have 30 seconds to reply.' } }),
						{ cancel: 'Cancel', confirm: 'Close' }
					);

					if (!confirmed)
						return this.utils.buttonReply(interaction, {
							embeds: [this.embeds.error('Canceled the request for closure of ticket.', 'Cancelled')],
							ephemeral: true,
						});

					await this.client.tickets.close(interaction, interaction.channel.id, interaction.user.id);
				}
			}
		} else if (interaction.isSelectMenu()) {
			await interaction.deferReply({ ephemeral: true });

			if (interaction.customId == 'panel-menu') this.handlePanel(interaction);
		}
	}

	private async handleErr(interaction: BotInteraction, err: any) {
		this.client.logger.error(new Error(err));
		if (interaction.replied) {
			return interaction
				.followUp({
					content: ':x: Something went wrong...',
					ephemeral: true,
				})
				.catch((e: any) => {
					this.client.logger.error(e);
				});
		}

		if (interaction.deferred) {
			return interaction
				.editReply({
					content: ':x: Something went wrong...',
				})
				.catch((e: any) => {
					this.client.logger.error(e);
				});
		}

		return interaction
			.reply({
				content: ':x: Something went wrong...',
				ephemeral: true,
			})
			.catch((e: any) => {
				this.client.logger.error(e);
			});
	}

	public defer(interaction: Command.Interaction, ephemeral: boolean) {
		setTimeout(() => {
			if (!interaction.replied && !interaction.deferred) interaction.deferReply({ ephemeral }).catch(() => {});
		}, 2000);
	}

	public isEnabled(cmd: string) {
		const enabled = this.client.config.commands.status[cmd] ?? true;

		return enabled;
	}

	private formatPerm(perm: PermissionResolvable) {
		const permission = perm.toString().replace(/\_/g, ' ');
		const split = permission.trim().split(' ');
		const splitFixed: string[] = [];
		split.forEach((e) => {
			e = e.charAt(0).toUpperCase() + e.slice(1).toLocaleLowerCase();
			splitFixed.push(e);
		});
		return splitFixed.join(' ');
	}

	private async handleAddons(i: ButtonInteraction) {
		const addons = this.client.config.Tickets.Categories.flatMap((c) => {
			if (c.addons && c.addons.length > 0) {
				return c.addons;
			}
		});

		const addon = addons.find((a) => a && a.id == i.customId);
		if (!addon) return;

		let content: string = undefined;
		let embed: EmbedBuilder = undefined;

		if (addon.response) {
			if (addon.response.message) content = addon.response.message;

			if (addon.response.embed) embed = this.embeds.create(addon.response.embed);

			i.followUp({ content, embeds: [embed] });
		}
	}

	private async handlePanel(i: SelectMenuInteraction) {
		const id = i.values[0].split('.');
		const type = id[1];

		const isPanel = (id[0] = 'panel');
		if (!isPanel) return;

		const openTicket = await this.client.tickets.hasOpenTicket(i.user.id, type);

		if (openTicket) {
			i.followUp({
				embeds: [this.embeds.error('You already have an open ticket. Please use your existing ticket or close it.', 'Existing Open Ticket')],
				components: [],
			});
			return;
		}

		this.client.tickets
			.create(i.user.id, type)
			.then((channel) => {
				i.followUp({
					embeds: [
						this.embeds.build({
							title: 'Ticket Created',
							description: `Your ticket has been created. <#${channel.id}>`,
						}),
					],
				});

				return;
			})
			.catch((err: Err.Res) => {
				i.followUp({
					embeds: [this.embeds.error(err.message, err.title)],
					components: [],
				});
				return;
			});
	}
}
