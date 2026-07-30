import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface SpecRow {
  test: string;
  spec: string;
}

@Component({
  selector: 'app-import-product',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './import-product.html',
  styleUrl: './import-product.scss',
})
export class ImportProduct {
  readonly specs: SpecRow[] = [
    { test: 'Identification', spec: 'Positive' },
    { test: 'Description', spec: 'Pink, mint flavoured clear liquid' },
    { test: 'pH', spec: '5.0-7.0' },
    { test: 'Volume', spec: '294-306' },
    { test: 'Weight/ML', spec: '>1.00' },
    { test: 'Assay (%)', spec: '90-110' },
  ];
}
