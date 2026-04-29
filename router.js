import { registerModule, lookupRoute } from './routes.js';
import { observePreloadsOn } from './preload.js';

/**
 * This is necessary since an HTML response from a same-origin
 * request should result in the same document state as if
 * it were initial load. CSP/Trusted Types requires `TrustedHTML`
 * for `Document.parseHTMLUnsage` (or `innerHTML`), and `setHTML()`
 * would filter out any `<iframe>` or `onclick` or `<form action>`.
 */
const policy = 'trustedTypes' in globalThis
	? trustedTypes.createPolicy('aegis-atlas#html', {
		createHTML(input) {
			return input;
		}
	}) : Object.freeze({
		createHTML(input) {
			return input;
		}
	});

const DESC_SELECTOR = 'meta[name="description"], meta[itemprop="description"], meta[property="og:description"], meta[name="twitter:description"]';

/**
 * @typedef RouteContextObject
 * @property {URLPatternResult} result
 * @property {Record<string, string>} params
 * @property {DisposableStack} stack
 * @property {AbortController} controller
 * @property {AbortSignal} signal
 * @property {NavigationType} type
 * @property {URL} url
 * @property {any} state
 * @property {any} info
 * @property {number} timestamp
 * @readonly
 */

/** @typedef {Response|DocumentFragment|Element|HTMLDocument|URL} HandlerResult */
/** @typedef {(request: Request, context: RouteContextObject) => Promise<HandlerResult>} RouteHandler */

/** @typedef {Readonly<Record<string, unknown>> & {default?: RouteHandler|HandlerResult, title?: string, description?: string, styles?: CSSStyleSheet|CSSStyleSheet[]}} Module */

/**
 * @type HTMLElement
 */
let root = document.body;

/**
 *
 * @param {string|HTMLElement} newRoot
 * @param {DocumentOrShadowRoot} base
 */
export function setRoot(newRoot, base = document) {
	if (typeof newRoot === 'string') {
		setRoot(base.getElementById(newRoot));
	} else if (newRoot instanceof HTMLElement) {
		root = newRoot;
	} else {
		throw new TypeError('New root must be an `Element` or `id` of an element.');
	}
}

/**
 *
 * @param {HTMLFormElement|HTMLButtonElement|HTMLAnchorElement} source
 * @returns {"GET"|"POST"}
 */
function getRequestMethod(source) {
	if (! (source instanceof HTMLElement) || source instanceof HTMLAnchorElement) {
		return 'GET';
	} else if (source instanceof HTMLFormElement) {
		return source.method.toUpperCase();
	} else if (! (source instanceof HTMLButtonElement)) {
		return 'GET';
	} else if (source.hasAttribute('formmethod') && source.formMethod.length !== 0) {
		return source.formMethod.toUpperCase();
	} else if (source.form instanceof HTMLFormElement) {
		return source.form.method.toUpperCase();
	} else {
		console.warn('Not sure this should be possible...');
		return 'GET';
	}
}

/**
 *
 * @param {NavigationEvent} event
 */
export async function handleNavigation(event) {
	if (! (event instanceof NavigateEvent)) {
		throw new TypeError('Not a navigation event.');
	} else if (event.signal.aborted) {
		throw event.signal.reason;
	} else {
		const method = getRequestMethod(event.sourceElement);
		const request = new Request(event.destination.url, {
			// `sourceElement` could be a form, a `<button type="submit">`, or an `<a>
			method: method,
			body: method === 'GET' ? undefined : event.formData,// ?? new FormData(event.sourceElement?.form ?? event.sourceElement),
			signal: event.signal,
		});

		const { result, specifier, hasRegExpGroups } = lookupRoute(event.destination.url);

		if (typeof specifier !== 'string' || result === null) {
			const resp = await fetch(request);
			await updateContent(resp);
		} else {
			const params = hasRegExpGroups ? {
				...result.protocol.groups, ...result.username.groups, ...result.password.groups, ...result.hostname.groups,
				...result.port.groups, ...result.pathname.groups, ...result.search.groups, ...result.hash.groups,
			}: {};

			delete params['0'];
			const module = await import(specifier);
			const stack = new DisposableStack();
			const controller = stack.adopt(
				new AbortController(),
				controller => controller.abort(new DOMException('Stack was disposed.', 'AbortError')),
			);

			const timestamp = performance.now();
			const signal = AbortSignal.any([controller.signal, request.signal]);

			/**
			 * @type {RouteContextObject}
			 */
			const context = Object.freeze({
				timestamp,
				stack,
				controller,
				type: event.navigationType,
				state: event.destination.getState(),
				info: event.info,
				url: new URL(event.destination.url),
				signal,
				result,
				params,
			});

			try {
				return await handleRequestModule(request, context, module);
			} catch(err) {
				reportError(err);
			} finally {
				stack.dispose();
			}
		}
	}
}

/**
 *
 * @param {unknown} routes
 * @param {object} config
 * @param {HTMLElement|string} [config.root]
 * @param {boolean} [config.preload=false]
 * @param {AbortSignal} [config.signal]
 */
