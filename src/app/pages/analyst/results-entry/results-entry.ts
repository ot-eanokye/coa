import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Location, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Batch, BatchResult, BatchService } from '../../../core/batch.service';

interface EditableResult {
  id: string;
  parameter: string;
  specification: string | null;
  result_value: string;
  status: BatchResult['status'];
  parent: string | null;
}

@Component({
  selector: 'app-results-entry',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './results-entry.html',
  styleUrl: './results-entry.scss',
})
export class ResultsEntry implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly batches = inject(BatchService);

  readonly batch = signal<Batch | null>(null);
  readonly rows = signal<EditableResult[]>([]);
  readonly startedDate = signal('');
  readonly completedDate = signal('');

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  /** Names of tests that have sub-tests — these act as group headers, not result rows. */
  readonly groupNames = computed(
    () =>
      new Set(
        this.rows()
          .filter((r) => r.parent)
          .map((r) => r.parent as string),
      ),
  );

  isGroupHeader(row: EditableResult): boolean {
    return !row.parent && this.groupNames().has(row.parameter);
  }

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
          parent: r.parent,
        })),
      );
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load the batch.');
    } finally {
      this.loading.set(false);
    }
  }

  setValue(id: string, value: string): void {
    this.rows.update((list) =>
      list.map((r) => {
        if (r.id !== id) return r;
        // Clearing the result clears the analyst's mark; otherwise leave it untouched.
        return { ...r, result_value: value, status: value.trim() ? r.status : 'pending' };
      }),
    );
  }

  /** Analyst explicitly marks a result. Click the active choice again to clear it. */
  setStatus(id: string, status: 'pass' | 'fail'): void {
    this.rows.update((list) =>
      list.map((r) => {
        // A result must be entered before it can be marked.
        if (r.id !== id || !r.result_value.trim()) return r;
        return { ...r, status: r.status === status ? 'pending' : status };
      }),
    );
  }

  back(): void {
    this.location.back();
  }

  async saveDraft(): Promise<void> {
    if (this.saving()) return;
    this.error.set(null);
    this.saving.set(true);
    try {
      // Persist results without a completion date so the batch stays in data entry.
      await this.batches.saveResults(
        this.id,
        this.rows().map((r) => ({ id: r.id, result_value: r.result_value, status: r.status })),
      );
      await this.router.navigate(['/analyst/dashboard']);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the draft.');
    } finally {
      this.saving.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.error.set(null);
    const missing = this.rows().some((row) => !this.isGroupHeader(row) && !row.result_value.trim());
    if (missing) {
      this.error.set('Enter a result for every test before submitting for review.');
      return;
    }
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
