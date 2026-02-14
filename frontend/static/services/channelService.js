import { $, $ce, $empty } from '../utils/dom.js';
import { appState } from '../state/appState.js';
import { fetchHistory, deleteChannel, deleteAllChannels } from './api.js';
import { appendMessage } from './messageService.js';
import { SenderType } from '../config.js';
import { updateInputBarPosition, closeSidebar } from './uiService.js';
import { stopRecording } from './audioService.js';
import { stopAudio } from './playbackService.js';
import { isMobile } from '../config.js';

const channelList = $('channelList');
const chatContainer = $('chatContainer');

export async function fetchAndRenderHistory(channelId) {
	try {
		appState.currentChannelId = channelId;
		pushState(channelId);

		const data = await fetchHistory(channelId);
		$empty(chatContainer);

		if (Array.isArray(data.history)) {
			data.history
				.filter(msg => msg.role !== 'system')
				.forEach(msg => {
					const sender =
						msg.role.toUpperCase() === SenderType.USER
							? SenderType.USER
							: SenderType.AI;
					appendMessage(
						sender,
						msg.content,
						false,
						false,
						msg.audio_url
					);
				});
		} else {
			appendMessage(SenderType.AI, '');
		}

		stopRecording();
		stopAudio();

		setTimeout(() => {
			updateInputBarPosition();
		}, 0);
	} catch (error) {
		console.error('Error fetching history:', error);
	}
}

export function selectChannel(selectedButton, doNotReset = false) {
	stopAudio();
	stopRecording();
	const buttons = Array.from(
		channelList.querySelectorAll('.channel-button')
	).filter(btn => btn.id !== 'noHistoryButton');

	buttons.forEach(btn => btn.parentNode.classList.remove('selected-channel'));

	if (selectedButton) {
		if (selectedButton.parentNode !== channelList)
			selectedButton.parentNode.classList.add('selected-channel');
		else {
			selectedButton.classList.add('selected-channel');
		}
		const channelId = selectedButton.id;
		if (channelId) pushState(channelId);

		if (channelId && !doNotReset) {
			fetchAndRenderHistory(channelId);
		}
	}
}

export function pushState(channelId) {
	if (channelId && channelId !== appState.currentChannelId) {
		appState.currentChannelId = channelId;
		window.history.pushState(null, null, `/c/${channelId}`);
	}
}
export function setChannelName(channelId, channelName) {
	const li = document.getElementById(channelId);
	if (!li) return;
	const button = li.querySelector('.channel-button');
	if (button && channelName) {
		button.textContent = channelName;
	}
}
export function addChannel(channelId, channelName = 'New Chat') {
	const existingLi = document.getElementById(channelId);
	if (existingLi) {
		setChannelName(channelId, channelName);
		return;
	}

	const li = document.createElement('li');
	li.className = 'mb-3 channel-item';
	li.id = channelId;

	li.innerHTML = `
		<div class="channel-container">
			<button class="channel-button" id="${channelId}">
				${channelName}
			</button>
			<button class="channel-dropdown-button">...</button>
		</div>
	`;

	const channelButton = li.querySelector('.channel-button');
	channelButton.addEventListener('click', e => {
		e.stopPropagation();
		selectChannel(channelButton);
	});
	li.querySelector('.channel-container').style.padding = '5px';

	setupChannelDropdown(li, channelId);

	const channelList = document.getElementById('channelList');
	if (channelList) {
		const firstChannel = channelList.querySelector(
			'.channel-item, .new-channel-container + li'
		);
		if (firstChannel) {
			channelList.insertBefore(li, firstChannel);
		} else {
			channelList.appendChild(li);
		}
	}

	if (appState.pendingChannelId && appState.pendingChannelId === channelId) {
		selectChannel(channelButton);
		appState.pendingChannelId = null;
	}
}

