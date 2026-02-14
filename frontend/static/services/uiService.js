import { getElement } from '../utils/elements.js';
import { appState } from '../state/appState.js';
import { isMobile } from '../config.js';

export function updateInputBarPosition() {
	const chatContainer = getElement('chatContainer');
	const textInput = getElement('textInput');
	const emptyChatText = getElement('emptyChatText');
	const inputBottomBar = document.getElementById('inputBottomBar');

	if (!chatContainer.innerHTML.trim()) {
		chatContainer.classList.add('empty');
		textInput.classList.add('chat-container-empty');
		emptyChatText.style.display = 'flex';
		inputBottomBar.classList.remove('input-bar-centered');
	} else {
		chatContainer.classList.remove('empty');
		emptyChatText.style.display = 'none';
		textInput.classList.remove('chat-container-empty');
		inputBottomBar.classList.add('input-bar-centered');
	}
}

export function toggleSendButton(playing) {
	appState.isPlaying = playing;
	const sendButton = getElement('sendButton');

	sendButton.innerHTML = playing
		? '<i class="fas fa-stop"></i>'
		: '<i class="fas fa-paper-plane"></i>';
}

export function activateSendButton() {
	const sendButton = getElement('sendButton');
	sendButton.classList.add('opacity-100');
	sendButton.classList.remove('opacity-70');
}

export function deactivateSendButton() {
	const sendButton = getElement('sendButton');
	sendButton.classList.remove('opacity-100');
	sendButton.classList.add('opacity-70');
}

export function updateButtonState() {
	const textInput = getElement('textInput');
	const sendButton = getElement('sendButton');
	const currentText = textInput.innerText.trim();

	sendButton.disabled =
		currentText === '' || currentText === appState.placeholder;
}

export function openSidebar() {
	const hamburgerButton = getElement('hamburgerButton');
	const sidebar = getElement('sidebar');
	const chatContainer = getElement('chatContainer');

	hamburgerButton.classList.add('hidden');
	sidebar.style.transform = 'translateX(0)';
	appState.isSidebarOpen = true;

	setTimeout(() => {
		chatContainer.dispatchEvent(new Event('input', { bubbles: true }));
	}, 100);
}

export function closeSidebar() {
	const hamburgerButton = getElement('hamburgerButton');
	const sidebar = getElement('sidebar');
	const chatContainer = getElement('chatContainer');

	hamburgerButton.classList.remove('hidden');
	sidebar.style.transform = 'translateX(-100%)';
	appState.isSidebarOpen = false;

	setTimeout(() => {
		chatContainer.dispatchEvent(new Event('input', { bubbles: true }));
	}, 100);
}

export function toggleSidebar() {
	appState.isSidebarOpen ? closeSidebar() : openSidebar();
}

export function handleTouchStart(e) {
	appState.touchStartX = e.touches[0].clientX;
}

export function handleTouchMove(e) {
	appState.touchMoveX = e.touches[0].clientX;

	if (
		appState.touchMoveX - appState.touchStartX > 50 &&
		!appState.isSidebarOpen
	) {
		openSidebar();
	} else if (
		appState.touchStartX - appState.touchMoveX > 50 &&
		appState.isSidebarOpen
	) {
		closeSidebar();
	}
}

export function handleTouchEnd() {
	if (
		Math.abs(appState.touchMoveX - appState.touchStartX) < 50 &&
		appState.isSidebarOpen
	) {
		closeSidebar();
	}
}

export function initializeSidebar() {
	if (!isMobile) {
		toggleSidebar();
	}
}
