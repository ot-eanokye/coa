import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Batch, BatchEvent, BatchResult, BatchService } from '../../../core/batch.service';
import { AuthService } from '../../../core/auth.service';
import { SignatureModal } from '../../../shared/signature-modal/signature-modal';

@Component({
  selector: 'app-qc-verify',
  standalone: true,
  imports: [FormsModule, UpperCasePipe, SignatureModal],
  templateUrl: './qc-verify.html',
  styleUrl: './qc-verify.scss',
})
export class QcVerify implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly batches = inject(BatchService);
  private readonly auth = inject(AuthService);

  readonly batch = signal<Batch | null>(null);
  readonly rows = signal<BatchResult[]>([]);
  readonly events = signal<BatchEvent[]>([]);
  readonly comments = signal('');
  readonly loading = signal(true);
  readonly working = signal(false);
  readonly showSig = signal(false);
  readonly error = signal<string | null>(null);

  readonly allPass = computed(() => this.rows().length > 0 && this.rows().every((r) => r.status === 'pass'));

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

  async approve(): Promise<void> {
    if (this.working()) return;
    this.error.set(null);
    const saved = this.auth.profile()?.signature_url;
    if (saved) {
      await this.doApprove(saved);
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
    await this.doApprove(e.dataUrl);
  }

  private async doApprove(signature: string): Promise<void> {
    await this.act(
      () => this.batches.qcApprove(this.id, signature, this.comments().trim() || undefined),
      '/qc/dashboard',
    );
  }

  async reject(): Promise<void> {
    await this.act(() => this.batches.reject(this.id, this.comments().trim() || undefined), '/qc/approvals');
  }

  private async act(fn: () => Promise<void>, dest: string): Promise<void> {
    if (this.working()) {
      return;
    }
    this.error.set(null);
    this.working.set(true);
    try {
      await fn();
      await this.router.navigateByUrl(dest);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      this.working.set(false);
    }
  }

  eventTime(e: BatchEvent): string {
    return new Date(e.created_at).toLocaleString();
  }
}
