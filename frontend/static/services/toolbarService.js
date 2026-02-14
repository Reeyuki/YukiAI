import { $ce } from '../utils/dom.js';
import { createTooltip, showHoverTooltip } from './tooltipService.js';

export function addToolbarOnMessage(element, text, audioUrl) {
	const toolbar = createToolbar();
	addCopyButton(toolbar, text);
	addVolumeButton(toolbar, audioUrl);
	element.appendChild(toolbar);
}

function createToolbar() {
	const toolbar = $ce('div');
	toolbar.style.display = 'flex';
	toolbar.style.flexDirection = 'row';
	toolbar.style.gap = '0.5rem';
	toolbar.style.marginTop = '0.5rem';
	toolbar.style.alignItems = 'center';
	return toolbar;
}

function addCopyButton(toolbar, text) {
	const copyButton = $ce('i');
	copyButton.className = 'fa-solid fa-copy cursor-pointer ml-2';
	copyButton.onclick = event => {
		copyText(event, text);
	};
	copyButton.addEventListener('mouseover', () => {
		showHoverTooltip(copyButton, 'Copy');
	});

	toolbar.appendChild(copyButton);
}

function addVolumeButton(toolbar, audioUrl) {
	if (!toolbar || !audioUrl) return;

	const volumeWrapper = $ce('span');
	volumeWrapper.className = 'relative inline-block';

	const volume1 = $ce('i');
	volume1.className = 'fa-solid fa-volume-high cursor-pointer ml-2';
	const volume2 = $ce('i');
	volume2.className = 'fa-solid fa-volume-low cursor-pointer ml-2';
	volume2.style.display = 'none';

	volumeWrapper.appendChild(volume1);
	volumeWrapper.appendChild(volume2);

	let isPlaying = false;
	let audio;
	let blinkInterval;

	const toggleBlink = () => {
		if (volume1.style.display === 'none') {
			volume1.style.display = 'inline-block';
			volume2.style.display = 'none';
		} else {
			volume1.style.display = 'none';
			volume2.style.display = 'inline-block';
		}
	};

	const stopBlink = () => {
		clearInterval(blinkInterval);
		volume1.style.display = 'inline-block';
		volume2.style.display = 'none';
	};

	const onClick = () => {
		if (isPlaying) {
			audio.pause();
			return;
		}

		audio = new Audio(audioUrl);
		audio.play();

		audio.onplaying = () => {
			isPlaying = true;
			blinkInterval = setInterval(toggleBlink, 1000);
		};

		audio.onpause = () => {
			isPlaying = false;
			stopBlink();
		};

		audio.onended = () => {
			isPlaying = false;
			stopBlink();
		};
	};

	volume1.onclick = onClick;
	volume2.onclick = onClick;

	volume1.addEventListener('mouseover', () => {
		showHoverTooltip(volume1, 'Read aloud');
	});

	volume2.addEventListener('mouseover', () => {
		showHoverTooltip(volume2, 'Read aloud');
	});

	toolbar.appendChild(volumeWrapper);
}

function copyText(event, text) {
	if (navigator.clipboard) {
		navigator.clipboard.writeText(text);
	}
	createTooltip(event.target, 'Copied!');

	const { appState } = require('../state/appState.js');
	appState.isHoverTooltip = false;

	setTimeout(() => {
		if (appState.tooltip) {
			appState.tooltip.remove();
			appState.tooltip = null;
		}
	}, 1200);
}
