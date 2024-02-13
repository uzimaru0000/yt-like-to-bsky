export const getOGData = async (res: Response) => {
	const ogTags: Record<string, string> = {};
	await new HTMLRewriter()
		.on('meta[property^="og:"]', {
			element(element) {
				const property = element.getAttribute('property');
				const content = element.getAttribute('content');

				if (property && content) {
					ogTags[property] = content;
				}
			},
		})
		.transform(res)
		.text();

	return ogTags;
};
