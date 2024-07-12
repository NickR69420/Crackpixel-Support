import { Util } from '@nickdoespackages/utils';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	InteractionReplyOptions,
	Message,
	SelectMenuInteraction,
} from 'discord.js';
import { BotInteraction } from '../structures/Command';
import { BotClient } from '../structures/BotClient';

export class Utils extends Util {
	constructor(client: BotClient) {
		super(client);
	}

	public reply(interaction: BotInteraction, options: InteractionReplyOptions) {
		const ephemeral = options.ephemeral ?? false;
		if (interaction.replied) {
			return interaction.followUp({
				fetchReply: true,
				ephemeral,
				...options,
			}) as Promise<Message>;
		}

		if (interaction.deferred) {
			return interaction.editReply(options) as Promise<Message>;
		}

		return interaction.reply({
			fetchReply: true,
			ephemeral,
			...options,
		});
	}

	public menuReply(i: SelectMenuInteraction, options: InteractionReplyOptions) {
		if (i.deferred) {
			return i.editReply(options);
		}

		return i.reply(options);
	}

	public buttonReply(i: ButtonInteraction, options: InteractionReplyOptions) {
		if (i.deferred) {
			return i.followUp(options);
		}

		if (i.replied) {
			return i.editReply(options);
		}

		i.reply(options);
	}

	public sendConfirmation(interaction: ButtonInteraction | BotInteraction, embed: EmbedBuilder, options: buttonOptions) {
		return new Promise<boolean>(async (res, rej) => {
			const row = (state: boolean) => {
				return new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId('ticket-confirm')
						.setDisabled(state)
						.setEmoji('895265127299960832')
						.setLabel(options.confirm)
						.setStyle(ButtonStyle.Success),
					new ButtonBuilder()
						.setCustomId('ticket-cancel')
						.setDisabled(state)
						.setEmoji('895265014619987998')
						.setLabel(options.cancel)
						.setStyle(ButtonStyle.Danger)
				);
			};

			if (interaction.isCommand()) await this.reply(interaction, { embeds: [embed], components: [row(false)], ephemeral: true });
			else if (interaction.isButton()) await this.buttonReply(interaction, { embeds: [embed], components: [row(false)], ephemeral: true });

			const filter = (i: ButtonInteraction) => i.user.id == interaction.user.id;

			const collector = interaction.channel.createMessageComponentCollector({
				componentType: ComponentType.Button,
				filter,
				max: 1,
				time: 30000,
			});

			collector.on('collect', async (i) => {
				const id = i.customId.split('-')[1];

				if (id == 'confirm') return res(true);
				if (id == 'cancel') return res(false);
			});
		});
	}
}

interface buttonOptions {
	confirm: string;
	cancel: string;
}
