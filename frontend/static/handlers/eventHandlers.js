import { getElement } from '../utils/elements.js';
import { appState } from '../state/appState.js';
import {
	updateButtonState,
	toggleSidebar,
	closeSidebar,
	handleTouchStart,
	handleTouchMove,
	handleTouchEnd,
} from '../services/uiService.js';
import { selectChannel } from '../services/channelService.js';
import { startRecording, stopRecording } from '../services/audioService.js';
import { stopAudio } from '../services/playbackService.js';
import { processChatRequest } from '../services/chatService.js';
import { appendMessage } from '../services/messageService.js';
import { SenderType } from '../config.js';
import { updateInputBarPosition } from '../services/uiService.js';
import { showDeleteModal } from '../services/modalService.js';
import { showHoverTooltip, removeTooltip } from '../services/tooltipService.js';
import { isMobile } from '../config.js';

export function setupEventListeners() {
	setupTextInputHandlers();
	setupButtonHandlers();
	setupSidebarHandlers();
	setupChannelHandlers();
	setupModelDropdownHandlers();
	setupLanguageDropdownHandlers();
	setupTooltipHandlers();
	setupTouchHandlers();
	setupSearchHandler();
}

function setupTextInputHandlers() {
	const textInput = getElement('textInput');
	const sendButton = getElement('sendButton');

	textInput.addEventListener('keydown', e => {
		if (e.key === 'Enter') {
			if (e.shiftKey) return;
			e.preventDefault();
			handleSendText();
		}
	});

	textInput.addEventListener('input', updateButtonState);

	textInput.addEventListener('focus', () => {
		if (textInput.innerText === appState.placeholder) {
			textInput.innerText = '';
		}
		updateButtonState();
	});

	textInput.addEventListener('blur', () => {
		if (textInput.innerText.trim() === '') {
			textInput.innerText = appState.placeholder;
		}
		updateButtonState();
	});
}

function setupButtonHandlers() {
	const sendButton = getElement('sendButton');
	const recordButton = getElement('recordButton');
	const deleteButton = getElement('deleteButton');

	sendButton.addEventListener('click', handleSendText);
	recordButton.addEventListener('click', handleRecordButton);
	deleteButton.addEventListener('click', showDeleteModal);

	sendButton.addEventListener('mouseover', () => {
		showHoverTooltip(sendButton, 'Send');
	});

	recordButton.addEventListener('mouseover', () => {
		showHoverTooltip(recordButton, 'Record');
	});
}

function setupSidebarHandlers() {
	const hamburgerButton = getElement('hamburgerButton');
	const closeSidebarButton = getElement('closeSidebarButton');

	hamburgerButton.addEventListener('click', toggleSidebar);
	closeSidebarButton.addEventListener('click', closeSidebar);
}

function setupChannelHandlers() {
	document.addEventListener('click', e => {
		const channelContainer = e.target.closest('.channel-container');
		if (channelContainer) {
			const selectedButton =
				channelContainer.querySelector('.channel-button');
			if (selectedButton) {
				selectChannel(selectedButton);
				if (isMobile) {
					closeSidebar();
				}
			}
		}
	});
}

function setupModelDropdownHandlers() {
	const modelsButton = getElement('modelsButton');
	const dropdown = getElement('dropdown');

	modelsButton.addEventListener('click', function () {
		dropdown.classList.toggle('hidden');
	});

	document.addEventListener('click', function (event) {
		if (
			!modelsButton.contains(event.target) &&
			!dropdown.contains(event.target)
		) {
			dropdown.classList.add('hidden');
		}
	});
}
function setupLanguageDropdownHandlers() {
	const lang = document.getElementById('languageSelect');

	lang.addEventListener('change', event => {
		const selectedLanguage = event.target.value;
		appState.selectedLanguage = selectedLanguage;
	});
}

function setupTooltipHandlers() {
	document.addEventListener('mouseover', async function (event) {
		const target = event.target;
		if (
			!target ||
			target.className !== 'tooltip' ||
			target === appState.currentTarget
		) {
			return;
		}

		appState.currentTarget = target;
		const name = target.id;

		if (!name) return;

		showHoverTooltip(target, name);
		appState.isHoverTooltip = true;
	});

	document.addEventListener('mouseout', function (event) {
		if (
			appState.tooltip &&
			appState.isHoverTooltip &&
			event.relatedTarget !== appState.tooltip
		) {
			removeTooltip();
		}
	});
}

function setupTouchHandlers() {
	if (!isMobile) return;

	document.body.addEventListener('touchstart', handleTouchStart, false);
	document.body.addEventListener('touchmove', handleTouchMove, false);
	document.body.addEventListener('touchend', handleTouchEnd, false);
}

function setupSearchHandler() {
	const searchInput = getElement('searchInput');
	const channelList = getElement('channelList');

	searchInput.addEventListener('input', () => {
		const val = searchInput.value.trim();
		const filter = val.toLowerCase();
		const channels = channelList.querySelectorAll('li');

		channels.forEach(channel => {
			const button = channel.querySelector('.channel-button');
			if (
				!filter ||
				(button &&
					button.classList.contains('new-channel-container') &&
					button.textContent.toLowerCase().includes(filter))
			) {
				channel.style.display = '';
			} else {
				channel.style.display = 'none';
			}
		});
	});
}

async function handleSendText() {
	console.log('handleSendText called');
	const textInput = getElement('textInput');
	if (!textInput) return;

	if (appState.isPlaying && appState.currentAudio) {
		console.log('Stop audio');
		stopAudio();
		return;
	}

	const value = textInput.innerHTML;
	const text = value
		.replace(/<br\s*\/?>/gi, '')
		.replace(/&nbsp;/g, ' ')
		.trim();

	console.log('found text:', text);
	if (!text) return;

	textInput.innerHTML = '';
	appendMessage(SenderType.USER, text, false, false, '');

	const statusDiv = getElement('statusDiv');
	statusDiv.textContent = 'Sending text...';

	const formData = new FormData();
	formData.append('text', text);

	const langSelect = getElement('languageSelect');
	if (langSelect && langSelect.value) {
		formData.append('language', langSelect.value);
	}

	updateInputBarPosition();

	await processChatRequest(formData);
}

async function handleRecordButton() {
	appState.isRecording ? stopRecording() : await startRecording();
}
