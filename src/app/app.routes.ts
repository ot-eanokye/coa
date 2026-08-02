import { Routes } from '@angular/router';
import { Shell } from './shared/shell/shell';
import { AnalystShell } from './shared/analyst-shell/analyst-shell';
import { SeniorShell } from './shared/senior-shell/senior-shell';
import { QcShell } from './shared/qc-shell/qc-shell';
import { ProductionShell } from './shared/production-shell/production-shell';
import { authGuard, guestGuard, roleGuard } from './core/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'coa/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/coa-certificate/coa-certificate').then((m) => m.CoaCertificate),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/user-settings/user-settings').then((m) => m.UserSettings),
  },
  {
    path: 'update-password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/update-password/update-password').then((m) => m.UpdatePassword),
  },
  {
    path: 'analyst',
    component: AnalystShell,
    canActivate: [roleGuard('analyst')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/analyst/analyst-dashboard/analyst-dashboard').then((m) => m.AnalystDashboard),
      },
      {
        path: 'batch/new',
        loadComponent: () =>
          import('./pages/analyst/batch-initialization/batch-initialization').then(
            (m) => m.BatchInitialization,
          ),
      },
      {
        path: 'batch/:id/results',
        loadComponent: () =>
          import('./pages/analyst/results-entry/results-entry').then((m) => m.ResultsEntry),
      },
      {
        path: 'batch/:id/review',
        loadComponent: () =>
          import('./pages/analyst/analyst-review/analyst-review').then((m) => m.AnalystReview),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./pages/archived-documents/archived-documents').then((m) => m.ArchivedDocuments),
      },
    ],
  },
  {
    path: 'senior',
    component: SeniorShell,
    canActivate: [roleGuard('senior_analyst')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/senior/senior-overview/senior-overview').then((m) => m.SeniorOverview),
      },
      {
        path: 'review/:id',
        loadComponent: () =>
          import('./pages/senior/senior-review/senior-review').then((m) => m.SeniorReview),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./pages/archived-documents/archived-documents').then((m) => m.ArchivedDocuments),
      },
    ],
  },
  {
    path: 'qc',
    component: QcShell,
    canActivate: [roleGuard('qc_manager')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/qc/qc-dashboard/qc-dashboard').then((m) => m.QcDashboard),
      },
      {
        path: 'approvals',
        loadComponent: () => import('./pages/qc/qc-approvals/qc-approvals').then((m) => m.QcApprovals),
      },
      {
        path: 'assign',
        loadComponent: () => import('./pages/qc/qc-assign/qc-assign').then((m) => m.QcAssign),
      },
      {
        path: 'verify/:id',
        loadComponent: () => import('./pages/qc/qc-verify/qc-verify').then((m) => m.QcVerify),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./pages/archived-documents/archived-documents').then((m) => m.ArchivedDocuments),
      },
    ],
  },
  {
    path: 'production',
    component: ProductionShell,
    canActivate: [roleGuard('production_manager')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/production/production-dashboard/production-dashboard').then(
            (m) => m.ProductionDashboard,
          ),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./pages/archived-documents/archived-documents').then((m) => m.ArchivedDocuments),
      },
    ],
  },
  {
    path: '',
    component: Shell,
    canActivate: [roleGuard('admin')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/manage-products/manage-products').then((m) => m.ManageProducts),
      },
      {
        path: 'products/new',
        loadComponent: () => import('./pages/add-product/add-product').then((m) => m.AddProduct),
      },
      {
        path: 'products/:id/edit',
        loadComponent: () => import('./pages/add-product/add-product').then((m) => m.AddProduct),
      },
      {
        path: 'products/new/upload',
        loadComponent: () =>
          import('./pages/import-product/import-product').then((m) => m.ImportProduct),
      },
      {
        path: 'approvals',
        loadComponent: () =>
          import('./pages/approval-queue/approval-queue').then((m) => m.ApprovalQueue),
      },
      {
        path: 'archived',
        loadComponent: () =>
          import('./pages/archived-documents/archived-documents').then((m) => m.ArchivedDocuments),
      },
      {
        path: 'qc-queue',
        loadComponent: () => import('./pages/qc-queue/qc-queue').then((m) => m.QcQueue),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/user-management/user-management').then((m) => m.UserManagement),
      },
      {
        path: 'users/new',
        loadComponent: () => import('./pages/create-user/create-user').then((m) => m.CreateUser),
      },
      {
        path: 'users/reset-credentials/:id',
        loadComponent: () =>
          import('./pages/reset-credentials/reset-credentials').then((m) => m.ResetCredentials),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
