import { ClientEvents } from 'discord.js';
import { Module } from './Module';

export abstract class Listener extends Module {
	public event: string;
	private listener: (...args: unknown[]) => void;
	public constructor(ctx: Module.Ctx, event: keyof ClientEvents) {
		super(ctx);

		this.event = event;
		this.listener = this.run.bind(this);
	}

	public abstract run?(...args: unknown[]): void;

	public start() {
		this.client.on(this.event, this.listener);
	}

	public stop() {
		this.client.removeListener(this.event, this.listener);
	}
}

export namespace Listener {
	export type Ctx = Module.Ctx;
}
