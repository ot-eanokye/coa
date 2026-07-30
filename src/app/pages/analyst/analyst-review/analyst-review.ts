import { Component, inject, OnInit, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Batch, BatchResult, BatchService } from '../../../core/batch.service';

@Component({
  selector: 'app-analyst-review',
  standalone: true,
  imports: [UpperCasePipe],
  templateUrl: './analyst-review.html',
  styleUrl: './analyst-review.scss',
})
export class AnalystReview implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly batches = inject(BatchService);

  readonly batch = signal<Batch | null>(null);
  readonly rows = signal<BatchResult[]>([]);
  readonly verified = signal(false);
  readonly loading = signal(true);
  readonly forwarding = signal(false);
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
      const { batch, results } = await this.batches.getFull(this.id);
      this.batch.set(batch);
      this.rows.set(results);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load the batch.');
    } finally {
      this.loading.set(false);
    }
  }

  async forward(): Promise<void> {
    if (this.forwarding()) {
      return;
    }
    this.error.set(null);
    if (!this.verified()) {
      this.error.set('Please confirm you have verified all results against the master specification.');
      return;
    }
    this.forwarding.set(true);
    try {
      await this.batches.forwardToSenior(this.id);
      await this.router.navigate(['/analyst/dashboard']);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not forward the batch.');
    } finally {
      this.forwarding.set(false);
    }
  }
}
