import { Embeds } from '../utils/Embeds';
import { Utils } from '../utils/Utils';
import { BotClient } from './BotClient';

export class Module {
	public client: BotClient;
	public path: string;
	public directory: string;
	public embeds: Embeds;
	public utils: Utils;
	constructor(ctx: Context) {
		this.client = ctx.client;
		this.path = ctx.path;
		this.directory = ctx.directory;
		this.embeds = new Embeds(ctx.client);
		this.utils = new Utils(ctx.client);
	}
}

export interface Context {
	client: BotClient;
	path: string;
	directory: string;
}

export namespace Module {
	export type Ctx = Context;
}
