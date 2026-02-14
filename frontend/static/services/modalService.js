import { $ce } from '../utils/dom.js';
import { deleteAllHistory } from './channelService.js';

export function showDeleteModal() {
	const modal = $ce('div');
	modal.className =
		'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';

	const modalContent = $ce('div');
	modalContent.style.borderRadius = '15px';
	modalContent.style.backgroundColor = '#2F2F2F';
	modalContent.className = 'text-white p-6 rounded shadow-lg text-center';
	modalContent.innerHTML = `<strong>Are you sure you want to delete the chat history?</strong>`;

	const buttonContainer = $ce('div');
	buttonContainer.className = 'mt-4 flex justify-center gap-4';

	const confirmButton = createButton(
		'Confirm',
		'bg-red-500 hover:bg-red-600'
	);
	const cancelButton = createButton('Cancel', 'hover:bg-gray-700', true);

	buttonContainer.append(cancelButton, confirmButton);
	modalContent.appendChild(buttonContainer);
	modal.appendChild(modalContent);
	document.body.appendChild(modal);

	confirmButton.onclick = async () => {
		try {
			await deleteAllHistory();
			document.body.removeChild(modal);
		} catch (error) {
			console.error('Error confirming delete:', error);
		}
	};

	cancelButton.onclick = () => document.body.removeChild(modal);
}

function createButton(text, className, hasBorder = false) {
	const button = $ce('button');
	button.textContent = text;
	button.className = `text-white px-4 py-2 rounded transition ${className}`;
	button.style.borderRadius = '50px';

	if (hasBorder) {
		button.style.border = '2px solid gray';
	}

	return button;
}
