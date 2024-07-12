import { Ticket } from '@prisma/client';
import {
	TextChannel,
	CategoryChannel,
	GuildMember,
	ButtonInteraction,
	InteractionReplyOptions,
	MessageEditOptions,
	ActionRowBuilder,
	SelectMenuBuilder,
	MessageCreateOptions,
	ChannelType,
	ButtonBuilder,
	ButtonStyle,
} from 'discord.js';
import { Embeds } from '../utils/Embeds';
import { Utils } from '../utils/Utils';
import { Err } from './Err';
import { BotClient } from './BotClient';
import { createTranscript } from 'discord-html-transcripts';
import { BotInteraction } from './Command';
import { ExportReturnType } from 'discord-html-transcripts/dist/types';

export class Tickets {
	public client: BotClient;
	public embeds: Embeds;
	public utils: Utils;
	public constructor(client: BotClient) {
		this.client = client;
		this.embeds = new Embeds(client);
		this.utils = new Utils(client);
	}

	public get config() {
		return this.client.config.Tickets;
	}

	public get db() {
		return this.client.prisma.ticket;
	}

	public get guild() {
		return this.client.guilds.cache.get(this.client.config.Dev ? this.client.config.DevGuildId : this.client.config.GuildId);
	}

	public createMenu(state: boolean, id: string, prefix: string) {
		if (this.config.Categories.length < 1) return [];

		const options = this.config.Categories.map((cat) => {
			return {
				label: cat.name,
				value: `${prefix}.${cat.id}`,
				emoji: cat.emoji,
			};
		});

		return [
			new ActionRowBuilder<SelectMenuBuilder>().addComponents(
				new SelectMenuBuilder().setCustomId(id).setPlaceholder('Select a ticket category.').setDisabled(state).setOptions(options)
			),
		];
	}

	public createPanel(): MessageCreateOptions | MessageEditOptions {
		const { Panel } = this.config;
		const embed = this.embeds.create({
			title: Panel.Title ?? undefined,
			description: Panel.Description ?? undefined,
			footer: { text: Panel.Footer ?? 'Support', iconURL: this.client.user.displayAvatarURL() },
		});

		const row = this.createMenu(false, 'panel-menu', 'panel');

		return { embeds: [embed], components: row };
	}

	public fetchTicket(id: string) {
		return this.db.findUnique({ where: { Id: id } });
	}

	public findTicket(userId: string, type: string) {
		return this.db.findFirst({
			where: {
				userId,
				type,
			},
		});
	}

	public async hasOpenTicket(userId: string, type: string) {
		const ticket = await this.db.findFirst({
			where: {
				userId,
				type,
				closed: false,
			},
		});

		if (!ticket) return false;
		else return true;
	}

	public create(memberId: string, catId: string) {
		return new Promise<TextChannel>(async (res, rej) => {
			const categorySettings = this.config.Categories.find((c) => c.id == catId);
			if (!categorySettings) return rej(Err.send({ title: 'Invalid Category', message: `Category \`${catId}\` does not exist.`, log: true }));
			const category = (await this.guild.channels.fetch(categorySettings.categoryId)) as CategoryChannel;

			if (!category) return rej(Err.send({ title: 'Invalid Category', message: `Category \`${catId}\` does not exist.`, log: true }));
			if (category.children.cache.size >= 50)
				return rej(
					Err.send({ title: 'Max Limit Reached', message: 'This ticket category has reached the maximum number of tickets. Please try again later.' })
				);

			const number = (await this.db.count()) + 1;
			const member = await this.guild.members.fetch(memberId);
			const name = `${member.displayName}-${number}`;
			const channel = await this.guild.channels.create({
				name,
				parent: category.id,
				reason: `New ticket created by ${member.user.tag}`,
				type: ChannelType.GuildText,
			});

			await channel.permissionOverwrites.edit(member, {
				ViewChannel: true,
				ReadMessageHistory: true,
				SendMessages: true,
				EmbedLinks: true,
				AttachFiles: true,
			});

			const ticket = await this.db.create({
				data: {
					Id: channel.id,
					type: catId,
					userId: member.user.id,
					number,
				},
			});

			await this.setupTicket(ticket, channel, member);

			this.log(`${member.user.tag} has created a ticket. (${channel.id})`);

			return res(channel);
		});
	}

	public async setupTicket(ticket: Ticket, channel: TextChannel, member: GuildMember) {
		const cat = this.config.Categories.find((c) => c.id == ticket.type);
		const title = cat.embed.title ?? `${cat.emoji} ${cat.name}`;
		const description =
			cat.embed.description ?? 'Please state your reason for opening this ticket. The support team will be with you shortly. Please be patient.';
		const footer = cat.embed.footer ?? 'Crackpixel Support';

		const ticketEmbed = this.embeds.create({
			author: { name: member.user.tag, iconURL: member.user.displayAvatarURL() },
			title,
			description,
			footer: { text: footer, iconURL: this.embeds.footer.iconURL },
			stamp: true,
		});

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setCustomId('close').setEmoji('✖️').setLabel('Close').setStyle(ButtonStyle.Danger)
		);

