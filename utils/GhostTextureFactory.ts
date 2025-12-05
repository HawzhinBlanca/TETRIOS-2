
export type GhostStyle = 'neon' | 'dashed' | 'solid';

class GhostTextureFactory {
    private cache: Map<string, string> = new Map();
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private readonly SIZE = 64; // High resolution for sharpness

    constructor() {
        if (typeof document !== 'undefined') {
            this.canvas = document.createElement('canvas');
            this.canvas.width = this.SIZE;
            this.canvas.height = this.SIZE;
            this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
        } else {
            // Server-side fallback (if needed, though this is client-side logic)
            this.canvas = null as any;
            this.ctx = null as any;
        }
    }

    public getBody(rgb: string, style: GhostStyle): string {
        if (!this.ctx) return '';
        const key = `body-${rgb}-${style}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        this.ctx.clearRect(0, 0, this.SIZE, this.SIZE);
        const [r, g, b] = rgb.split(',').map(Number);
        
        // Settings based on style
        const lineWidth = style === 'dashed' ? 4 : 6;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeStyle = `rgba(${r},${g},${b}, 0.8)`;
        this.ctx.fillStyle = `rgba(${r},${g},${b}, 0.15)`; // Slight fill

        if (style === 'dashed') {
            this.ctx.setLineDash([10, 6]);
        } else {
            this.ctx.setLineDash([]);
        }

        // Draw Rect (Inset by half line width to avoid clipping)
        const offset = lineWidth / 2;
        const size = this.SIZE - lineWidth;
        
        this.ctx.beginPath();
        if (style === 'solid' || style === 'neon') {
            // Rounded corners for solid/neon
            const radius = 8;
            this.ctx.roundRect(offset, offset, size, size, radius);
        } else {
            this.ctx.rect(offset, offset, size, size);
        }
        
        this.ctx.fill();
        this.ctx.stroke();

        const url = this.canvas.toDataURL();
        this.cache.set(key, url);
        return url;
    }

    public getGlow(rgb: string): string {
        if (!this.ctx) return '';
        const key = `glow-${rgb}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        this.ctx.clearRect(0, 0, this.SIZE, this.SIZE);
        const [r, g, b] = rgb.split(',').map(Number);
        
        const center = this.SIZE / 2;
        // Soft radial glow
        const grad = this.ctx.createRadialGradient(
            center, center, this.SIZE * 0.2,
            center, center, this.SIZE * 0.5
        );
        grad.addColorStop(0, `rgba(${r},${g},${b}, 0.6)`);
        grad.addColorStop(1, `rgba(${r},${g},${b}, 0)`);

        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.SIZE, this.SIZE);

        const url = this.canvas.toDataURL();
        this.cache.set(key, url);
        return url;
    }
}

export const ghostTextureFactory = new GhostTextureFactory();
