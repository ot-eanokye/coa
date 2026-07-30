import { Component, signal } from '@angular/core';

interface Batch {
  batchNumber: string;
  product: string;
  category: string;
  stage: string;
  assignedTo: string;
  status: 'IN PROGRESS' | 'FLAGGED' | 'COMPLETED' | 'AWAITING REVIEW';
}

@Component({
  selector: 'app-qc-queue',
  standalone: true,
  templateUrl: './qc-queue.html',
  styleUrl: './qc-queue.scss',
})
export class QcQueue {
  readonly tabs = ['All', 'Pending Entry', 'Under Review', 'Pending Approval'];
  readonly activeTab = signal('All');

  readonly pages = [1, 2, 3];

  readonly batches: Batch[] = [
    { batchNumber: '0705C', product: 'Paracetamol Tablets 125mg/5ml', category: 'Tablets', stage: 'Results Entry', assignedTo: 'Benjamin Nottey', status: 'IN PROGRESS' },
    { batchNumber: '0705C', product: 'Cough Syrup Base (Bulk)', category: 'Syrups', stage: 'Checking', assignedTo: 'J. Smith', status: 'FLAGGED' },
    { batchNumber: '0705C', product: 'Amoxicillin Tablets 500mg', category: 'Tablets', stage: 'Approval', assignedTo: 'A. Mensah', status: 'COMPLETED' },
    { batchNumber: '0705C', product: 'Vitamin C 500mg Chewables', category: 'Tablets', stage: 'Checking', assignedTo: 'J. Smith', status: 'AWAITING REVIEW' },
    { batchNumber: '0705C', product: 'Paracetamol Syrup 125mg/5ml', category: 'Syrups', stage: 'Checking', assignedTo: 'R. Boateng', status: 'FLAGGED' },
    { batchNumber: '0705C', product: 'Paracetamol Syrup 125mg/5ml', category: 'Syrups', stage: 'Results Entry', assignedTo: 'J. Smith', status: 'IN PROGRESS' },
    { batchNumber: '0705C', product: 'Paracetamol Syrup 125mg/5ml', category: 'Syrups', stage: 'Checking', assignedTo: 'R. Boateng', status: 'FLAGGED' },
  ];
}
