export const $ = sel => document.getElementById(sel);
export const $qs = (el, sel) => el.querySelector(sel);
export const $ce = tag => document.createElement(tag);
export const $empty = el => (el.innerHTML = '');
export function getAbsoluteUrl(path) {
	const base = window.location.origin;
	if (path.startsWith('/')) {
		return base + path;
	}
	return path;
}
