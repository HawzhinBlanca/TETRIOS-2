
type EventHandler<T = any> = (payload: T) => void;

export class EventManager {
    private listeners: Map<string, Set<EventHandler>> = new Map();

    public on<T>(event: string, handler: EventHandler<T>): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(handler);
    }

    public off<T>(event: string, handler: EventHandler<T>): void {
        if (this.listeners.has(event)) {
            this.listeners.get(event)!.delete(handler);
        }
    }

    public emit<T>(event: string, payload?: T): void {
        if (this.listeners.has(event)) {
            this.listeners.get(event)!.forEach(handler => handler(payload));
        }
    }

    public clear(): void {
        this.listeners.clear();
    }
}
