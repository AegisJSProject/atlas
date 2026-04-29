# `@aegisjsproject/atlas`

A client-side router library using `Navigation` & `URLPattern`

[![CodeQL](https://github.com/AegisJSProject/atlas/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/AegisJSProject/atlas/actions/workflows/codeql-analysis.yml)
![Node CI](https://github.com/AegisJSProject/atlas/workflows/Node%20CI/badge.svg)
![Lint Code Base](https://github.com/AegisJSProject/atlas/workflows/Lint%20Code%20Base/badge.svg)

[![GitHub license](https://img.shields.io/github/license/AegisJSProject/atlas.svg)](https://github.com/AegisJSProject/atlas/blob/master/LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/AegisJSProject/atlas.svg)](https://github.com/AegisJSProject/atlas/commits/master)
[![GitHub release](https://img.shields.io/github/release/AegisJSProject/atlas?logo=github)](https://github.com/AegisJSProject/atlas/releases)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/shgysk8zer0?logo=github)](https://github.com/sponsors/shgysk8zer0)

[![npm](https://img.shields.io/npm/v/@aegisjsproject/atlas)](https://www.npmjs.com/package/@aegisjsproject/atlas)
![node-current](https://img.shields.io/node/v/@aegisjsproject/atlas)
![npm bundle size gzipped](https://img.shields.io/bundlephobia/minzip/@aegisjsproject/atlas)
[![npm](https://img.shields.io/npm/dw/@aegisjsproject/atlas?logo=npm)](https://www.npmjs.com/package/@aegisjsproject/atlas)

[![GitHub followers](https://img.shields.io/github/followers/AegisJSProject.svg?style=social)](https://github.com/shgysk8zer0)
![GitHub forks](https://img.shields.io/github/forks/AegisJSProject/atlas.svg?style=social)
![GitHub stars](https://img.shields.io/github/stars/AegisJSProject/atlas.svg?style=social)
[![Twitter Follow](https://img.shields.io/twitter/follow/shgysk8zer0.svg?style=social)](https://twitter.com/shgysk8zer0)

[![Donate using Liberapay](https://img.shields.io/liberapay/receives/shgysk8zer0.svg?logo=liberapay)](https://liberapay.com/shgysk8zer0/donate "Donate using Liberapay")
- - -

- [Code of Conduct](./.github/CODE_OF_CONDUCT.md)
- [Contributing](./.github/CONTRIBUTING.md)
<!-- - [Security Policy](./.github/SECURITY.md) -->

## Overview

This router intercepts same-origin navigations and resolves them to registered route modules. Each module can return content in multiple native formats (e.g. `Response`, `Document`, `Element`), allowing flexibility without imposing rendering constraints.

Key characteristics:

- Native Navigation API (`navigation`)
- Route-to-module mapping via dynamic `import()`
- Direct DOM updates (no diffing layer)
- Supports HTML streaming via `Response`
- Built-in metadata handling (title, description, styles)
- Optional preload observation
- Abort-safe lifecycle with `AbortController` and `DisposableStack`

> [!IMPORTANT]
> This requires the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API), which is Baseline 2026.
> It also creates a [Trusted Types Policy](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API), where supported,
> labeled `"aegis-atlas#html"` for handling HTML responses without sanitizer restrictions.

> [!TIP]
> Route module specifiers can use bare specifiers like `@acme/blog`. These can be resolved via an import map, for example:
>
> ```html
> <script type="importmap">
> {
>   "imports": {
>     "@acme/blog": "https://cdn.example.com/acme-blog/index.js"
>   }
> }
> </script>
> ```
>
> This allows modules to be loaded from a CDN without changing route definitions.
---

## Installation

This module is intended to be used directly in modern browser environments.

```js
import { init } from '@aegisjsproject/atlas';
```

No dependencies required.

---

## Core Concepts

### Route Modules

Each route resolves to a module with the following shape:

```js

export default async function handler(request, context) {
	return new Response('<h1>Hello</h1>', {
		headers: { 'Content-Type': 'text/html' }
	});
}

export const title = 'Page Title';

export const description = 'Page description';

export const styles = new CSSStyleSheet();
```

#### Supported Exports

- `default` (required)
  - Function: `(Request, RouteContextObject) => HandlerResult`
  - Or static value: `HandlerResult`
- `title` (optional)
- `description` (optional)
- `styles` (optional: `CSSStyleSheet` or array)

---

### Handler Return Types

Handlers may return:
- `Response` (must be `text/html`)
- `HTMLDocument`
- `Element`
- `DocumentFragment`
- `URL` (triggers navigation)
---

### Route Context

Each handler receives a `context` object:

```js
{

	result,        // URLPatternResult
	params,        // extracted route params
	stack,         // DisposableStack
	controller,    // AbortController
	signal,        // AbortSignal
	type,          // navigation type
	url,           // URL instance
	state,         // navigation state
	info,          // navigation info
	timestamp      // performance timestamp
}

```

---

## Usage

### Initialize Router

```js

init({
	'/': '/routes/home.js',
	'/users/:id': '/routes/user.js'
	'/posts/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug': '@acme/blog',
	'/product/:sku': '@acme/store/product',
}, {
	root: 'app',
	preload: true
});

```

#### Options

- `root`: Element or element ID where content is rendered
- `preload`: Enable preload observation
- `signal`: Optional `AbortSignal` for teardown

---

### Navigation Helpers

```js

import { navigate, back, forward, reload } from './router.js';

navigate('/about');
back();
forward();
reload();
```

---

### Navigation Lifecycle

Wait for navigation completion:

```js
import { whenLoaded } from './router.js';

await whenLoaded();
```

---

## Behavior Details

### Interception Rules

Navigation is intercepted only if:

- `event.canIntercept` is true
- URL is same-origin
- Triggering element does **not** have `.no-router`

---

### Content Handling

#### `Response`

- Must be `text/html`
- Parsed via `Document.parseHTMLUnsafe`
- Re-processed as `HTMLDocument`

#### `HTMLDocument`

- Updates:
  - `document.title`
  - meta description
  - root content

#### `Element` / `DocumentFragment`

- Directly replaces root children

#### `URL`

- Triggers navigation

---

### Root Management

```js

setRoot('app');

// or

setRoot(document.getElementById('app'));

```

If root is `<body>`, full body is replaced.  

If root is an element with `id`, only matching subtree is replaced.

---

### Metadata Updates

Route modules can define:

- `title` → updates `document.title`
- `description` → updates all matching meta tags:
  - `name="description"`
  - `og:description`
  - `twitter:description`
- `styles` → appended to `document.adoptedStyleSheets`

---

### Form Handling

- Automatically determines method (`GET` or `POST`)
- Submits `FormData` when applicable
- Uses `Request` API for consistency

---

### Abort + Cleanup

Each navigation:

- Uses `AbortController`
- Combines signals via `AbortSignal.any`
- Cleans up via `DisposableStack`

Handlers should respect `context.signal` where applicable.

---

### Trusted Types

If supported, a Trusted Types policy is used to safely pass HTML into:

```js

Document.parseHTMLUnsafe(...)

```

This ensures CSP compatibility without stripping critical markup like:

- `<iframe>`
- inline event handlers
- form attributes

---

## Example Route

```js

export default async function(request, { params }) {
	return new Response(`
		<h1>User ${params.id}</h1>
	`, {
		headers: { 'Content-Type': 'text/html' }
	});
}

export const title = 'User Profile';
export const description = 'User details page';

```

---

## Notes

- Only `text/html` responses are supported for `Response`
- Non-matching routes fall back to `fetch()`
- Errors during routing are surfaced via `reportError`
- Designed for modern browsers with Navigation API support

---

## Summary

This router provides a low-level, high-control alternative to framework routers by:

- Eliminating abstraction layers
- Leveraging native platform APIs
- Supporting flexible content types
- Maintaining strict control over navigation lifecycle

Intended for environments where performance, control, and minimal overhead are priorities.
