import { $ce } from '../utils/dom.js';
import { appState } from '../state/appState.js';
import { TOOLTIP_DISPLAY_DURATION } from '../config.js';

export function createTooltip(
	target,
	tooltipText,
	positionOffset = { x: 0, y: 0 }
) {
	if (!tooltipText) return;

	if (appState.tooltip) {
		appState.tooltip.remove();
	}

	appState.tooltip = $ce('div');
	appState.tooltip.className = 'tooltip';
	appState.tooltip.textContent = tooltipText;
	document.body.appendChild(appState.tooltip);

	positionTooltip(target, appState.tooltip, positionOffset);

	appState.tooltip.style.visibility = 'visible';
	appState.tooltip.style.opacity = '1';
	appState.tooltip.style.zIndex = '1000';
	appState.tooltip.style.pointerEvents = 'none';
}

function positionTooltip(target, tooltip, positionOffset) {
	const targetRect = target.getBoundingClientRect();

	let tooltipLeft =
		targetRect.left +
		targetRect.width / 2 -
		tooltip.offsetWidth / 2 +
		positionOffset.x;

	let tooltipTop =
		targetRect.top - tooltip.offsetHeight - 8 + positionOffset.y;

	tooltipLeft = Math.max(
		10,
		Math.min(tooltipLeft, window.innerWidth - tooltip.offsetWidth - 10)
	);

	tooltipTop = Math.max(
		10,
		Math.min(tooltipTop, window.innerHeight - tooltip.offsetHeight - 10)
	);

	tooltip.style.left = `${tooltipLeft}px`;
	tooltip.style.top = `${tooltipTop}px`;
}

export function showHoverTooltip(target, tooltipText) {
	createTooltip(target, tooltipText);
	appState.isHoverTooltip = true;
}

export function removeTooltip() {
	appState.removeTooltip();
}
