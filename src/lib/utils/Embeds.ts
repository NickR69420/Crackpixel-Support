import { EmbedBuilder, EmbedAuthorData, EmbedData, Colors } from 'discord.js';

import { BotClient } from '../structures/BotClient';

export class Embeds {
	private client: BotClient;

	constructor(client: BotClient) {
		this.client = client;
	}

	get author() {
		return { name: 'Crackpixel Support', iconURL: this.client.user?.displayAvatarURL() };
	}

	get footer() {
		return { text: 'Crackpixel Support', iconURL: this.client.user?.displayAvatarURL() };
	}

	public create(data: embedOptions) {
		const Embed = new EmbedBuilder(data);
		if (!data.color) Embed.setColor('Blurple');
		if (data.stamp === true) Embed.setTimestamp(Date.now());
		if (data.stamp && data.stamp !== true && new Date(data.stamp)) Embed.setTimestamp(new Date(data.stamp));
		if (data.img) Embed.setImage(data.img);
		if (data.thumb) Embed.setThumbnail(data.thumb);

		return Embed;
	}

	public error(message: string, title?: string) {
		const author: EmbedAuthorData = { name: title ?? undefined, iconURL: title ? this.client.user.displayAvatarURL() : undefined };
		return this.create({
			author,
			description: message,
			color: Colors.Red,
			stamp: true,
		});
	}

	public build(data: embedOptions) {
		return this.create({ author: this.author, ...data });
	}
}

export interface embedOptions extends EmbedData {
	stamp?: Date | number | boolean;
	img?: string;
	thumb?: string;
}
