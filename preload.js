import { getRegistryKey, getRegistrySpecifier } from './routes.js';

function _loadLink(href, {
	relList = [],
	crossOrigin = 'anonymous',
	referrerPolicy = 'no-referrer',
	fetchPriority = 'auto',
	signal: passedSignal,
	as,
	integrity,
	media,
	type,
} = {}) {
	const { promise, resolve, reject } = Promise.withResolvers();
	const link = document.createElement('link');

	if (passedSignal instanceof AbortSignal && passedSignal.aborted) {
		reject(passedSignal.reason);
	} else if (typeof href !== 'string' && ! (href instanceof URL)) {
		reject(new TypeError(`Invalid href to preload: "${href}.`));
	} else {
		link.relList.add(...relList);

		if (typeof fetchPriority === 'string') {
			link.fetchPriority = fetchPriority;
		}

		if (typeof crossOrigin === 'string') {
			link.crossOrigin = crossOrigin;
		}

		if (typeof type === 'string') {
			link.type = type;
		}

		if (typeof media === 'string') {
			link.media = media;
		} else if (media instanceof MediaQueryList) {
			link.media = media.media;
		}

		if (typeof as === 'string') {
			link.as = as;
		}

		if (typeof integrity === 'string') {
			link.integrity = integrity;
		}

		if (link.relList.contains('preload') || link.relList.contains('modulepreload')) {
			const controller = new AbortController();
			const signal = passedSignal instanceof AbortSignal ? AbortSignal.any([controller.signal, passedSignal]) : controller.signal;

			if (passedSignal instanceof AbortSignal) {
				passedSignal.addEventListener('abort', ({ target }) => {
					reject(target.reason);
				}, { signal: controller.signal, once: true  });
			}

			link.referrerPolicy = referrerPolicy;

			link.addEventListener('load', () => {
				resolve();
				controller.abort();
			}, { signal });

			link.addEventListener('error', () => {
				reject(new DOMException(`Error loading ${href}`, 'NotFoundError'));
				controller.abort();
			}, { signal });

			link.href = href;

			document.head.append(link);

			return promise.catch(reportError).finally(() => link.isConnected && link.remove());
		} else {
			link.href = href;
			document.head.append(link);
			resolve();
			return promise;
		}
	}
}

function _handlePreloadMutations(target) {
	if (target instanceof MutationRecord) {
		_handlePreloadMutations(target.target);
	} else if (target.tagName === 'A' && ! target.classList.contains('no-router')) {
		preloadOnHover(target, target.dataset);
	} else {
		target.querySelectorAll('a:not(.no-router)').forEach(a => preloadOnHover(a, a.dataset));
	}
}

const preloadObserver = new MutationObserver(entries => entries.forEach(_handlePreloadMutations));

/**
 * Preloads a module asynchronously.
 *
 * @param {string} src - The URL or specifier to the module to preload.
 * @param {object} [options] - Optional options for the preload element.
 * @param {string} [options.crossOrigin="anonymous"] - The CORS mode to use when fetching the module. Defaults to 'anonymous'.
 * @param {string} [options.referrerPolicy="no-referrer"] - The referrer policy to use when fetching the module. Defaults to 'no-referrer'.
 * @param {string} [options.fetchPriority="low"] - The fetch priority for the preload request. Defaults to 'auto'.
 * @param {string} [options.as="script"] - The type of resource to preload. Defaults to 'script'.
 * @param {AbortSignal} [options.signal] - An AbortSignal to abort the preload request. Defaults to a 5-second timeout.
 * @param {string} [options.integrity] - A base64-encoded cryptographic hash of the resource
 * @returns {Promise<void>} A promise that resolves when the module is preloaded or rejects on error or signal is aborted.
 * @throws {Error} Throws if the signal is aborted or if an `error` event is fired on the preload.
 */
export async function preloadModule(src, {
	crossOrigin = 'anonymous',
	referrerPolicy = 'no-referrer',
	fetchPriority = 'low',
	as = 'script',
	signal,
	integrity,
} = {}) {
	await _loadLink(src, {
		relList: ['modulepreload'],
		crossOrigin, referrerPolicy, fetchPriority, as, signal, integrity,
	});
}

