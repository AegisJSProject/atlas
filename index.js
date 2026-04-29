import { init, back, forward, reload } from '@aegisjsproject/atlas';

init({
	'/posts/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug': '/routes/blog.js',
	'/search': '/routes/form.js',
}, { root: 'main', preload: true });

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
