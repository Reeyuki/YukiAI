import { STREAM_MARKERS, SenderType } from '../config.js';
import { appState } from '../state/appState.js';
import { getElement } from '../utils/elements.js';
import { sendChatRequest } from './api.js';
import { appendMessage } from './messageService.js';
import { getSelectedModel } from './modelService.js';
import { playResponseAudio } from './playbackService.js';
import { $, getAbsoluteUrl } from '../utils/dom.js';
import { addToolbarOnMessage } from './toolbarService.js';
import {
	addChannel,
	pushState,
	selectChannel,
	setChannelName,
} from './channelService.js';

export async function processChatRequest(formData) {
	try {
		if (appState.currentChannelId) {
			formData.append('channel_id', appState.currentChannelId);
		}
		formData.append('language', appState.selectedLanguage);
		formData.append('system_message', appState.systemMessage);
		appState.streamingBubble = null;
		appState.streamingText = '';

		const usedChannel = appState.currentChannelId;
		const selectedModel = getSelectedModel();

		if (selectedModel) {
			formData.append('model', selectedModel);
		}

		const response = await sendChatRequest(formData);

		if (!response.ok) {
			handleChatError(response);
			return;
		}

		await processStreamingResponse(response, usedChannel);
	} catch (error) {
		const statusDiv = getElement('statusDiv');
		statusDiv.textContent = '';
		console.error('Error processing chat request:', error);
	}
}

function handleChatError(response) {
	if (response.status === 404) {
		appendMessage(SenderType.AI, 'No models found on server.', false, true);
		return;
	}

	appendMessage(
		SenderType.AI,
		'Failed to get response from the AI.' + response.textContent,
		false,
		true
	);
}

async function processStreamingResponse(response, usedChannel) {
	const reader = response.body.getReader();
	const decoder = new TextDecoder('utf-8');
	let accumulatedText = '';
	let audioUrl = null;
	let channelName;

	const buffer = createBuffer(text => {
		if (usedChannel === appState.currentChannelId) {
			appendMessage(SenderType.AI, text, true);
		}
		accumulatedText += text;
	});

	const statusDiv = getElement('statusDiv');
	statusDiv.textContent = 'Receiving response...';

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		const chunk = decoder.decode(value, { stream: true });
		const {
			text,
			foundAudioUrl,
			foundResolvedText,
			foundChannelName,
			foundChannelId,
		} = processChunk(chunk);

		if (foundChannelName) channelName = foundChannelName;
		if (foundResolvedText) {
			buffer.flushNow();
			appendMessage(SenderType.USER, foundResolvedText, false);
			continue;
		}

		if (text !== undefined && text !== null) {
			buffer.append(text);
		}

		if (foundAudioUrl) {
			audioUrl = foundAudioUrl;

			if (foundChannelId && channelName) {
				setChannelName(foundChannelId, channelName);
			}
		}
	}

	buffer.flushNow();
	statusDiv.textContent = '';

	if (usedChannel && channelName) {
		setChannelName(usedChannel, channelName);
	}

	if (audioUrl && audioUrl.trim() !== '') {
		audioUrl = getAbsoluteUrl(audioUrl);
		if (usedChannel === appState.currentChannelId) {
			try {
				await playResponseAudio(audioUrl);
			} catch (err) {
				console.error('Failed to play audio:', err, audioUrl);
			}
		}
	}

	finalizeStreamingBubble(accumulatedText, audioUrl);
}
export async function fetchAndRenderSystemPrompt(channelId) {
	try {
		const data = await fetchHistory(channelId);
		const systemMsg = Array.isArray(data.history)
			? data.history.find(msg => msg.role === 'system')
			: null;

		const panel = document.getElementById('systemPromptPanel');
		const button = document.getElementById('showSystemPromptBtn');

		if (systemMsg) {
			panel.textContent = systemMsg.content;

			button.addEventListener('mouseenter', () => {
				panel.classList.remove('hidden');
			});
			button.addEventListener('mouseleave', () => {
				panel.classList.add('hidden');
			});

			panel.addEventListener('mouseenter', () => {
				panel.classList.remove('hidden');
			});
			panel.addEventListener('mouseleave', () => {
				panel.classList.add('hidden');
			});
		} else {
			panel.classList.add('hidden');
			button.style.display = 'none';
		}
	} catch (error) {
		console.error('Error fetching system prompt:', error);
	}
}

