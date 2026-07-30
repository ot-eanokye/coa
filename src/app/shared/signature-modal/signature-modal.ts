import { Component, input, output, signal } from '@angular/core';
import { SignaturePad } from '../signature-pad/signature-pad';

@Component({
  selector: 'app-signature-modal',
  standalone: true,
  imports: [SignaturePad],
  templateUrl: './signature-modal.html',
  styleUrl: './signature-modal.scss',
})
export class SignatureModal {
  readonly busy = input(false);
  readonly confirmed = output<{ dataUrl: string; save: boolean }>();
  readonly cancelled = output<void>();

  readonly sig = signal<string | null>(null);
  readonly save = signal(true);
  readonly error = signal<string | null>(null);

  confirm(): void {
    if (this.busy()) return;
    const value = this.sig();
    if (!value) {
      this.error.set('Please provide a signature to continue.');
      return;
    }
    this.confirmed.emit({ dataUrl: value, save: this.save() });
  }

  onChanged(value: string | null): void {
    this.sig.set(value);
    if (value) this.error.set(null);
  }
}
