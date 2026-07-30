import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header, NavItem } from '../header/header';

@Component({
  selector: 'app-qc-shell',
  standalone: true,
  imports: [RouterOutlet, Header],
  templateUrl: './qc-shell.html',
  styleUrl: './qc-shell.scss',
})
export class QcShell {
  readonly nav: NavItem[] = [
    { label: 'Dashboard', link: '/qc/dashboard', match: ['/qc/dashboard'] },
    { label: 'Archived Documents', link: '/qc/documents', match: ['/qc/documents'] },
  ];
}
