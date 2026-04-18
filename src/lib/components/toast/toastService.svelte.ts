import { createContext } from 'svelte';

export class ToastMessage {
	id: string;
	message: string;
	type: 'default' | 'success' | 'error';
	detail: string | null;
	timeout: number;
	constructor(
		msg: string,
		options?: { type?: 'default' | 'success' | 'error'; detail?: string; timeout?: number }
	) {
		const { type = 'default', detail = null, timeout = 2000 } = options || {};
		this.id = Date.now().toString(36) + Math.random().toString(36).slice(2);
		this.message = msg;
		this.type = type;
		this.detail = detail;
		this.timeout = timeout;
	}
}

export class ToastService {
	toasts = $state<ToastMessage[]>([]);
	constructor() {}

	show(t: ToastMessage) {
		this.toasts.push(t);
		setTimeout(() => {
			this.toasts = this.toasts.filter((t2) => t2.id !== t.id);
		}, t.timeout);
	}
}

export const [getToastService, setToastService] = createContext<() => ToastService>();
