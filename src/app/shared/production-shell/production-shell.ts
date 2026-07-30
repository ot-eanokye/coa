import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header, NavItem } from '../header/header';

@Component({
  selector: 'app-production-shell',
  standalone: true,
  imports: [RouterOutlet, Header],
  templateUrl: './production-shell.html',
  styleUrl: './production-shell.scss',
})
export class ProductionShell {
  readonly nav: NavItem[] = [
    { label: 'Dashboard', link: '/production/dashboard', match: ['/production/dashboard'] },
    { label: 'Archived Documents', link: '/production/documents', match: ['/production/documents'] },
  ];
}
