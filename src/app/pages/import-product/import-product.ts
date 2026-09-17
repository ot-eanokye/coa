import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ExtractedSpec, PdfExtractService } from '../../core/pdf-extract.service';
import { ProductsService } from '../../core/products.service';
import { isValidDateRange, isMonthYear } from '../../core/validation';

@Component({
  selector: 'app-import-product',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './import-product.html',
  styleUrl: './import-product.scss',
})
export class ImportProduct {
  private readonly extractor = inject(PdfExtractService);
  private readonly products = inject(ProductsService);
  private readonly router = inject(Router);

  readonly extracting = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasResult = signal(false);
  readonly fileName = signal('');
  readonly dragOver = signal(false);

  readonly name = signal('');
  readonly category = signal('');
  readonly batchNo = signal('');
  readonly mfgDate = signal('');
  readonly expDate = signal('');
  readonly composition = signal('');
  readonly specs = signal<ExtractedSpec[]>([]);

  readonly categories = ['Syrup', 'Tablet', 'Capsule'];

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(true);
  }
  onDragLeave(): void {
    this.dragOver.set(false);
  }
  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) this.handle(file);
  }
  onBrowse(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.handle(file);
    input.value = '';
  }

  private async handle(file: File): Promise<void> {
    this.error.set(null);
    this.fileName.set(file.name);
    this.extracting.set(true);
    try {
      const r = await this.extractor.extract(file);
      this.name.set(r.name);
      this.category.set(r.category);
      this.batchNo.set(r.batch_no);
      this.mfgDate.set(r.mfg_date);
      this.expDate.set(r.exp_date);
      this.composition.set(r.active_ingredients);
      this.specs.set(r.specs);
      this.hasResult.set(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not read the document.');
      this.hasResult.set(false);
    } finally {
      this.extracting.set(false);
    }
  }

  updateSpec(i: number, key: keyof ExtractedSpec, value: string): void {
    this.specs.update((list) => list.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));
  }
  addSpec(): void {
    this.specs.update((list) => [...list, { parameter: '', spec_range: '' }]);
  }
  removeSpec(i: number): void {
    this.specs.update((list) => list.filter((_, idx) => idx !== i));
  }

  async verifyAndSave(): Promise<void> {
    if (this.saving()) return;
    this.error.set(null);
    if (!this.name().trim() || !this.category().trim()) {
      this.error.set('Product name and category are required before saving.');
      return;
    }
    if (
      (this.mfgDate().trim() && !isMonthYear(this.mfgDate())) ||
      (this.expDate().trim() && !isMonthYear(this.expDate()))
    ) {
      this.error.set('Manufacturing and expiry dates must use MM/YYYY.');
      return;
    }
    if (
      this.mfgDate().trim() &&
      this.expDate().trim() &&
      !isValidDateRange(this.mfgDate(), this.expDate())
    ) {
      this.error.set('Expiry date must be the same as or after the manufacturing date.');
      return;
    }
    this.saving.set(true);
    try {
      await this.products.create({
        name: this.name().trim(),
        category: this.category().trim(),
        batch_no: this.batchNo().trim(),
        mfg_date: this.mfgDate().trim(),
        exp_date: this.expDate().trim(),
        active_ingredients: this.composition().trim(),
        specs: this.specs().filter((s) => s.parameter.trim()),
      });
      await this.router.navigate(['/products'], { queryParams: { created: '1' } });
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the product.');
    } finally {
      this.saving.set(false);
    }
  }
}