/**
 * Preloads a resource asynchronously.

 * @param {string|URL} href - The URL or specifier to the resource to preload.
 * @param {Object} [options] - Optional options for the preload element.
 * @param {string} [options.crossOrigin="anonymous"] - The CORS mode to use when fetching the resource. Defaults to 'anonymous'.
 * @param {string} [options.referrerPolicy="no-referrer"] - The referrer policy to use when fetching the resource. Defaults to 'no-referrer'.
 * @param {string} [options.fetchPriority="auto"] - The fetch priority for the preload request. Defaults to 'auto'.
 * @param {AbortSignal} [options.signal] - An AbortSignal to abort the preload request. Defaults to a 5-second timeout.
 * @param {string} [options.integrity] - A base64-encoded cryptographic hash of the resource
 * @param {string} [options.as] - The type of resource to preload.
 * @param {string} [options.type] - The MIME type of the resource to preload.
 * @param {(string|MediaQueryList)} [options.media] - A media query string or a MediaQueryList object.
 * @returns {Promise<void>} A promise that resolves when the resource is preloaded or rejects on error or signal is aborted.
 * @throws {Error} Throws if the signal is aborted or if an `error` event is fired on the preload.
 */
export async function preload(href, {
	crossOrigin = 'anonymous',
	referrerPolicy = 'no-referrer',
	fetchPriority = 'auto',
	signal,
	as,
	integrity,
	media,
	type,
} = {}) {

	await _loadLink(href, {
		relList: ['preload'],
		crossOrigin, referrerPolicy, fetchPriority, as, signal, type, media, integrity,
	});
}
/**
 * Preloads resources associated with an element or selector when hovered over, with optional configuration.
 *
 * @param {string|HTMLElement} target - A CSS selector string or an HTMLElement that triggers preloading.
 * @param {object} [options={}] - Configuration options for preloading.
 * @param {string} [options.crossOrigin='anonymous'] - The cross-origin attribute for the request, useful for fetching from other origins.
 * @param {string} [options.referrerPolicy='no-referrer'] - The referrer policy to apply to the request.
 * @param {string} [options.fetchPriority='high'] - The priority level of the fetch operation.
 * @param {AbortSignal} [options.signal] - Optional signal to abort the preload operation if needed.
 * @returns {Promise<void>} A promise that resolves once preloading completes.
 * @throws {TypeError} Throws if the target is not a valid selector or an HTMLElement with a valid `href` attribute.
 */
export async function preloadOnHover(target, {
	crossOrigin = 'anonymous',
	referrerPolicy = 'no-referrer',
	fetchPriority = 'high',
	signal,
} = {}) {
	const { resolve, reject, promise } = Promise.withResolvers();

	if (typeof target === 'string') {
		await Promise.all(Array.from(
			document.querySelectorAll(target),
			link => preloadOnHover(link)
		)).then(resolve, reject);
	} else if (
		target instanceof HTMLElement
		&& ! target.classList.contains('no-router')
		&& typeof target.href === 'string'
		&& target.origin === location.origin
		&& target.download.length === 0
		&& URL.canParse(target.href)
	) {
		target.addEventListener('mouseover', async ({ currentTarget }) => {
			const pattern = getRegistryKey(currentTarget.href);

			if (pattern instanceof URLPattern) {
				await preloadModule(getRegistrySpecifier(pattern), {
					fetchPriority,
					referrerPolicy,
					crossOrigin,
					integrity: currentTarget.dataset.integrity,
					signal,
				});
				resolve();
			} else {
				await preload(currentTarget.href, {
					fetchPriority,
					crossOrigin,
					referrerPolicy,
					as: currentTarget.dataset.preloadAs ?? 'fetch',
					type: currentTarget.dataset.preloadType ?? 'text/html',
					integrity: currentTarget.dataset.integrity,
					signal,
				});
				resolve();
			}
		}, { once: true, passive: true, signal });
	} else {
		resolve();
	}

	await promise;
}

/**
 * Adds `mouseenter` listeners to preload links/handlers via a `MutationObserver`
 *
 * @param {HTMLElement|ShadowRoot|string} target Target for the mutation observer or its selector
 * @param {HTMLElement|ShadowRoot} [base=document] The element to query from if `target` is a selector
 */
export function observePreloadsOn(target, base = document.documentElement) {
	if (typeof target === 'string') {
		observePreloadsOn(base.querySelector(target));
	} else if (target instanceof HTMLElement || target instanceof ShadowRoot) {
		preloadObserver.observe(target, { childList : true, subtree: true });
		_handlePreloadMutations(target);
	} else {
		throw new TypeError('`observePreloadsOn` requires a selector or HTMLElement or ShadowRoot.');
	}
}
