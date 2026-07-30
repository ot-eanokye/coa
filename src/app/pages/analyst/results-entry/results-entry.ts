import { Component, inject, OnInit, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Batch, BatchResult, BatchService } from '../../../core/batch.service';

interface EditableResult {
  id: string;
  parameter: string;
  specification: string | null;
  result_value: string;
  status: BatchResult['status'];
}

@Component({
  selector: 'app-results-entry',
  standalone: true,
  imports: [FormsModule, UpperCasePipe],
  templateUrl: './results-entry.html',
  styleUrl: './results-entry.scss',
})
export class ResultsEntry implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly batches = inject(BatchService);

  readonly batch = signal<Batch | null>(null);
  readonly rows = signal<EditableResult[]>([]);
  readonly startedDate = signal('');
  readonly completedDate = signal('');

  readonly loading = signal(true);
  readonly saving = signal(false);
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
      this.startedDate.set(batch.analysis_started ?? '');
      this.completedDate.set(batch.analysis_completed ?? '');
      this.rows.set(
        results.map((r) => ({
          id: r.id,
          parameter: r.parameter,
          specification: r.specification,
          result_value: r.result_value ?? '',
          status: r.status,
        })),
      );
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load the batch.');
    } finally {
      this.loading.set(false);
    }
  }

  setValue(id: string, value: string): void {
    this.rows.update((list) => list.map((r) => (r.id === id ? { ...r, result_value: value } : r)));
  }

  cycleStatus(id: string): void {
    const next: Record<BatchResult['status'], BatchResult['status']> = {
      pending: 'pass',
      pass: 'fail',
      fail: 'pending',
    };
    this.rows.update((list) =>
      list.map((r) => (r.id === id ? { ...r, status: next[r.status] } : r)),
    );
  }

  async submit(): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    try {
      await this.batches.saveResults(
        this.id,
        this.rows().map((r) => ({ id: r.id, result_value: r.result_value, status: r.status })),
        this.completedDate() || new Date().toISOString().slice(0, 10),
      );
      await this.router.navigate(['/analyst/batch', this.id, 'review']);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the results.');
    } finally {
      this.saving.set(false);
    }
  }
}
