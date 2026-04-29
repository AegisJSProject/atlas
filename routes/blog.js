/**
 *
 * @param {Request} req
 * @param {import('../atlas').RouteContextObject} context
 * @returns {HTMLPreElement}
 */
async function handler(req, context) {
	const pre = document.createElement('pre');
	const code = document.createElement('code');

	const date = new Date(
		parseInt(context.params.year),
		Math.max(parseInt(context.params.month) - 1, 0),
		parseInt(context.params.day),
		0,
		0,
		0,
		0
	).toLocaleDateString();

	code.textContent = JSON.stringify({
		req: {
			url: req.url,
			method: req.method,
			body: req.method !== 'GET' ? Object.fromEntries(await req.formData()) : null,
			headers: Object.fromEntries(req.headers),
		},
		context,
		date,
	}, null, 4);

	pre.append(code);
	return pre;
};

export default handler;
