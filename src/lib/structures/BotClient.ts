import { CooldownManager, SlashCreator } from '@nickdoespackages/utils';
import { Consola, LogLevel } from 'consola';
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { Embeds } from '../utils/Embeds';
import { Command } from './Command';
import { loadConfig, IConfig } from '../../config';
import { Listener } from './Listener';
import { PrismaClient } from '@prisma/client';
import { Tickets } from './Tickets';
import Api from '../../api/main';
import { Utils } from '../utils/Utils';

export class BotClient extends Client {
	public commands: Collection<string, Command>;
	public creator: SlashCreator;
	public utils: Utils;
	public embeds: Embeds;
	public cooldowns: CooldownManager;
	public logger: Consola;
	public prisma: PrismaClient;
	public tickets: Tickets;
	public config: IConfig;
	private Dev: boolean;
	constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.GuildBans,
				GatewayIntentBits.GuildVoiceStates,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildMessageReactions,
				GatewayIntentBits.DirectMessages,
				GatewayIntentBits.DirectMessageReactions,
			],
			partials: [Partials.Channel, Partials.Reaction, Partials.GuildMember],
			presence: {
				status: 'idle',
			},
		});

		this.commands = new Collection<string, Command>();
		this.creator = new SlashCreator(this);
		this.utils = new Utils(this);
		this.embeds = new Embeds(this);
		this.cooldowns = new CooldownManager(this);
		this.logger = new Consola({ level: LogLevel.Fatal });
		this.prisma = new PrismaClient();
		this.tickets = new Tickets(this);
		this.config = loadConfig();
		this.Dev = this.config.Dev;
		this.token = this.Dev ? this.config.DevToken : this.config.Token;
	}

	public async init() {
		this.loadListeners();
		this.loadCommands();
		await Api(this);

		await this.login(this.token);
		return this;
	}

	public async loadCommands() {
		const files = await this.utils.loadFiles(`${__dirname}/../../commands/*{.ts,.js}`);

		files.forEach((path) => {
			const file = require(path)?.default;
			const directory = this.getDir(path);
			const command = this.construct<Command>(file, path, directory);

			this.commands.set(command.name, command);
		});
	}

	public async loadListeners() {
		const files = await this.utils.loadFiles(`${__dirname}/../../listeners/*{.ts,.js}`);

		files.forEach((path) => {
			const file = require(path)?.default;
			const directory = this.getDir(path);
			const listener = this.construct<Listener>(file, path, directory);

			listener.start();
		});
	}

	public async registerCommands() {
		const commands = this.commands.map((c) => c.data);
		const GuildId = this.Dev ? this.config.DevGuildId : this.config.GuildId;
		const guild = await this.guilds.fetch(GuildId);
		if (!guild) return;

		if (guild) {
			await this.creator.syncGuildCommands(commands, guild.id);
		}

		this.logger.success('Registered commands to the support server.');
	}

	public async deleteCommands() {
		const GuildId = this.Dev ? this.config.DevGuildId : this.config.GuildId;
		const guild = await this.guilds.fetch(GuildId);
		if (!guild) return;

		if (guild) {
			(await guild.commands.fetch()).forEach(async (cmd) => {
				await guild.commands.delete(cmd);
			});
		}
	}

	public refreshConfig() {
		const refreshed = loadConfig();

		this.config = refreshed;

		return this;
	}

	private getDir(path: string) {
		const split = path.split('/');
		return split[split.length - 2];
	}

	private construct<T>(file: any, path: string, directory: string): T {
		return new file({ client: this, path, directory });
	}
}
