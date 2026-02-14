export async function requestJSON(url, options = {}) {
	const response = await fetch(url, options);
	if (!response.ok) throw response;
	return response.json();
}

export async function fetchChannelsAndModels() {
	return requestJSON('/api/data');
}

export async function fetchHistory(channelId) {
	return requestJSON(`/api/history/${channelId}`);
}

export async function deleteChannel(channelId) {
	const response = await fetch(`/api/history/${channelId}/`, {
		method: 'DELETE',
	});
	if (!response.ok) throw new Error('Failed to delete history');
	return response;
}

export async function deleteAllChannels() {
	const response = await fetch('/api/history/delete-all', {
		method: 'DELETE',
	});
	if (!response.ok) throw new Error('Failed to delete all history');
	return response;
}

export async function sendChatRequest(formData) {
	return fetch('/api/chat', {
		method: 'POST',
		body: formData,
	});
}
