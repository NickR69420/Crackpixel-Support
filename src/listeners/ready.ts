import chalk from 'chalk';
import { Listener } from '../lib/structures/Listener';

export default class Ready extends Listener {
	constructor(ctx: Listener.Ctx) {
		super(ctx, 'ready');
	}

	public async run() {
		this.log();
		await this.client.registerCommands();
	}

	private log() {
		console.log(
			chalk.blue(`
 _______  ______    _______  _______  ___   _  _______  ___   __   __  _______  ___     
|       ||    _ |  |   _   ||       ||   | | ||       ||   | |  |_|  ||       ||   |    
|       ||   | ||  |  |_|  ||       ||   |_| ||    _  ||   | |       ||    ___||   |    
|       ||   |_||_ |       ||       ||      _||   |_| ||   | |       ||   |___ |   |    
|      _||    __  ||       ||      _||     |_ |    ___||   |  |     | |    ___||   |___ 
|     |_ |   |  | ||   _   ||     |_ |    _  ||   |    |   | |   _   ||   |___ |       |
|_______||___|  |_||__| |__||_______||___| |_||___|    |___| |__| |__||_______||_______|  TICKETS \n\n\n`),
			chalk.cyan(`${this.client.user.tag} logged in.`)
		);

		
	}
}
