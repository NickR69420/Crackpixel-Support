import { Command } from './Command';
import { client } from '../../index';

export class Err {
	public type: Errs;
	public err?: any;
	public cmd?: Command;
	public interaction?: Command.Interaction;
	public message?: string;
	private client = client;
	constructor(options: ErrOptions) {
		this.type = options.type;
		this.err = options.err ?? 'An Error Occured';
		this.cmd = options.cmd ?? null;
		this.interaction = options.interaction ?? null;
		this.message = options.message ?? 'Something went wrong...';

		if (this.type == 'global' && this.err) this.log(this.err);
		if (this.type == 'command') this.CommandError();
	}

	public static send(options: ErrResponse): ErrResponse {
		if (options.log) console.error(new Error(`[${options.title}] ${options.message}`));

		return {
			message: options.message,
			title: options.title,
		};
	}

	private CommandError() {
		if (!this.cmd || !this.interaction) return this;

		this.cmd
			.reply(this.interaction, {
				embeds: [this.client.embeds.error(this.message, this.err)],
				ephemeral: true,
			})
			.catch(() => {});

		return this;
	}

	private log(err: any) {
		if (typeof err === 'string') err = new Error(err);

		this.client.logger.error(err);
		return this;
	}
}

type Errs = 'command' | 'global';

export interface ErrOptions {
	type: Errs;
	err?: any;
	cmd?: Command;
	interaction?: Command.Interaction;
	message?: string;
}

interface ErrResponse {
	title: string;
	message: string;
	log?: boolean;
}

export namespace Err {
	export type Options = ErrOptions;
	export type Errors = Errs;
	export type Res = ErrResponse;
}
