import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Batch, BatchService, STAGE_LABEL } from '../../../core/batch.service';

@Component({
  selector: 'app-analyst-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './analyst-dashboard.html',
  styleUrl: './analyst-dashboard.scss',
})
export class AnalystDashboard implements OnInit {
  private readonly batches = inject(BatchService);

  readonly all = signal<Batch[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly active = computed(() =>
    this.all().filter((b) => b.stage === 'results_entry' || b.stage === 'rejected'),
  );

  readonly assignedCount = computed(() => this.pad(this.all().length));
  readonly inProgressCount = computed(() =>
    this.pad(this.all().filter((b) => b.stage === 'results_entry').length),
  );
  readonly completedCount = computed(() =>
    this.pad(
      this.all().filter((b) => b.stage !== 'results_entry' && b.stage !== 'rejected').length,
    ),
  );

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.all.set(await this.batches.listAllMine());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load your batches.');
    } finally {
      this.loading.set(false);
    }
  }

  stageLabel(b: Batch): string {
    return STAGE_LABEL[b.stage];
  }

  stageType(b: Batch): 'data' | 'correction' {
    return b.stage === 'rejected' ? 'correction' : 'data';
  }

  resumeLink(b: Batch): string {
    return `/analyst/batch/${b.id}/results`;
  }

  private pad(n: number): string {
    return n < 10 ? `0${n}` : String(n);
  }
}
