import { appState } from '../state/appState.js';
import { toggleSendButton } from './uiService.js';

export async function playResponseAudio(url) {
	appState.currentAudio = new Audio(url);

	appState.currentAudio.onended = () => {
		appState.isPlaying = false;
		toggleSendButton(false);
	};

	appState.isPlaying = true;
	toggleSendButton(true);

	await appState.currentAudio.play();
}

export function stopAudio() {
	appState.stopAudio();
	toggleSendButton(false);
}