function createBuffer(onFlush, smoothness = 50) {
	let buffer = '';
	let timer = null;

	const flush = () => {
		if (buffer.trim() !== '') {
			onFlush(buffer);
			buffer = '';
		}
	};

	const schedule = () => {
		if (timer !== null) {
			clearTimeout(timer);
		}

		if (buffer.length >= 10 || /[.?!\s]/.test(buffer.slice(-1))) {
			flush();
		} else {
			timer = setTimeout(flush, smoothness);
		}
	};

	const append = text => {
		buffer += text;
		schedule();
	};

	const flushNow = () => {
		if (timer !== null) {
			clearTimeout(timer);
		}
		flush();
	};

	return { append, flushNow };
}
function processChunk(chunk) {
	let foundAudioUrl = null;
	let foundResolvedText = null;
	let foundChannelName = null;
	let foundChannelId = null;
	let remainingText = chunk;

	const jsonResult = extractJSON(chunk);
	if (jsonResult) {
		foundResolvedText = jsonResult.resolvedText;
		if (jsonResult.channelName) foundChannelName = jsonResult.channelName;
		if (jsonResult.channelId) foundChannelId = jsonResult.channelId;
		remainingText = jsonResult.remainingText;

		if (foundChannelId) {
			addChannel(foundChannelId, foundChannelName);
			pushState(foundChannelId);
		}
	}

	const chunkDataResult = extractChunkData(remainingText);
	if (chunkDataResult) {
		foundAudioUrl = chunkDataResult.audioUrl;
		remainingText = chunkDataResult.remainingText;
		if (chunkDataResult.channelId)
			foundChannelId = chunkDataResult.channelId;

		if (!chunkDataResult.channelName && foundChannelName) {
			chunkDataResult.channelName = foundChannelName;
		}

		if (chunkDataResult.channelId) {
			addChannel(chunkDataResult.channelId, chunkDataResult.channelName);
			const channelList = getElement('channelList');
			if (channelList) {
				const selectedButton = channelList.querySelector(
					`li[id="${chunkDataResult.channelId}"]`
				);
				if (selectedButton) selectChannel(selectedButton);
			}
			pushState(chunkDataResult.channelId);
		}
	}

	return {
		text: remainingText,
		foundAudioUrl,
		foundResolvedText,
		foundChannelName,
		foundChannelId,
	};
}

function extractJSON(text) {
	const startIndex = text.indexOf(STREAM_MARKERS.JSON_START);
	const endIndex = text.indexOf(
		STREAM_MARKERS.JSON_END,
		startIndex + STREAM_MARKERS.JSON_START.length
	);
	if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex)
		return null;

	const jsonChunk = text.substring(
		startIndex + STREAM_MARKERS.JSON_START.length,
		endIndex
	);
	try {
		const parsed = JSON.parse(jsonChunk);
		const remainingText =
			text.slice(0, startIndex) +
			text.slice(endIndex + STREAM_MARKERS.JSON_END.length);
		return {
			resolvedText: parsed.resolved_text || null,
			channelName: parsed.channel_name || null,
			channelId: parsed.channel_id || null,
			remainingText,
		};
	} catch {
		return null;
	}
}

function extractChunkData(text) {
	const audioStartIndex = text.indexOf(STREAM_MARKERS.AUDIO_START);
	const audioEndIndex = text.indexOf(
		STREAM_MARKERS.AUDIO_END,
		audioStartIndex + STREAM_MARKERS.AUDIO_START.length
	);

	if (
		audioStartIndex === -1 ||
		audioEndIndex === -1 ||
		audioEndIndex <= audioStartIndex
	) {
		return null;
	}

	const audioChunk = text.substring(
		audioStartIndex + STREAM_MARKERS.AUDIO_START.length,
		audioEndIndex
	);

	try {
		const parsedAudio = JSON.parse(audioChunk);
		console.log(parsedAudio);
		const remainingText =
			text.slice(0, audioStartIndex) +
			text.slice(audioEndIndex + STREAM_MARKERS.AUDIO_END.length);

		return {
			audioUrl: parsedAudio.audio_url || null,
			channelId: parsedAudio.channel_id || null,
			channelName: parsedAudio.channel_name || null,
			remainingText,
		};
	} catch {
		return null;
	}
}

function finalizeStreamingBubble(accumulatedText, audioUrl) {
	const streamBubble = $('response-stream-bubble');
	if (streamBubble) {
		const md = window.markdownit();
		streamBubble.innerHTML = md.render(accumulatedText);
		streamBubble.removeAttribute('id');
		addToolbarOnMessage(streamBubble, accumulatedText, audioUrl);
	}
}
