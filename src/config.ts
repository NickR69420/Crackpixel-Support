import { EmbedAssetData, EmbedAuthorData, EmbedData } from 'discord.js';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { join } from 'path';

export function loadConfig() {
	return load(readFileSync(join(__dirname, '..', '..', 'config.yml'), 'utf-8')) as IConfig;
}

export interface IConfig {
	Token: string;
	GuildId: string;
	DevToken: string;
	Dev: boolean;
	DevGuildId: string;

	commands: {
		ratelimits: Ratelimits;
		status: Statuses;
	};

	Tickets: Tickets;
}

interface Ratelimits {
	[key: string]: number;
}

interface Statuses {
	[key: string]: boolean;
}

interface Tickets {
	Panel: Panel;
	Categories: Category[];
	Transcripts: Transcripts;
	Logs: Logs;
}

interface Panel {
	Title: string;
	Description: string;
	Footer: string;
}

interface Category {
	name: string;
	emoji: string;
	categoryId: string;
	id: string;
	allowedRoles: string[];
	embed: EmbedOptions;
	mentions: string[];
	addons: Addons[];
}

interface Addons {
	name: string;
	emoji?: string;
	id: string;
	response: AddonResponse;
}

interface AddonResponse {
	message?: string;
	embed?: EmbedData;
}

interface Logs {
	enabled: boolean;
	channel: string;
}

interface Transcripts {
	host: string;
	address: string;
	port: number;
	channel: string;
}

interface EmbedOptions {
	title?: string;
	description?: string;
	footer?: string;
	image?: EmbedAssetData;
	thumbnail?: EmbedAssetData;

	author?: EmbedAuthorData;
}
