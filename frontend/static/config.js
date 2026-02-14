export const SenderType = {
	AI: 'AI',
	USER: 'USER',
};

export const SILENCE_TIMEOUT_MS = 1500;
export const MINIMUM_RECORDING_TIME_MS = 1000;
export const BUFFER_SMOOTHNESS = 50;
export const TOOLTIP_DISPLAY_DURATION = 1200;

export const MIME_TYPE_PREFERENCE = [
	'audio/webm;codecs=opus',
	'audio/mp4',
	'audio/webm',
	'audio/ogg;codecs=opus',
	'audio/wav',
	'audio/mp3',
];

export const STREAM_MARKERS = {
	JSON_START: '$[[START_JSON]]',
	JSON_END: '$[[END_JSON]]',
	AUDIO_START: '$[[AUDIO_DONE]]',
	AUDIO_END: '$[[AUDIO_DONE]]',
};

export const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(
	navigator.userAgent
);
