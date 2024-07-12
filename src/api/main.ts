import { BotClient } from '../lib/structures/BotClient';
import fastify from 'fastify';

export default async (client: BotClient) => {
	const app = fastify({ logger: false });
	const { port, host } = client.config.Tickets.Transcripts;

	app.get('/transcripts/:channelId', async (req, rep) => {
		rep.header('Access-Control-Allow-Origin', '*');
		const { channelId } = req.params as Data;
		if (!channelId)
			return rep.code(400).send({ error: 'Missing query parameters. The channelId parameter is required. Example: /transcripts/<channelId>' });

		const transcript = await client.prisma.transcript.findUnique({ where: { Id: channelId } });
		if (!transcript) return rep.code(404).send({ error: 'Channel not found.' });

		rep.header('Content-Type', 'text/html');
		return transcript.data;
	});

	app.listen({ host, port }, (err, address) => {
		if (err) client.logger.error(err);

		console.log(`🚀 Listening on ${address}`);
	});
};

interface Data {
	channelId: string;
}

/**
 * @credits Duro#5232
 */
