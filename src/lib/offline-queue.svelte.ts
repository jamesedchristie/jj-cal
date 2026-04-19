const STORAGE_KEY = 'jj-cal-write-queue';

interface QueuedWrite {
	id: string;
	url: string;
	body: string; // application/x-www-form-urlencoded
	timestamp: number;
}

function loadFromStorage(): QueuedWrite[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
	} catch {
		return [];
	}
}

class OfflineQueue {
	#queue = $state<QueuedWrite[]>(loadFromStorage());
	online = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);

	constructor() {
		if (typeof window === 'undefined') return;
		window.addEventListener('online', () => {
			this.online = true;
			this.drain();
		});
		window.addEventListener('offline', () => {
			this.online = false;
		});
	}

	get pendingCount() {
		return this.#queue.length;
	}

	enqueue(url: string, body: string): void {
		this.#queue.push({ id: crypto.randomUUID(), url, body, timestamp: Date.now() });
		this.#save();
	}

	async drain(): Promise<void> {
		if (this.#queue.length === 0) return;
		const toProcess = [...this.#queue];
		const failed: QueuedWrite[] = [];
		for (const write of toProcess) {
			try {
				const res = await fetch(write.url, {
					method: 'POST',
					body: write.body,
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
				});
				if (!res.ok) failed.push(write);
			} catch {
				failed.push(write);
			}
		}
		this.#queue = failed;
		this.#save();
	}

	#save() {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#queue));
		}
	}
}

export const offlineQueue = new OfflineQueue();
