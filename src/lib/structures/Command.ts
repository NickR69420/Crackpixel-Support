import {
	ApplicationCommandOptionData,
	ChatInputApplicationCommandData,
	ChatInputCommandInteraction,
	EmbedField,
	GuildMember,
	InteractionReplyOptions,
	PermissionResolvable,
	TextBasedChannel,
} from 'discord.js';
import { Module } from './Module';
import { Err } from './Err';

export abstract class Command extends Module implements ICommand {
	public name: string;
	public description: string;
	public options?: ApplicationCommandOptionData[];
	public requiredPermission?: PermissionResolvable[];
	public ratelimit?: number;
	public data?: ChatInputApplicationCommandData;
	public ephemeral?: boolean;

	public constructor(ctx: Module.Ctx, options: ICommand) {
		super(ctx);

		this.name = options.name;
		this.description = options.description;
		this.options = options.options ?? [];
		this.requiredPermission = this.requiredPermission ?? ['SendMessages'];
		this.ratelimit = this.client.config.commands.ratelimits[this.name] ?? 0;
		this.ephemeral = options.ephemeral ?? true;
		this.data = {
			name: this.name,
			description: this.description,
			defaultMemberPermissions: [],
			options: this.options,
		};
	}

	public abstract run(interaction: Command.Interaction): any | Promise<any>;

	public reply(interaction: Command.Interaction, options: InteractionReplyOptions) {
		const ephemeral = this.ephemeral;

		return this.utils.reply(interaction, { ephemeral, ...options });
	}

	public error(interaction: Command.Interaction, options: errorOptions) {
		return new Err({
			type: 'command',
			cmd: this,
			err: options.title,
			interaction: interaction,
			message: options.message,
		});
	}

	public field(name: string, value: string, inline = false): EmbedField {
		return { name, value, inline };
	}

	public getMember(interaction: Command.Interaction, member: string) {
		return interaction.options.getMember(member) as GuildMember;
	}

	public getUser(interaction: Command.Interaction, user: string) {
		return interaction.options.getUser(user);
	}

	public getSubCommand(interaction: Command.Interaction, subCommand: string) {
		return interaction.options.getSubcommand() === subCommand;
	}

	public getChannel(interaction: Command.Interaction, channel: string) {
		return interaction.options.getChannel(channel) as TextBasedChannel;
	}
}

export interface ICommand extends ChatInputApplicationCommandData {
	requiredPermission?: PermissionResolvable[];
	ratelimit?: number;
	ephemeral?: boolean;
	data?: ChatInputApplicationCommandData;
}

export interface BotInteraction extends ChatInputCommandInteraction {
	member: GuildMember;
}

export interface errorOptions {
	message: string;
	title: string;
}

export namespace Command {
	export type Ctx = Module.Ctx;
	export type Interaction = BotInteraction;
	export type Options = ICommand;
}
