import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Assignment {
  date: string;
  category: string;
  product: string;
  analyst: string;
}

@Component({
  selector: 'app-qc-assign',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './qc-assign.html',
  styleUrl: './qc-assign.scss',
})
export class QcAssign {
  readonly assignments: Assignment[] = [
    { date: '24 Oct 2023', category: 'SYRUPS', product: 'Paracetamol Syrup 125mg/5ml', analyst: 'J. Smith' },
    { date: '24 Oct 2023', category: 'SYRUPS', product: 'Paracetamol Syrup 125mg/5ml', analyst: 'J. Smith' },
    { date: '24 Oct 2023', category: 'SYRUPS', product: 'Paracetamol Syrup 125mg/5ml', analyst: 'J. Smith' },
    { date: '24 Oct 2023', category: 'INJECTABLES', product: 'Gentamicin Injection 40mg', analyst: 'K. Appiah' },
    { date: '23 Oct 2023', category: 'TABLETS', product: 'Amoxicillin Tablets 500mg', analyst: 'A. Mensah' },
  ];
}
