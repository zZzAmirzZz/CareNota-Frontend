// src/app/features/doctor/doctor.routes.ts

import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const DOCTOR_ROUTES: Routes = [
  // ── Dashboard ─────────────────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./pages/doctor-dashboard/doctor-dashboard').then(m => m.DoctorDashboard),
  },

  // ── Profile ───────────────────────────────────────────────────────────────
  // Accessed by clicking the avatar in the navbar → /doctor/profile
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/doctor-profile/doctor-profile').then(m => m.DoctorProfile),
  },

  // ── Today's Visits ────────────────────────────────────────────────────────
  // Lists today's scheduled appointments with "Start Visit" button
  {
    path: 'today-visits',
    loadComponent: () =>
      import('./pages/today-visit/today-visit').then(m => m.TodayVisit),
  },

  // ── Recording ─────────────────────────────────────────────────────────────
  // Navigated to from today-visit after POST /Api/Visit returns real visitId.
  // ⚠️ :visitId here is the VISIT id — NOT the appointment id.
  {
    path: 'recording/:visitId',
    loadComponent: () =>
      import('./pages/recording/recording').then(m => m.Recording),
  },

  // ── Scheduling ────────────────────────────────────────────────────────────
  {
    path: 'scheduling',
    loadComponent: () =>
      import('./pages/scheduling/scheduling').then(m => m.Scheduling),
  },

  // ── Patients ──────────────────────────────────────────────────────────────
  {
    path: 'patients',
    loadComponent: () =>
      import('./pages/patients/patients').then(m => m.Patients),
  },
];
