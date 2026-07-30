import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Batch, BatchEvent, BatchResult, BatchService } from '../../core/batch.service';
import { ProductsService } from '../../core/products.service';

interface SignOff {
  designation: string;
  name: string;
  date: string;
  signature: string | null;
}

@Component({
  selector: 'app-coa-certificate',
  standalone: true,
  templateUrl: './coa-certificate.html',
  styleUrl: './coa-certificate.scss',
})
export class CoaCertificate implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly batches = inject(BatchService);
  private readonly products = inject(ProductsService);

  readonly batch = signal<Batch | null>(null);
  readonly results = signal<BatchResult[]>([]);
  readonly events = signal<BatchEvent[]>([]);
  readonly composition = signal<string>('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private id = '';

  readonly released = computed(() => {
    const s = this.batch()?.stage;
    return s === 'released' || s === 'production_released';
  });
  readonly rejected = computed(() => this.batch()?.stage === 'rejected');

  readonly analysedBy = computed<SignOff>(() => ({
    designation: 'Analyst',
    name: this.batch()?.analyst_name ?? '',
    date: this.fmt(this.eventDate('Ready for Senior Analyst Check') ?? this.batch()?.analysis_completed),
    signature: this.eventSignature('Ready for Senior Analyst Check'),
  }));

  readonly checkedBy = computed<SignOff>(() => ({
    designation: 'Senior Analyst',
    name: this.eventActor('Senior Analyst Checked'),
    date: this.fmt(this.eventDate('Senior Analyst Checked')),
    signature: this.eventSignature('Senior Analyst Checked'),
  }));

  readonly approvedBy = computed<SignOff>(() => ({
    designation: 'Q.C. Manager',
    name: this.eventActor('Approved & Released'),
    date: this.fmt(this.eventDate('Approved & Released')),
    signature: this.eventSignature('Approved & Released'),
  }));

  readonly verificationId = computed(() => {
    const b = this.batch();
    if (!b) return '';
    const year = (b.analysis_started ?? b.created_at ?? '').slice(0, 4) || new Date().getFullYear();
    return `EC-QC-${year}-${b.batch_no}`;
  });

  readonly categoryLabel = computed(() => (this.batch()?.category ?? '').toUpperCase());

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
      this.results.set(results);
      this.events.set(events);
      if (batch.product_id) {
        try {
          const { product } = await this.products.get(batch.product_id);
          this.composition.set(product.active_ingredients ?? '');
        } catch {
          /* product may have been removed */
        }
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load the certificate.');
    } finally {
      this.loading.set(false);
    }
  }

  print(): void {
    window.print();
  }

  exportPdf(): void {
    const prev = document.title;
    document.title = `CoA-${this.batch()?.batch_no ?? this.id}`;
    window.print();
    setTimeout(() => (document.title = prev), 500);
  }

  back(): void {
    this.location.back();
  }

  fmt(d?: string | null): string {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return d; // e.g. "05-2026"
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${dd}-${mm}-${date.getFullYear()}`;
  }

  private eventFor(action: string): BatchEvent | undefined {
    return this.events().find((e) => e.action === action);
  }
  private eventActor(action: string): string {
    return this.eventFor(action)?.actor_name ?? '';
  }
  private eventDate(action: string): string | undefined {
    return this.eventFor(action)?.created_at;
  }
  private eventSignature(action: string): string | null {
    return this.eventFor(action)?.signature ?? null;
  }
}
