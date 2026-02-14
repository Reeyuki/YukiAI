import { $ce, $empty } from '../utils/dom.js';
import { getElement, initializeElements } from '../utils/elements.js';
import { appState } from '../state/appState.js';
import { fetchChannelsAndModels } from '../services/api.js';
import {
	populateChannels,
	showNoHistoryText,
	onWindowPopState,
} from '../services/channelService.js';
import {
	updateInputBarPosition,
	deactivateSendButton,
	initializeSidebar,
} from '../services/uiService.js';
import { selectModel, setDefaultModel } from '../services/modelService.js';
import { initSettings } from '../services/settingsService.js';
export async function initializeApp() {
	initializeElements();
	initializePlaceholder();
	await loadChannelsAndModels();
	initializeUI();
	setupHistoryListener();
}

function initializePlaceholder() {
	const textInput = getElement('textInput');
	appState.placeholder = textInput.getAttribute('placeholder');
	textInput.innerText = appState.placeholder;
}

async function loadChannelsAndModels() {
	try {
		const data = await fetchChannelsAndModels();

		if (Array.isArray(data.channels)) {
			const channelList = getElement('channelList');
			$empty(channelList);
			populateChannels(data.channels);
		} else {
			showNoHistoryText();
		}

		const models = data.models;
		if (Array.isArray(models) && models.length > 0) {
			initializeModels(models);
		} else {
			const modelsButton = getElement('modelsButton');
			modelsButton.textContent = 'No models available';
		}
	} catch (e) {
		if (e.status === 404) {
			showNoHistoryText();
		} else {
			console.error('Failed to fetch channels:', e);
		}
	}
}

function initializeModels(models) {
	const selected = localStorage.getItem('selectedModel');
	const modelNames = models.map(m => m.name);
	const shouldReset = !selected || !modelNames.includes(selected);

	const defaultModelName = shouldReset ? models[0].name : selected;
	setDefaultModel(defaultModelName);

	const modelsDropdown = document.getElementById('models-dropdown');
	modelsDropdown.innerHTML = '';

	models.forEach(m => {
		const model = $ce('li');
		model.className = 'px-4 py-2 hover:bg-blue-800 cursor-pointer';
		model.textContent = m.name;
		modelsDropdown.appendChild(model);

		model.addEventListener('click', () => {
			selectModel(m.name);
		});
	});
}

function initializeUI() {
	updateInputBarPosition();
	initializeSidebar();
	deactivateSendButton();

	const searchInput = getElement('searchInput');
	searchInput.value = '';

	const chatContainer = getElement('chatContainer');
	setTimeout(() => {
		chatContainer.dispatchEvent(new Event('input', { bubbles: true }));
	}, 100);

	setTimeout(() => {
		chatContainer.dispatchEvent(new Event('input', { bubbles: true }));
	}, 1000);
	initSettings();
}

function setupHistoryListener() {
	onWindowPopState();
}
