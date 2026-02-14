import {
	MIME_TYPE_PREFERENCE,
	MINIMUM_RECORDING_TIME_MS,
	SILENCE_TIMEOUT_MS,
} from '../config.js';
import { appState } from '../state/appState.js';
import { getElement } from '../utils/elements.js';
import { appendMessage } from './messageService.js';
import { SenderType } from '../config.js';
import { updateInputBarPosition } from './uiService.js';

export async function startRecording() {
	if (!navigator.mediaDevices?.getUserMedia) {
		alert('Media devices not supported in this browser');
		return;
	}

	try {
		appState.stream = await navigator.mediaDevices.getUserMedia({
			audio: true,
		});

		const supportedMimeType = findSupportedMimeType();

		appendMessage(SenderType.AI, 'Using mime type: ' + supportedMimeType);
		updateInputBarPosition();

		if (!supportedMimeType) {
			alert('No supported audio format available on this browser.');
			return;
		}

		const options = createRecorderOptions(supportedMimeType);
		appState.mediaRecorder = new MediaRecorder(appState.stream, options);
		appState.audioChunks = [];

		const recordingStartTime = setupRecorderHandlers(supportedMimeType);

		updateInputBarPosition();
		appState.mediaRecorder.start(100);

		setupSilenceDetection(appState.stream);
		appState.isRecording = true;

		const statusDiv = getElement('statusDiv');
		const recordingIndicator = getElement('recordingIndicator');

		statusDiv.textContent = 'Listening...';
		recordingIndicator.classList.remove('hidden');
		toggleRecordButton(true);
	} catch (err) {
		console.error('Recording error:', err);
		alert('Error starting recording: ' + err.message);
	}
}

export function stopRecording() {
	const recordingIndicator = getElement('recordingIndicator');
	const statusDiv = getElement('statusDiv');

	appState.stopRecording();
	toggleRecordButton(false);
	recordingIndicator.classList.add('hidden');
	statusDiv.textContent = '';
}

function findSupportedMimeType() {
	for (const mimeType of MIME_TYPE_PREFERENCE) {
		if (MediaRecorder.isTypeSupported(mimeType)) {
			return mimeType;
		}
	}
	return null;
}

function createRecorderOptions(mimeType) {
	const options = { mimeType };

	if (mimeType.includes('webm')) {
		options.audioBitsPerSecond = 128000;
	}

	return options;
}

function setupRecorderHandlers(supportedMimeType) {
	const recordingStartTime = Date.now();

	appState.mediaRecorder.ondataavailable = e => {
		if (e.data.size) appState.audioChunks.push(e.data);
	};

	appState.mediaRecorder.onstop = async () => {
		await handleRecordingStop(recordingStartTime, supportedMimeType);
	};

	return recordingStartTime;
}

async function handleRecordingStop(recordingStartTime, supportedMimeType) {
	if (appState.audioChunks.length === 0) return;

	const recordingDuration = Date.now() - recordingStartTime;

	if (
		recordingDuration < MINIMUM_RECORDING_TIME_MS &&
		supportedMimeType.includes('webm')
	) {
		appendMessage(
			SenderType.AI,
			'Recording too short, please record for at least 1 second'
		);
		appState.audioChunks = [];
		return;
	}

	const blob = new Blob(appState.audioChunks, { type: supportedMimeType });

	try {
		const formData = new FormData();
		formData.append('file', blob, 'audio.wav');

		const statusDiv = getElement('statusDiv');
		statusDiv.textContent = 'Processing audio...';

		const { processChatRequest } = await import('./chatService.js');
		await processChatRequest(formData);
	} catch (error) {
		appendMessage(
			SenderType.AI,
			'Error processing audio: ' + error.message
		);
	}
}

function setupSilenceDetection(stream) {
	const ctx = new AudioContext();
	const src = ctx.createMediaStreamSource(stream);
	const analyser = ctx.createAnalyser();
	analyser.fftSize = 2048;
	src.connect(analyser);

	const dataArray = new Uint8Array(analyser.frequencyBinCount);

	const checkSilence = () => {
		analyser.getByteTimeDomainData(dataArray);
		const silent = dataArray.every(v => v > 125 && v < 130);

		if (!silent && appState.silenceTimeoutId) {
			clearTimeout(appState.silenceTimeoutId);
			appState.silenceTimeoutId = null;
		}

		if (silent && !appState.silenceTimeoutId) {
			appState.silenceTimeoutId = setTimeout(
				stopRecording,
				SILENCE_TIMEOUT_MS
			);
		}

		appState.silenceCheckId = requestAnimationFrame(checkSilence);
	};

	appState.silenceCheckId = requestAnimationFrame(checkSilence);
}

export function toggleRecordButton(recording) {
	const recordButton = getElement('recordButton');

	recordButton.classList.toggle('bg-green-600', !recording);
	recordButton.classList.toggle('hover:bg-green-700', !recording);
	recordButton.classList.toggle('bg-red-600', recording);
	recordButton.classList.toggle('hover:bg-red-700', recording);
	recordButton.innerHTML = recording
		? '<i class="fas fa-stop"></i>'
		: '<i class="fas fa-microphone"></i>';
}