function setupChannelDropdown(li, channelId) {
	const dropdownButton = li.querySelector('.channel-dropdown-button');
	const dropdownMenu = $ce('div');
	dropdownMenu.className = 'channel-dropdown-menu fixed hidden';
	dropdownMenu.innerHTML = `
		<button class="delete-channel-button">
			<i style="color:red;" class="fas fa-trash"></i> Delete
		</button>
	`;

	document.body.appendChild(dropdownMenu);

	dropdownButton.addEventListener('click', e => {
		e.stopPropagation();
		const rect = dropdownButton.getBoundingClientRect();
		dropdownMenu.style.top = `${rect.bottom + window.scrollY}px`;
		dropdownMenu.style.left = `${rect.left + window.scrollX}px`;
		dropdownMenu.classList.toggle('hidden');
	});

	const deleteButton = dropdownMenu.querySelector('.delete-channel-button');
	deleteButton.addEventListener('click', async () => {
		await deleteChannelHistory(channelId);
		dropdownMenu.classList.add('hidden');
	});

	document.addEventListener('click', e => {
		if (!dropdownMenu.contains(e.target) && e.target !== dropdownButton) {
			dropdownMenu.classList.add('hidden');
		}
	});
}

export async function deleteChannelHistory(channelId) {
	try {
		await deleteChannel(channelId);

		const channel = channelList.querySelector(`li[id="${channelId}"]`);

		if (channel) {
			channel.remove();
		}

		if (
			appState.currentChannelId &&
			channelId === appState.currentChannelId
		) {
			$empty(chatContainer);
			appState.currentChannelId = '';
			stopAudio();
		}
	} catch (error) {
		console.error('Error deleting history:', error);
		alert(
			'An error occurred while deleting the chat history. Please try again.'
		);
	}
}

export async function deleteAllHistory() {
	try {
		await deleteAllChannels();

		$empty(chatContainer);
		$empty(channelList);
		populateChannels();
		stopAudio();
	} catch (error) {
		console.error('Error deleting history:', error);
		alert(
			'An error occurred while deleting the chat history. Please try again.'
		);
	}
}

export function populateChannels(channels = []) {
	channelList.innerHTML = '';

	addNewChatButton();

	if (!channels || channels.length === 0) {
		return;
	}

	channels.forEach(channel => {
		addChannel(channel.id, channel.name);
	});
}

function addNewChatButton() {
	const newChatLiContainer = $ce('div');
	newChatLiContainer.className = 'new-channel-container channel-container';
	newChatLiContainer.style.backgroundColor = '#2F2F2F';
	newChatLiContainer.style.borderRadius = '50px';

	const newChatLi = $ce('li');
	newChatLi.className = 'mb-3';
	newChatLi.innerHTML = `
		<button class="new-channel-button channel-button">New Chat</button>
	`;

	newChatLiContainer.addEventListener('click', () => {
		stopAudio();
		stopRecording();
		chatContainer.innerHTML = '';
		appState.currentChannelId = '';
		history.pushState(null, null, '/');
		updateInputBarPosition();
		if (isMobile) closeSidebar();
	});

	newChatLiContainer.appendChild(newChatLi);
	channelList.insertBefore(newChatLiContainer, channelList.firstChild);
}

export function showNoHistoryText() {
	populateChannels();

	const li = $ce('li');
	li.className = 'mb-3';
	li.innerHTML = `<button id="noHistoryButton" class="channel-button">No history available</button>`;
	channelList.appendChild(li);
}

export function onWindowPopState() {
	requestAnimationFrame(() => {
		const channelId = window.location.pathname.split('/').pop();

		if (channelId && channelId !== appState.currentChannelId) {
			const selectedButton = channelList.querySelector(
				`li[id="${channelId}"]`
			);

			if (selectedButton) {
				selectChannel(selectedButton);
			} else {
				appState.pendingChannelId = null;
				history.replaceState(null, '', '/');
			}
		}
	});
}
