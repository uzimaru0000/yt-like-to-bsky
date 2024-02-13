import { BskyAgent, RichText } from '@atproto/api';
import 'jimp/browser/lib/jimp.js'
import { getOGData } from './og';

export const createClient = async (identifier: string, password: string) => {
	const agent = new BskyAgent({ service: 'https://bsky.social' });
	await agent.login({ identifier, password });

	return agent;
};

export const createLinkText = async (client: BskyAgent, title: string, url: string) => {
	const rt = new RichText({ text: `${title}\n${url}` });
	await rt.detectFacets(client);

	return rt;
};

export const getOGImage = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) {
		return null;
	}

	const ogData = await getOGData(res);

	const ogImage = ogData['og:image'];
	if (!ogImage) {
		return null;
	}

	const image = await Jimp.read(ogImage);
	image.resize(800, Jimp.AUTO);

	const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);

	return {
		description: ogData['og:description'],
		title: ogData['og:title'],
		image: buffer,
	};
};
