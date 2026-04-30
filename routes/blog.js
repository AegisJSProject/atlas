/**
 *
 * @param {Request} req
 * @param {import('../atlas').RouteContextObject} context
 * @returns {HTMLPreElement}
 */
export default async function handler(req, context) {
	const pre = document.createElement('pre');
	const code = document.createElement('code');
	context.stack.defer(() => console.log('Disposed'));
	context.signal.addEventListener('abort', console.log, { once: true });

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

export const description = ({
	params: { year = '2026', month = '01', day = '01' } = {},
}) => {
	const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0);

	return `Post from ${date.toLocaleDateString()}`;
};

export const title = ({
	params: { slug = 'Untitled Post' } = {},
}) => slug.charAt(0).toUpperCase() + slug.substring(1).replaceAll(/-+([a-z])/g, (_, c) => ' ' + c.toUpperCase());
