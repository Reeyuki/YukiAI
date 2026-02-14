import { initializeApp } from './static/init/initialization.js';
import { setupEventListeners } from './static/handlers/eventHandlers.js';

window.addEventListener('DOMContentLoaded', async () => {
	try {
		await initializeApp();
		setupEventListeners();
	} catch (error) {
		console.error('Failed to initialize application:', error);
	}
});

window.addEventListener('beforeunload', () => {
	const { appState } = require('./static/state/appState.js');
	appState.cleanup();
});
