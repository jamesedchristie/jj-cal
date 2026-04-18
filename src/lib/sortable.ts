import Sortable from 'sortablejs';

interface SortableOptions {
	onReorder: (orderedIds: string[]) => void;
	disabled?: boolean;
}

export function sortable(options: SortableOptions) {
	return (el: HTMLElement) => {
		if (options.disabled) return;

		const instance = new Sortable(el, {
			animation: 150,
			handle: '.drag-handle',
			ghostClass: 'drag-ghost',
			chosenClass: 'drag-chosen',
			forceFallback: true, // required for touch
			delay: 100,
			delayOnTouchOnly: true,
			onEnd() {
				const ids = [...el.querySelectorAll<HTMLElement>('[data-id]')]
					.map((n) => n.dataset.id!)
					.filter(Boolean);
				options.onReorder(ids);
			}
		});

		return () => instance.destroy();
	};
}
