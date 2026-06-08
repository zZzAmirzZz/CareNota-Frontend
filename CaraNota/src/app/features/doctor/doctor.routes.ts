// src/app/features/doctor/doctor.routes.ts
import { Routes } from '@angular/router';

export const DOCTOR_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },

  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/doctor-dashboard/doctor-dashboard').then(m => m.DoctorDashboard),
  },

  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/doctor-profile/doctor-profile').then(m => m.DoctorProfile),
  },

  {
    path: 'today-visits',
    loadComponent: () =>
      import('./pages/today-visit/today-visit').then(m => m.TodayVisit),
  },

  // ── AI path: navigate here from today-visit after choosing "Start Recording"
  {
    path: 'recording/:visitId',
    loadComponent: () =>
      import('./pages/recording/recording').then(m => m.Recording),
  },

  // ── Both paths land here: AI (after upload) and Manual (directly)
  {
    path: 'visit-summary/:visitId',
    loadComponent: () =>
      import('./pages/visit-summary/visit-summary').then(m => m.VisitSummary),
  },

  {
    path: 'scheduling',
    loadComponent: () =>
      import('./pages/scheduling/scheduling').then(m => m.Scheduling),
  },

  {
    path: 'patients',
    loadComponent: () =>
      import('./pages/patients/patients').then(m => m.Patients),
  },
];
