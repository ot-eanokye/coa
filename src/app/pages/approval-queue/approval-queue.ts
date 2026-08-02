import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Batch, BatchService } from '../../core/batch.service';

interface StageCard {
  title: string;
  icon: 'shield' | 'check' | 'clipboard' | 'truck';
  label: string;
  value: string;
  valueTone: 'green' | 'blue';
  note: string;
}

@Component({
  selector: 'app-approval-queue',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './approval-queue.html',
  styleUrl: './approval-queue.scss',
})
export class ApprovalQueue implements OnInit {
  private readonly batches = inject(BatchService);

  readonly released = signal<Batch[]>([]);
  readonly loading = signal(true);
  readonly busyId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly query = signal('');
  readonly category = signal('');

  readonly categories = computed(() => [...new Set(this.released().map((b) => b.category).filter(Boolean))]);
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const c = this.category();
    return this.released().filter(
      (b) =>
        (!c || b.category === c) &&
        (!q || [b.batch_no, b.product_name, b.analyst_name].some((v) => v?.toLowerCase().includes(q))),
    );
  });

  readonly stages = computed<StageCard[]>(() => [
    { title: 'Analyst Verification', icon: 'shield', label: 'DIGITAL SIGNATURE', value: 'VERIFIED', valueTone: 'green', note: 'Signatures captured at each sign-off.' },
    { title: 'Senior Analyst Review', icon: 'check', label: 'VERIFICATION STATUS', value: 'VERIFIED', valueTone: 'green', note: 'Results cross-checked before QC approval.' },
    { title: 'QC Manager Approval', icon: 'clipboard', label: 'APPROVAL STATUS', value: 'COMPLETED', valueTone: 'green', note: 'Chemical and microbiological tests validated.' },
    { title: 'Dispatch Readiness', icon: 'truck', label: 'BATCH QUEUE', value: `${this.released().length} PENDING`, valueTone: 'blue', note: 'Awaiting dispatch to production.' },
  ]);

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.released.set(await this.batches.listByStage('released'));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load approvals.');
    } finally {
      this.loading.set(false);
    }
  }

  async dispatch(batch: Batch): Promise<void> {
    if (this.busyId()) return;
    this.busyId.set(batch.id);
    this.error.set(null);
    try {
      await this.batches.productionSignOff(batch.id);
      this.released.update((list) => list.filter((b) => b.id !== batch.id));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not dispatch the batch.');
    } finally {
      this.busyId.set(null);
    }
  }

  approvalDate(b: Batch): string {
    return (b.updated_at ?? '').slice(0, 10);
  }
}
