import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Operation {
  title: string;
  desc: string;
  icon: 'certificate' | 'approval' | 'retrieval';
  link: string;
}

interface Activity {
  batchNo: string;
  product: string;
  date: string;
  analyst: string;
  status: 'RELEASED' | 'UNDER REVIEW' | 'OOS DETECTED';
  action: 'pdf' | 'view' | 'alert';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  readonly operations: Operation[] = [
    {
      title: 'Certificate Management',
      desc: 'Maintain product profiles and specifications.',
      icon: 'certificate',
      link: '/products',
    },
    {
      title: 'Approval Queue',
      desc: 'Review and approve CoA reports for final release.',
      icon: 'approval',
      link: '/approvals',
    },
    {
      title: 'Certificate Retrieval',
      desc: 'Access and retrieve historical certificates across departments.',
      icon: 'retrieval',
      link: '/archived',
    },
  ];

  readonly activity: Activity[] = [
    { batchNo: '0705C', product: 'Kidivite Syrup 200 ml', date: 'Oct 24, 2024', analyst: 'Dr. A. Mensah', status: 'RELEASED', action: 'pdf' },
    { batchNo: '0705C', product: 'Kidivite Syrup 200 ml', date: 'Oct 24, 2024', analyst: 'S. Osei', status: 'UNDER REVIEW', action: 'view' },
    { batchNo: '0705C', product: 'Kidivite Syrup 200 ml', date: 'Oct 23, 2024', analyst: 'Dr. A. Mensah', status: 'RELEASED', action: 'pdf' },
    { batchNo: '0705C', product: 'Kidivite Syrup 200 ml', date: 'Oct 23, 2024', analyst: 'K. Appiah', status: 'OOS DETECTED', action: 'alert' },
  ];
}
