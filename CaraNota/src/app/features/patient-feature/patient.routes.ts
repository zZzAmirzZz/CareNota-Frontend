// src/app/features/patient/patient.routes.ts

import { Routes } from '@angular/router';

export const PATIENT_ROUTES: Routes = [
  // Default redirect — /patient → /patient/home
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },

  // ── Home ─────────────────────────────────────────────────────────────────
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.component').then(m => m.HomeComponent),
    title: 'Home — CareNota',
  },

  // ── Visits list ──────────────────────────────────────────────────────────
  {
    path: 'visits',
    loadComponent: () =>
      import('./pages/visits/visits.component').then(m => m.VisitsComponent),
    title: 'Visit History — CareNota',
  },

  // ── Single visit detail ───────────────────────────────────────────────────
  {
    path: 'visit-detail/:id',
    loadComponent: () =>
      import('./pages/visit-detail/visit-detail.component').then(
        m => m.VisitDetailComponent
      ),
    title: 'Visit Details — CareNota',
  },

  // ── Profile ───────────────────────────────────────────────────────────────
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/profile.component').then(m => m.ProfileComponent),
    title: 'My Profile — CareNota',
  },
];
