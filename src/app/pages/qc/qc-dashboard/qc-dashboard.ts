import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Batch, BatchService } from '../../../core/batch.service';

interface OpCard {
  title: string;
  desc: string;
  cta: string;
  icon: 'assign' | 'approve' | 'archive';
  link: string;
}

interface Workload {
  name: string;
  count: number;
  percent: number;
}

@Component({
  selector: 'app-qc-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './qc-dashboard.html',
  styleUrl: './qc-dashboard.scss',
})
export class QcDashboard implements OnInit {
  private readonly batches = inject(BatchService);

  readonly releases = signal<Batch[]>([]);
  readonly active = signal<Batch[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly pendingCount = computed(() => this.active().filter((b) => b.stage === 'qc_approval').length);

  readonly workload = computed<Workload[]>(() => {
    const map = new Map<string, number>();
    for (const b of this.active()) {
      const name = b.analyst_name || 'Unassigned';
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    const max = Math.max(1, ...map.values());
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, percent: Math.round((count / max) * 100) }));
  });

  readonly ops: OpCard[] = [
    { title: 'Assign Batches', desc: 'Route incoming samples to available analysts.', cta: 'MANAGE', icon: 'assign', link: '/qc/assign' },
    { title: 'Approval Queue', desc: 'Review and release batches checked by Seniors.', cta: 'START REVIEW', icon: 'approve', link: '/qc/approvals' },
    { title: 'CoA Archive', desc: 'Retrieve historical Certificates of Analysis.', cta: 'BROWSE', icon: 'archive', link: '/qc/documents' },
  ];

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.releases.set(await this.batches.listReleased());
      this.active.set(await this.batches.listActive());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load the dashboard.');
    } finally {
      this.loading.set(false);
    }
  }

  releaseDate(b: Batch): string {
    return (b.updated_at ?? '').slice(0, 16).replace('T', ' ');
  }
}
