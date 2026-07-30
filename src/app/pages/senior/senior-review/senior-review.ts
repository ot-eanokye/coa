import { Component, inject, OnInit, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Batch, BatchEvent, BatchResult, BatchService } from '../../../core/batch.service';
import { AuthService } from '../../../core/auth.service';
import { SignatureModal } from '../../../shared/signature-modal/signature-modal';

@Component({
  selector: 'app-senior-review',
  standalone: true,
  imports: [FormsModule, UpperCasePipe, SignatureModal],
  templateUrl: './senior-review.html',
  styleUrl: './senior-review.scss',
})
export class SeniorReview implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly batches = inject(BatchService);
  private readonly auth = inject(AuthService);

  readonly batch = signal<Batch | null>(null);
  readonly rows = signal<BatchResult[]>([]);
  readonly events = signal<BatchEvent[]>([]);
  readonly comments = signal('');
  readonly verified = signal(false);

  readonly loading = signal(true);
  readonly working = signal(false);
  readonly showSig = signal(false);
  readonly error = signal<string | null>(null);

  private id = '';

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const { batch, results, events } = await this.batches.getFull(this.id);
      this.batch.set(batch);
      this.rows.set(results);
      this.events.set(events);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load the batch.');
    } finally {
      this.loading.set(false);
    }
  }

  async verify(): Promise<void> {
    if (this.working()) {
      return;
    }
    this.error.set(null);
    if (!this.verified()) {
      this.error.set('Please confirm you have verified all results against the master specification.');
      return;
    }
    const saved = this.auth.profile()?.signature_url;
    if (saved) {
      await this.doVerify(saved);
    } else {
      this.showSig.set(true);
    }
  }

  async onSigned(e: { dataUrl: string; save: boolean }): Promise<void> {
    this.showSig.set(false);
    if (e.save) {
      try {
        await this.auth.saveSignature(e.dataUrl);
      } catch {
        /* best-effort */
      }
    }
    await this.doVerify(e.dataUrl);
  }

  private async doVerify(signature: string): Promise<void> {
    this.working.set(true);
    try {
      await this.batches.seniorVerify(this.id, signature, this.comments().trim() || undefined);
      await this.router.navigate(['/senior/dashboard']);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not forward the batch.');
    } finally {
      this.working.set(false);
    }
  }

  eventTime(e: BatchEvent): string {
    return new Date(e.created_at).toLocaleString();
  }
}
