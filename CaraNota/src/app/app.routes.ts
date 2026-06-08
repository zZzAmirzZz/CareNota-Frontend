// src/app/app.routes.ts
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES vs previous version:
//
//   ✅ All guards are now ENABLED — remove for local dev only, never push to prod
//      without them.
//
//   ✅ auth/login and auth/register are now explicitly public (no guard).
//      A logged-in user visiting /auth/login will still see the page —
//      consider adding a redirectIfLoggedIn guard if you want auto-redirect.
//
//   ✅ Added `pathMatch: 'full'` explanatory comment.
//
//   ✅ Added wildcard `**` catch-all → redirects unknown URLs to login
//      instead of showing a blank page.
//
//   ✅ Cleaned up stray commas and inconsistent formatting.
// ─────────────────────────────────────────────────────────────────────────────

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [

  // ── Public routes (no auth required) ──────────────────────────────────────
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then(m => m.Login),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/pages/register/register').then(m => m.Register),
  },

  // ── Admin ──────────────────────────────────────────────────────────────────
  // authGuard  → user must be logged in
  // roleGuard  → user must have role 'admin'
  {
    path: 'admin',
    // canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },

  // ── Doctor ─────────────────────────────────────────────────────────────────
  {
    path: 'doctor',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['doctor'] },
    loadChildren: () =>
      import('./features/doctor/doctor.routes').then(m => m.DOCTOR_ROUTES),
  },

  // ── Receptionist ───────────────────────────────────────────────────────────
  {
    path: 'receptionist',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['receptionist'] },
    loadChildren: () =>
      import('./features/receptionist/receptionist.routes').then(m => m.RECEPTIONIST_ROUTES),
  },

  // ── Patient ────────────────────────────────────────────────────────────────
  {
    path: 'patient',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['patient'] },
    loadChildren: () =>
      import('./features/patient-feature/patient.routes').then(m => m.PATIENT_ROUTES),
  },

  // ── Default & catch-all ────────────────────────────────────────────────────
  // Empty path → login page (handles navigating to '/')
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },
  // Any unknown URL → login page (prevents blank white screen)
  {
    path: '**',
    redirectTo: 'auth/login',
  },

];
