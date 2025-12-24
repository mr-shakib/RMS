export class ChristmasTheme {
    private static instance: ChristmasTheme;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private snowflakes: Snowflake[] = [];
    private animationFrame: number | null = null;
    private isEnabled: boolean = false;

    private constructor() { }

    public static getInstance(): ChristmasTheme {
        if (!ChristmasTheme.instance) {
            ChristmasTheme.instance = new ChristmasTheme();
        }
        return ChristmasTheme.instance;
    }

    public enable(): void {
        if (this.isEnabled) return;
        this.isEnabled = true;
        document.body.classList.add('christmas-theme');
        this.initSnowfall();
    }

    public disable(): void {
        if (!this.isEnabled) return;
        this.isEnabled = false;
        document.body.classList.remove('christmas-theme');
        this.stopSnowfall();
    }

    private initSnowfall(): void {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'snow-canvas';
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.createSnowflakes();
        this.animate();
    }

    private stopSnowfall(): void {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.canvas = null;
        this.ctx = null;
        this.snowflakes = [];
    }

    private resizeCanvas(): void {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    private createSnowflakes(): void {
        const count = 100;
        for (let i = 0; i < count; i++) {
            this.snowflakes.push(new Snowflake(window.innerWidth, window.innerHeight));
        }
    }

    private animate(): void {
        if (!this.ctx || !this.canvas) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

        this.snowflakes.forEach(snowflake => {
            snowflake.update();
            snowflake.draw(this.ctx!);
        });

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    public addFestiveDecorations(): void {
        // This can be used to inject additional emoji-based decorations if needed
        console.log('[Christmas] Adding festive decorations...');
    }
}

class Snowflake {
    private x: number;
    private y: number;
    private radius: number;
    private speed: number;
    private wind: number;
    private width: number;
    private height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.radius = Math.random() * 3 + 1;
        this.speed = Math.random() * 1 + 0.5;
        this.wind = Math.random() * 0.5 - 0.25;
    }

    public update(): void {
        this.y += this.speed;
        this.x += this.wind;

        if (this.y > this.height) {
            this.y = -10;
            this.x = Math.random() * this.width;
        }

        if (this.x > this.width) {
            this.x = 0;
        } else if (this.x < 0) {
            this.x = this.width;
        }
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}
