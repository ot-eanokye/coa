import { AfterViewInit, Component, ElementRef, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-signature-pad',
  standalone: true,
  templateUrl: './signature-pad.html',
  styleUrl: './signature-pad.scss',
})
export class SignaturePad implements AfterViewInit {
  readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  readonly initial = input<string | null>(null);
  readonly changed = output<string | null>();

  private ctx!: CanvasRenderingContext2D;
  private drawing = false;
  private hasContent = false;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111';
    this.ctx = ctx;
    const init = this.initial();
    if (init) {
      this.loadDataUrl(init, false);
    }
  }

  start(e: PointerEvent): void {
    e.preventDefault();
    this.drawing = true;
    const { x, y } = this.pos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  move(e: PointerEvent): void {
    if (!this.drawing) return;
    e.preventDefault();
    const { x, y } = this.pos(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.hasContent = true;
  }

  end(): void {
    if (!this.drawing) return;
    this.drawing = false;
    this.emit();
  }

  clear(): void {
    const c = this.canvasRef().nativeElement;
    this.ctx.clearRect(0, 0, c.width, c.height);
    this.hasContent = false;
    this.changed.emit(null);
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.loadDataUrl(reader.result as string, true);
    reader.readAsDataURL(file);
    input.value = '';
  }

  private loadDataUrl(url: string, emit: boolean): void {
    const img = new Image();
    img.onload = () => {
      const c = this.canvasRef().nativeElement;
      this.ctx.clearRect(0, 0, c.width, c.height);
      const scale = Math.min(c.width / img.width, c.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      this.ctx.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
      this.hasContent = true;
      if (emit) this.emit();
    };
    img.src = url;
  }

  private pos(e: PointerEvent): { x: number; y: number } {
    const canvas = this.canvasRef().nativeElement;
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  }

  private emit(): void {
    const c = this.canvasRef().nativeElement;
    this.changed.emit(this.hasContent ? c.toDataURL('image/png') : null);
  }
}
