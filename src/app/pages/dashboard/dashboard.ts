import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Batch, BatchService, STAGE_LABEL } from '../../core/batch.service';

interface Operation {
  title: string;
  desc: string;
  icon: 'certificate' | 'approval' | 'retrieval';
  link: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly batches = inject(BatchService);

  readonly activity = signal<Batch[]>([]);
  readonly loading = signal(true);
  readonly query = signal('');

  readonly filteredActivity = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.activity();
    return this.activity().filter((b) =>
      [b.batch_no, b.product_name, b.analyst_name].filter(Boolean).some((v) => v!.toLowerCase().includes(q)),
    );
  });

  readonly operations: Operation[] = [
    { title: 'Certificate Management', desc: 'Maintain product profiles and specifications.', icon: 'certificate', link: '/products' },
    { title: 'Approval Queue', desc: 'Review and approve CoA reports for final release.', icon: 'approval', link: '/approvals' },
    { title: 'Certificate Retrieval', desc: 'Access and retrieve historical certificates across departments.', icon: 'retrieval', link: '/archived' },
  ];

  ngOnInit(): void {
    this.batches
      .listRecent(8)
      .then((b) => this.activity.set(b))
      .catch(() => this.activity.set([]))
      .finally(() => this.loading.set(false));
  }

  stageLabel(b: Batch): string {
    return STAGE_LABEL[b.stage];
  }

  statusTone(b: Batch): 'released' | 'review' | 'oos' {
    if (b.stage === 'released' || b.stage === 'production_released') return 'released';
    if (b.stage === 'rejected') return 'oos';
    return 'review';
  }

  date(b: Batch): string {
    const d = new Date(b.updated_at);
    return isNaN(d.getTime())
      ? ''
      : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  }
}
