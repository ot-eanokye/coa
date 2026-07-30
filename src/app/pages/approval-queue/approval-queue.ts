import { Component } from '@angular/core';

interface Approval {
  batchId: string;
  product: string;
  category: string;
  approvalDate: string;
}

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
  templateUrl: './approval-queue.html',
  styleUrl: './approval-queue.scss',
})
export class ApprovalQueue {
  readonly approvals: Approval[] = [
    { batchId: 'B2024-1102', product: 'Ernest Vitamin C Syrup 100ml', category: 'Syrup', approvalDate: '2024-10-24' },
    { batchId: 'B2024-1105', product: 'Ernest Amoxicillin 500mg', category: 'Capsule', approvalDate: '2024-10-24' },
    { batchId: 'B2024-1108', product: 'Ernest Paracetamol 500mg', category: 'Tablet', approvalDate: '2024-10-23' },
    { batchId: 'B2024-1110', product: 'Ernest Baby Gripe Water', category: 'Syrup', approvalDate: '2024-10-23' },
  ];

  readonly stages: StageCard[] = [
    { title: 'Analyst Verification', icon: 'shield', label: 'DIGITAL SIGNATURE', value: 'VERIFIED', valueTone: 'green', note: 'Authentication logs maintained in LIMS secure ledger.' },
    { title: 'Senior Analyst Review', icon: 'check', label: 'VERIFICATION STATUS', value: 'VERIFIED', valueTone: 'green', note: 'Results cross-checked and validated for QC Manager review.' },
    { title: 'QC Manager Approval', icon: 'clipboard', label: 'APPROVAL STATUS', value: 'COMPLETED', valueTone: 'green', note: 'All chemical and microbiological tests validated.' },
    { title: 'Dispatch Readiness', icon: 'truck', label: 'BATCH QUEUE', value: '4 PENDING', valueTone: 'blue', note: 'Awaiting secretary dispatch command to Production ERP.' },
  ];
}
