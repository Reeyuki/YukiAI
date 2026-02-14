import { appState } from '../state/appState.js';
import { $ } from '../utils/dom.js';

export function initSettings() {
	const settingsButton = $('settingsButton');
	const settingsMenu = $('settingsMenu');
	const closeSettingsButton = $('closeSettingsButton');
	const savePromptButton = $('savePromptButton');
	const systemPrompt = $('systemPrompt');
	if (
		!settingsButton ||
		!settingsMenu ||
		!closeSettingsButton ||
		!savePromptButton ||
		!systemPrompt
	)
		return;

	settingsButton.style.zIndex = '9999';
	settingsButton.style.pointerEvents = 'auto';
	closeSettingsButton.style.zIndex = '9999';
	closeSettingsButton.style.pointerEvents = 'auto';

	settingsButton.addEventListener('click', () => {
		settingsMenu.classList.remove('hidden');
	});

	closeSettingsButton.addEventListener('click', () => {
		settingsMenu.classList.add('hidden');
	});

	settingsMenu.addEventListener('click', e => {
		if (e.target === settingsMenu) {
			settingsMenu.classList.add('hidden');
		}
	});

	const savedPrompt = localStorage.getItem('systemPrompt');
	if (savedPrompt) {
		systemPrompt.value = savedPrompt;
		appState.systemMessage = savedPrompt;
	}

	savePromptButton.addEventListener('click', () => {
		const promptValue = systemPrompt.value.trim();
		appState.systemMessage = promptValue;
		localStorage.setItem('systemPrompt', promptValue);

		// Visual feedback
		const originalText = savePromptButton.innerHTML;
		savePromptButton.innerHTML = `<i class="fas fa-check"></i> Saved!`;
		savePromptButton.classList.add('bg-green-600', 'hover:bg-green-700');
		savePromptButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');

		setTimeout(() => {
			savePromptButton.innerHTML = originalText;
			savePromptButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
			savePromptButton.classList.remove(
				'bg-green-600',
				'hover:bg-green-700'
			);
		}, 1200);
	});
}
