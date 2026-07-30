import { Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface SubTest {
  name: string;
  range: string;
}

export interface ParameterRow {
  parameter: string;
  spec_range: string;
}

@Component({
  selector: 'app-add-test-parameter',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './add-test-parameter.html',
  styleUrl: './add-test-parameter.scss',
})
export class AddTestParameter {
  readonly closed = output<void>();
  readonly saved = output<ParameterRow[]>();

  readonly testName = signal('');
  readonly standardRange = signal('');
  readonly subTests = signal<SubTest[]>([{ name: '', range: '' }]);

  addSubTest(): void {
    this.subTests.update((list) => [...list, { name: '', range: '' }]);
  }

  removeSubTest(index: number): void {
    this.subTests.update((list) => list.filter((_, i) => i !== index));
  }

  updateSub(index: number, key: keyof SubTest, value: string): void {
    this.subTests.update((list) =>
      list.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
    );
  }

  save(): void {
    const rows: ParameterRow[] = [];
    const name = this.testName().trim();
    if (name) {
      rows.push({ parameter: name, spec_range: this.standardRange().trim() });
    }
    for (const sub of this.subTests()) {
      if (sub.name.trim()) {
        rows.push({ parameter: sub.name.trim(), spec_range: sub.range.trim() });
      }
    }
    this.saved.emit(rows);
    this.closed.emit();
  }

  close(): void {
    this.closed.emit();
  }
}