export function init(routes, {
	root,
	preload = false,
	signal,
} = {}) {
	if (typeof routes === 'string') {
		init(JSON.parse(document.scripts.namedItem(routes).innerHTML), { root, preload, signal });
	} else if (typeof routes === 'number') {
		init(JSON.parse(document.scripts.item(routes).innerHTML), { root, preload, signal });
	} else if (routes instanceof HTMLScriptElement) {
		init(JSON.parse(routes.textContent), { root, preload, signal });
	} else if (typeof routes === 'object') {
		Object.entries(routes).forEach(([key, val]) => registerModule(key, val));

		if (typeof root === 'string' || root instanceof HTMLElement) {
			setRoot(root);
		}

		navigation.addEventListener('navigate', event => {
			if (event.canIntercept && event.destination.url.startsWith(location.origin) && ! event.sourceElement?.classList?.contains?.('no-router')) {
				event.intercept({ handler: () => handleNavigation(event) });
			}
		}, { signal });

		if (preload) {
			observePreloadsOn(document.body);
		}
	} else {
		throw new TypeError(`Routes must be an object, \`<script>\`, or name/index of \`document.scripts\`. Got a ${typeof routes}.`);
	}
}

/**
 *
 * @param {object} options
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<NavigationHistoryEntry>}
 */
export async function whenLoaded({ signal } = {}) {
	const { resolve, reject, promise } = Promise.withResolvers();

	if (signal?.aborted) {
		reject(signal.reason);
	} else {
		const controller = new AbortController();
		const opts = {
			once: true,
			signal: signal instanceof AbortSignal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
		};

		navigation.addEventListener('navigatesuccess', () => {
			resolve(navigation.currentEntry);
			controller.abort();
		}, opts);

		navigation.addEventListener('navigateerror', event => {
			reject(event.error);
			controller.abort();
		}, opts);

		if (signal instanceof AbortSignal) {
			signal.addEventListener('abort', ({ target }) => {
				reject(target.reason);
				controller.abort(target.reason);
			}, { once: true, signal: controller.signal });
		}
	}

	return promise;
}

/**
 *
 * @param {string|URL} newURL
 * @param {NavigationOptions} options
 * @returns {NavigationResult}
 */
export const navigate = (newURL, options) => navigation.navigate(newURL, options);

/**
 *
 * @param {NavigationOptions} options
 * @returns {NavigationResult}
 */
export const back = (options) => navigation.back(options);

/**
 *
 * @param {NavigationOptions} options
 * @returns {NavigationResult}
 */
export const forward = (options) => navigation.forward(options);

/**
 *
 * @param {NavigationReloadOptions} options
 * @returns {NavigationResult}
 */
export const reload = (options) => navigation.reload(options);

/**
 *
 * @param {Request} request
 * @param {RouteContextObject} context
 * @param {Module} module
 */
async function handleRequestModule(request, context, module) {
	if (typeof module.default === 'undefined') {
		throw new TypeError(`No default export in module for <${request.url}>.`);
	} else if (typeof module.default === 'function') {
		const result = await module.default(request, context);
		await updateContent(result);
		updateMeta(module);
	} else {
		await updateContent(module.default);
		updateMeta(module);
	}
}

function updateMeta({ title, description, styles }) {
	if (typeof title === 'string') {
		document.title = title;
	}

	if (typeof description === 'string') {
		setDescription(description);
	}

	if (styles instanceof CSSStyleSheet) {
		document.adoptedStyleSheets = [...document.adoptedStyleSheets, styles];
	} else if (Array.isArray(styles) && styles.length !== 0) {
		document.adoptedStyleSheets = [...document.adoptedStyleSheets, ...styles];
	}
}

/**
 *
 * @param {HandlerResult} content
 */
async function updateContent(content) {
	if (content instanceof URL) {
		navigate(content);
	} else if (content instanceof Response) {
		if (! content.ok) {
			throw new DOMException(`${content.url} [${content.status}]`, 'NetworkError');
		} else if (! content.headers.get('Content-Type')?.startsWith?.('text/html')) {
			throw new TypeError(`Unsupported Content-Type for <${content.url}> - "${content.headers.get('Content-Type') ?? 'Unset'}".`);
		} else {
			const html = await content.text();
			/** @type HTMLDocument */
			const doc = Document.parseHTMLUnsafe(policy.createHTML(html)); // Unsafe, but necessary... Same-origin at least
			await updateContent(doc);
		}
	} else if (content instanceof Element || content instanceof DocumentFragment) {
		root.replaceChildren(content);
	} else if (content instanceof HTMLDocument) {
		document.title = content.title;
		setDescription(content.head.querySelector(DESC_SELECTOR)?.content);

		if (root instanceof HTMLBodyElement) {
			root.replaceChildren(...content.body.childNodes);
		} else if (root instanceof HTMLElement && typeof root.id === 'string') {
			root.replaceChildren(...content.getElementById(root.id)?.childNodes ?? []);
		} else {
			throw new TypeError('Root must be `<body>` or an element with an `id`.');
		}
	} else {
		throw new TypeError('Content must be an `Element`, `DocumentFragment`, `HTMLDocument`, or `Response`.');
	}
}

/**
 *
 * @param {string} description
 */
function setDescription(description = '') {
	document.head.querySelectorAll(DESC_SELECTOR).forEach(el => el.content = description);
}
