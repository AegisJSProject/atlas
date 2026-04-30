import { init, back, forward, reload } from '@aegisjsproject/atlas';

init('routes', { root: 'main', preload: true });
const sheet = new CSSStyleSheet();
const backButton = document.createElement('button');
const forwardButton = document.createElement('button');
const reloadButton = document.createElement('button');

backButton.textContent = 'Back';
backButton.addEventListener('click', () => back());

forwardButton.textContent = 'Forward';
forwardButton.addEventListener('click', () => forward());

reloadButton.textContent = 'Reload';
reloadButton.addEventListener('click', () => reload());

document.getElementById('nav').prepend(backButton, reloadButton, forwardButton);

sheet.replace(`@layer base {
	@media (prefers-reduced-motion: no-preference) {
		:root {
			view-transition-name: router-view;
		}

		::view-transition-old(router-view) {
			z-index: 0;
		}

		::view-transition-group(router-view) {
			animation: none;
			mix-blend-mode: normal;
		}

		::view-transition-new(router-view) {
			animation: reveal-circle 1600ms ease forwards;
			z-index: 1;
		}

		@keyframes reveal-circle {
			from {
				opacity: 0;
				clip-path: circle(0% at 50% 50%);
			}
			to {
				opacity: 1;
				clip-path: circle(150% at 50% 50%);
			}
		}
	}
}`);

document.adoptedStyleSheets = [sheet];
