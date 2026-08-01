import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Batch as WBatch, BatchService, STAGE_LABEL } from '../../core/batch.service';

type Status = 'IN PROGRESS' | 'FLAGGED' | 'COMPLETED' | 'AWAITING REVIEW';

@Component({
  selector: 'app-qc-queue',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './qc-queue.html',
  styleUrl: './qc-queue.scss',
})
export class QcQueue implements OnInit {
  private readonly batchSvc = inject(BatchService);

  readonly tabs = ['All', 'Pending Entry', 'Under Review', 'Pending Approval'];
  readonly activeTab = signal('All');

  readonly all = signal<WBatch[]>([]);
  readonly released = signal<WBatch[]>([]);
  readonly loading = signal(true);

  readonly rows = computed(() => {
    const tab = this.activeTab();
    return this.all().filter((b) => {
      if (tab === 'Pending Entry') return b.stage === 'results_entry';
      if (tab === 'Under Review') return b.stage === 'senior_review';
      if (tab === 'Pending Approval') return b.stage === 'qc_approval';
      return true;
    });
  });

  readonly totalActive = computed(() => this.pad(this.all().length));
  readonly completed = computed(() => this.pad(this.released().length));
  readonly pendingApproval = computed(() =>
    this.pad(this.all().filter((b) => b.stage === 'qc_approval').length),
  );

  ngOnInit(): void {
    Promise.all([this.batchSvc.listActive(), this.batchSvc.listReleased()])
      .then(([active, released]) => {
        this.all.set(active);
        this.released.set(released);
      })
      .catch(() => {})
      .finally(() => this.loading.set(false));
  }

  stageLabel(b: WBatch): string {
    return STAGE_LABEL[b.stage];
  }

  status(b: WBatch): Status {
    switch (b.stage) {
      case 'rejected':
        return 'FLAGGED';
      case 'senior_review':
      case 'qc_approval':
        return 'AWAITING REVIEW';
      case 'released':
      case 'production_released':
        return 'COMPLETED';
      default:
        return 'IN PROGRESS';
    }
  }

  private pad(n: number): string {
    return n < 10 ? `0${n}` : String(n);
  }
}
