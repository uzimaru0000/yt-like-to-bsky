import { Hono } from 'hono';
import { env } from 'hono/adapter';
import { parser, validate } from './websub';
import { createClient, createLinkText, getOGImage } from './bsky';

const hono = new Hono();

hono.get('/', (c) => {
	return c.json({ message: 'running' });
});

hono.get('/feed', (c) => {
	const challenge = c.req.query('hub.challenge');
	if (!challenge) {
		return c.json({ message: 'No challenge' }, 400);
	}

	return c.text(challenge);
});
hono.post('/feed', async (c) => {
	const sign = c.req.header('x-hub-signature');
	if (!sign) {
		console.error('no signature');
		return c.text('success');
	}

	const secret = env<{ SECRET: string }>(c).SECRET;
	const body = await c.req.text();
	const isValid = await validate(sign, body, secret);
	if (!isValid) {
		console.error('invalid signature');
		return c.text('success');
	}

	const data = await parser(body);

	try {
		const { ID, PASS } = env<{ ID: string; PASS: string }>(c);

		const client = await createClient(ID, PASS);
		const og = await getOGImage(data.rss.channel.item.link);

		const media = og
			? await client.uploadBlob(og.image, {
					encoding: 'image/jpeg',
			  })
			: null;
		const text = await createLinkText(client, data.rss.channel.item.title, data.rss.channel.item.link);

		await client.post({
			$type: 'app.bsky.feed.post',
			text: text.text,
			facets: text.facets,
			...(og && media
				? {
						embed: {
							$type: 'app.bsky.embed.external',
							external: {
								uri: data.rss.channel.item.link,
								thumb: {
									$type: 'blob',
									ref: {
										$link: media.data.blob.ref.toString(),
									},
									mimeType: media.data.blob.mimeType,
									size: media.data.blob.size,
								},
								title: og.title,
								description: og.description,
							},
						},
				  }
				: {}),
		});
	} catch (e) {
		console.error(e);
		// ignore
	}

	return c.text('success');
});

const scheduled: ExportedHandlerScheduledHandler = async () => {
	await fetch('https://pubsubhubbub.appspot.com/publish', {
		headers: {
			'cache-control': 'max-age=0',
			'content-type': 'application/x-www-form-urlencoded',
		},
		body: 'hub.mode=publish&hub.url=https%3A%2F%2Fzapier.com%2Fengine%2Frss%2F7562224%2Fuzimaru-youtube-likes',
		method: 'POST',
	});
};

export default {
	fetch: hono.fetch,
	scheduled,
}
