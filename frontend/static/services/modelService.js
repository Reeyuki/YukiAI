import { getElement } from '../utils/elements.js';

const MODEL_STORAGE_KEY = 'selectedModel';

export function selectModel(name) {
	const modelsButton = getElement('modelsButton');
	const dropdown = getElement('dropdown');

	modelsButton.textContent = name;
	dropdown.classList.toggle('hidden');
	localStorage.setItem(MODEL_STORAGE_KEY, name);
}

export function getSelectedModel() {
	return localStorage.getItem(MODEL_STORAGE_KEY);
}

export function isModelSelected(model) {
	const selected = getSelectedModel();
	return selected === model;
}

export function isAnyModelSelected() {
	return getSelectedModel() != null;
}

export function setDefaultModel(modelName) {
	localStorage.setItem(MODEL_STORAGE_KEY, modelName);
	const modelsButton = getElement('modelsButton');
	if (modelsButton) {
		modelsButton.textContent = modelName;
	}
}

export function clearModelSelection() {
	localStorage.removeItem(MODEL_STORAGE_KEY);
}
