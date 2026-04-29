/**
 * @type {Map<URLPattern, string>}
 */
const reg = new Map();

/**
 * @typedef RouteMatch
 * @property {URLPatternResult|null} result The results of `pattern.exec(url)`
 * @property {string|null} specifier The module specifier mapped to the URL
 * @property {boolean} hasRegExpGroups
 * @readonly
 */

/**
 * @type RouteMatch
 */
const invalidMatchResult = Object.freeze({ result: null, specifier: null, hasRegExpGroups: false });

/**
 * Finds the URLPattern that corresponds to the given URL
 *
 * @param {string} url
 * @returns {URLPattern|undefined}
 */
export const getRegistryKey = url => reg.keys().find(pattern => pattern.test(url));

/**
 *
 * @param {URLPattern} key
 * @returns {string|null} The module specifier
 */
export const getRegistrySpecifier = key => reg.get(key);

/**
 *
 * @param {string} url
 * @returns {RouteMatch}
 */
export function lookupRoute(url) {
	const key = getRegistryKey(url);

	if (key instanceof URLPattern) {
		return Object.freeze({
			result: key.exec(url),
			specifier: reg.get(key),
			hasRegExpGroups: key.hasRegExpGroups,
		});
	} else {
		return invalidMatchResult;
	}
}

/**
 * Registers module `specifier` to handle routes matching `pattern`
 *
 * @param {string|URLPattern} pattern The pattern to handle
 * @param {string|URL} specifier The module to register to the pattern
 */
export function registerModule(pattern, specifier) {
	if (typeof specifier !== 'string' && ! (specifier instanceof URL)) {
		throw new TypeError(`Invalid specifier type ${typeof specifier}.`);
	} else if (typeof pattern === 'string') {
		reg.set(
			URL.canParse(pattern) ? new URLPattern(pattern) : new URLPattern({ pathname: pattern }),
			specifier.toString()
		);
	} else if (! (pattern instanceof URLPattern)) {
		throw new TypeError(`Invalid pattner "${pattern}".`);
	} else if (specifier instanceof URL) {
		reg.set(pattern, specifier.href);
	} else  {
		reg.set(pattern, specifier);
	}
}
