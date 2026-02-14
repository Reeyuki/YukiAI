import { $, $qs } from './dom.js';

export const elements = {
	recordButton: null,
	sendButton: null,
	textInput: null,
	statusDiv: null,
	recordingIndicator: null,
	chatContainer: null,
	deleteButton: null,
	channelList: null,
	hamburgerButton: null,
	sidebar: null,
	closeSidebarButton: null,
	searchInput: null,
	emptyChatText: null,
	modelsButton: null,
	dropdown: null,
};

export function initializeElements() {
	elements.recordButton = $('recordButton');
	elements.sendButton = $('sendButton');
	elements.textInput = $('textInput');
	elements.statusDiv = $qs($('status'), 'span');
	elements.recordingIndicator = $('recordingIndicator');
	elements.chatContainer = $('chatContainer');
	elements.deleteButton = $('deleteButton');
	elements.channelList = $('channelList');
	elements.hamburgerButton = $('hamburgerButton');
	elements.sidebar = $('sidebar');
	elements.closeSidebarButton = $('closeSidebarButton');
	elements.searchInput = $('searchInput');
	elements.emptyChatText = $('empty-chat-text');
	elements.modelsButton = $('modelsButton');
	elements.dropdown = $('models-dropdown').parentElement;
}

export function getElement(name) {
	return elements[name];
}
