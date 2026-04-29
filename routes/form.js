/**
 *
 * @param {Request} req
 * @param {import('../atlas').RouteContextObject} context
 * @returns {HTMLPreElement}
 */
async function handler(req, context) {
	const pre = document.createElement('pre');
	const code = document.createElement('code');

	code.textContent = JSON.stringify({
		req: {
			url: req.url,
			method: req.method,
			body: req.method !== 'GET' ? Object.fromEntries(await req.formData()) : null,
			headers: Object.fromEntries(req.headers),
		},
		context,
	}, null, 4);

	pre.append(code);
	return pre;
};

export default handler;
