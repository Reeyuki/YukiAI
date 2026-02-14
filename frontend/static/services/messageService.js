import { $ce } from '../utils/dom.js';
import { SenderType } from '../config.js';
import { getElement } from '../utils/elements.js';
import { appState } from '../state/appState.js';
import { addToolbarOnMessage } from './toolbarService.js';

export function appendMessage(
	sender,
	text,
	streaming = false,
	isRed = false,
	audioUrl = ''
) {
	const chatContainer = getElement('chatContainer');
	const isAI = sender === SenderType.AI;

	if (streaming && isAI) {
		handleStreamingMessage(text, chatContainer);
		return;
	}

	let bubble;

	if (appState.streamingBubble && streaming && isAI) {
		bubble = finalizeStreamingBubble(isRed, audioUrl);
	} else {
		bubble = createNewMessageBubble(sender, text, isRed, audioUrl);
	}

	chatContainer.scrollTop = chatContainer.scrollHeight;

	if (window.MathJax) {
		MathJax.typesetPromise([bubble]);
	}
}

function handleStreamingMessage(text, chatContainer) {
	if (!appState.streamingBubble) {
		appState.streamingBubble = createStreamingBubble();
		chatContainer.appendChild(appState.streamingBubble);
	}

	appState.streamingText += text;
	const codeEl = appState.streamingBubble
		?.querySelector('pre')
		?.querySelector('code');
	if (codeEl) {
		codeEl.textContent = appState.streamingText ?? '';
	}

	chatContainer.scrollTop = chatContainer.scrollHeight;
}

function createStreamingBubble() {
	const bubble = $ce('div');
	bubble.id = 'response-stream-bubble';
	bubble.className =
		'p-3 rounded self-start mr-auto max-w-fit break-words message-animate ai-streaming';
	bubble.style.backgroundColor = 'transparent';
	bubble.style.marginBottom = '0.5rem';

	const codeBlock = $ce('pre');
	const codeInner = $ce('code');
	codeBlock.appendChild(codeInner);
	bubble.appendChild(codeBlock);

	return bubble;
}

function finalizeStreamingBubble(isRed, audioUrl) {
	const bubble = appState.streamingBubble;
	appState.streamingBubble = null;

	const md = window.markdownit();
	bubble.innerHTML = md.render(appState.streamingText);

	if (isRed) {
		bubble.style.color = 'red';
	}

	addToolbarOnMessage(bubble, appState.streamingText, audioUrl);
	appState.streamingText = '';

	return bubble;
}

function createNewMessageBubble(sender, text, isRed, audioUrl) {
	const chatContainer = getElement('chatContainer');
	const bubble = $ce('div');

	bubble.className = `p-3 rounded ${
		sender === SenderType.USER ? 'self-end ml-auto' : 'self-start mr-auto'
	} max-w-fit break-words message-animate`;

	bubble.style.backgroundColor =
		sender === SenderType.USER ? '#303030' : 'transparent';
	bubble.style.marginBottom = '0.5rem';

	const md = window.markdownit();
	bubble.innerHTML = md.render(text);

	if (isRed) {
		bubble.style.color = 'red';
	}

	chatContainer.appendChild(bubble);
	addToolbarOnMessage(bubble, text, audioUrl);

	return bubble;
}

export function clearMessages() {
	const chatContainer = getElement('chatContainer');
	chatContainer.innerHTML = '';
	appState.streamingBubble = null;
	appState.streamingText = '';
}
