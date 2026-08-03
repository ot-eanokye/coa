import { Component, inject, OnInit, signal } from '@angular/core';
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
  private readonly location = inject(Location);
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
    this.rows.update((list) =>
      list.map((r) => {
        if (r.id !== id) return r;
        // No result entered → always pending.
        if (!value.trim()) return { ...r, result_value: value, status: 'pending' };
        // Auto-evaluate numeric specs; leave text specs for manual toggle.
        const auto = this.evaluate(r.specification, value);
        return { ...r, result_value: value, status: auto ?? r.status };
      }),
    );
  }

  cycleStatus(id: string): void {
    const next: Record<BatchResult['status'], BatchResult['status']> = {
      pending: 'pass',
      pass: 'fail',
      fail: 'pending',
    };
    this.rows.update((list) =>
      list.map((r) => {
        // Only allow a manual status change once a result has been entered.
        if (r.id !== id || !r.result_value.trim()) return r;
        return { ...r, status: next[r.status] };
      }),
    );
  }

  /**
   * Compare a numeric result against a specification range/bound.
   * Returns 'pass'/'fail', or null when the spec is non-numeric (manual check).
   */
  private evaluate(spec: string | null, value: string): 'pass' | 'fail' | null {
    if (!spec) return null;
    const num = parseFloat(value.replace(/[^0-9.\-]/g, ''));
    if (isNaN(num)) return null;
    const nums = (spec.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    const s = spec.toLowerCase();
    // Range: "a - b", "a to b", "a–b"
    if (nums.length >= 2 && /(-|–|to)/.test(s)) {
      const [a, b] = [nums[0], nums[1]].sort((x, y) => x - y);
      return num >= a && num <= b ? 'pass' : 'fail';
    }
    if (nums.length >= 1) {
      const a = nums[0];
      if (/(≥|>=|nlt|not less than|min|minimum)/.test(s)) return num >= a ? 'pass' : 'fail';
      if (/(≤|<=|nmt|not more than|max|maximum)/.test(s)) return num <= a ? 'pass' : 'fail';
      if (/>/.test(s)) return num > a ? 'pass' : 'fail';
      if (/</.test(s)) return num < a ? 'pass' : 'fail';
    }
    return null;
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
