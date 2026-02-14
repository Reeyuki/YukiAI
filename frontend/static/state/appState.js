class AppState {
	constructor() {
		this.mediaRecorder = null;
		this.audioChunks = [];
		this.currentAudio = null;
		this.isPlaying = false;
		this.isRecording = false;
		this.stream = null;
		this.silenceCheckId = null;
		this.silenceTimeoutId = null;
		this.isSidebarOpen = false;
		this.currentChannelId = null;
		this.touchStartX = 0;
		this.touchMoveX = 0;
		this.tooltip = null;
		this.isHoverTooltip = false;
		this.currentTarget = null;
		this.pendingChannelId = null;
		this.streamingBubble = null;
		this.streamingText = '';
		this.placeholder = '';
		this.selectedLanguage = '';
		this.systemMessage = '';
	}

	reset() {
		this.cleanup();
		this.currentChannelId = null;
		this.streamingBubble = null;
		this.streamingText = '';
	}

	cleanup() {
		this.stopRecording();
		this.stopAudio();
		this.removeTooltip();
	}

	stopRecording() {
		if (this.mediaRecorder) {
			this.mediaRecorder.stop();
			this.mediaRecorder = null;
		}
		if (this.stream) {
			this.stream.getTracks().forEach(track => track.stop());
			this.stream = null;
		}
		if (this.silenceCheckId) {
			cancelAnimationFrame(this.silenceCheckId);
			this.silenceCheckId = null;
		}
		if (this.silenceTimeoutId) {
			clearTimeout(this.silenceTimeoutId);
			this.silenceTimeoutId = null;
		}
		this.isRecording = false;
		this.audioChunks = [];
	}

	stopAudio() {
		if (this.currentAudio) {
			this.currentAudio.pause();
			this.currentAudio.currentTime = 0;
			this.currentAudio = null;
		}
		this.isPlaying = false;
	}

	removeTooltip() {
		if (this.tooltip) {
			this.tooltip.remove();
			this.tooltip = null;
		}
		this.isHoverTooltip = false;
		this.currentTarget = null;
	}
}

export const appState = new AppState();