		if (cat.addons && cat.addons.length > 0) {
			cat.addons.forEach((a) => {
				row.addComponents(
					new ButtonBuilder()
						.setCustomId(a.id)
						.setEmoji(a.emoji ?? undefined)
						.setLabel(a.name)
						.setStyle(ButtonStyle.Secondary)
				);
			});
		}

		const ping = cat.mentions && cat.mentions.length > 0 ? cat.mentions.map((r) => this.utils.mentionRole(r)).join(' ') : '';
		const content = `${this.utils.mention(member.id)} ${ping}`;

		const msg = await channel.send({
			content,
			embeds: [ticketEmbed],
			components: [row],
		});

		await msg.pin('Opening message.');

		return ticket;
	}

	public async setTranscript(id: string, t: string) {
		return await this.client.prisma.transcript.create({ data: { Id: id, data: t } });
	}

	public async saveTranscript(channel: TextChannel) {
		let t = await createTranscript(channel, {
			saveImages: true,
			returnType: ExportReturnType.STRING,
		});
		await this.setTranscript(channel.id, t);

		return `${this.config.Transcripts.address}:${this.config.Transcripts.port}/transcripts/${channel.id}`;
	}

	public async close(interaction: BotInteraction | ButtonInteraction, id: string, closerId: string, reason?: string) {
		const ticket = await this.preClose(id, closerId, reason ?? null);
		const channel = await this.utils.fetchChannel(ticket.Id, interaction.guild);
		if (!channel) return;

		const transcript = await this.client.tickets.saveTranscript(channel);
		const closer = await this.utils.fetchMember(closerId, interaction.guild);
		const member = await this.utils.fetchMember(ticket.userId, interaction.guild);

		this.reply(interaction, { embeds: [this.embeds.create({ title: 'This ticket will close in 5 seconds.' })] });

		setTimeout(async () => {
			await channel.delete(`${member.user.tag}'s ticket closed by ${closer.user.tag}. Reason ${ticket.reason}`);

			this.log(`${closer.user.tag} has closed ticket-${ticket.number}. (${ticket.userId})`);
		}, 5000);

		const tChannel = await this.utils.fetchChannel(this.config.Transcripts.channel, interaction.guild);
		const type = this.config.Categories.find((c) => c.id == ticket.type).name;

		tChannel.send({
			embeds: [
				this.embeds.create({
					author: { name: member.user.tag, iconURL: member.user.displayAvatarURL() },

					description: `[Click here to view transcript](${transcript})`,
					fields: [
						{ name: 'ID', value: `${ticket.number}` },
						{ name: 'Type', value: type },
						{ name: 'Closed by', value: `${this.utils.mention(ticket.userId)}` },
					],
					stamp: true,
				}),
			],
		});
	}

	public async lock(interaction: BotInteraction, ticket: Ticket) {
		await this.db.update({
			where: {
				Id: ticket.Id,
			},
			data: {
				locked: true,
			},
		});

		await (interaction.channel as TextChannel).permissionOverwrites.edit(ticket.userId, {
			SendMessages: false,
		});

		interaction.channel.send({ embeds: [this.embeds.create({ description: `Ticket locked by ${this.utils.mention(interaction.user.id)}` })] });

		return true;
	}

	public async unlock(interaction: BotInteraction, ticket: Ticket) {
		await this.db.update({
			where: {
				Id: ticket.Id,
			},
			data: {
				locked: false,
			},
		});

		await (interaction.channel as TextChannel).permissionOverwrites.edit(ticket.userId, {
			SendMessages: true,
		});

		interaction.channel.send({ embeds: [this.embeds.create({ description: `Ticket unlocked by ${this.utils.mention(interaction.user.id)}` })] });

		return true;
	}

	private preClose(id: string, closerId: string, reason?: string) {
		return new Promise<Ticket>(async (res, rej) => {
			const member = await this.guild.members.fetch(closerId);
			const ticket = await this.fetchTicket(id);
			if (!ticket) return rej(Err.send({ title: 'Invalid Ticket', message: ':x: Found no ticket associated with this channel.' }));

			const update = await this.db.update({
				where: { Id: id },
				data: {
					closed: true,
					closedBy: member.id,
					reason: reason ?? 'Not provided.',
				},
			});

			return res(update);
		});
	}

	private reply(interaction: BotInteraction | ButtonInteraction, options: InteractionReplyOptions) {
		if (interaction.isCommand()) return this.utils.reply(interaction, options);
		else if (interaction.isButton()) return this.utils.buttonReply(interaction, options);
	}

	public async log(message: string) {
		if (this.config.Logs.enabled) {
			const channel = await this.utils.fetchChannel(this.config.Logs.channel, this.guild);
			if (!channel) return;

			await channel.send(message);
		}
	}
}
