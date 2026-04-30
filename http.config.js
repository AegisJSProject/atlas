import { imports } from '@shgysk8zer0/importmap';
import { addTrustedTypePolicy, addScriptSrc, useDefaultCSP } from '@aegisjsproject/http-utils/csp.js';

addScriptSrc(
	'https://unpkg.com/@aegisjsproject/',
	'https://unpkg.com/@shgysk8zer0/',
);

addTrustedTypePolicy('aegis-atlas#html', 'aegis-sanitizer#html');

export default {
	routes: {
		'/': '@aegisjsproject/dev-server',
		'/favicon.svg': '@aegisjsproject/dev-server/favicon',
		'/posts/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug': '@aegisjsproject/dev-server',
		'/search': '@aegisjsproject/dev-server',
	},
	open: true,
	requestPreprocessors: [
		'@aegisjsproject/http-utils/request-id.js',
	],
	responsePostprocessors: [
		'@aegisjsproject/http-utils/compression.js',
		'@aegisjsproject/http-utils/cors.js',
		useDefaultCSP(),
		(response, { request }) => {
			if (request.destination === 'document') {
				response.headers.append('Link', `<${imports['@shgysk8zer0/polyfills']}>; rel="preload"; as="script"; fetchpriority="high"; crossorigin="anonymous"; referrerpolicy="no-referrer"`);
			}
		},
	],
};
