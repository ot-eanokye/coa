import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header, NavItem } from '../header/header';

@Component({
  selector: 'app-analyst-shell',
  standalone: true,
  imports: [RouterOutlet, Header],
  templateUrl: './analyst-shell.html',
  styleUrl: './analyst-shell.scss',
})
export class AnalystShell {
  readonly nav: NavItem[] = [
    { label: 'Dashboard', link: '/analyst/dashboard', match: ['/analyst/dashboard', '/analyst/batch'] },
    { label: 'Archived Documents', link: '/analyst/documents', match: ['/analyst/documents'] },
  ];
}
