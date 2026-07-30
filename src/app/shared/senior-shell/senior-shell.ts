import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header, NavItem } from '../header/header';

@Component({
  selector: 'app-senior-shell',
  standalone: true,
  imports: [RouterOutlet, Header],
  templateUrl: './senior-shell.html',
  styleUrl: './senior-shell.scss',
})
export class SeniorShell {
  readonly nav: NavItem[] = [
    { label: 'Dashboard', link: '/senior/dashboard', match: ['/senior/dashboard'] },
    { label: 'Archived Documents', link: '/senior/documents', match: ['/senior/documents'] },
  ];
}
