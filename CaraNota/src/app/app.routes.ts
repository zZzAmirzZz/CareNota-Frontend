// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/pages/login/login')
        .then(m => m.Login)
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/pages/register/register')
        .then(m => m.Register)
  }
  ,
  
  {
  path: 'admin',
  loadChildren: () =>
    import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  // canActivate: [authGuard], // add your role guard here
}

,

{ path: 'doctor',
// canActivate: [ roleGuard],
// data: { roles: ['doctor'] },
loadChildren: () => import('./features/doctor/doctor.routes').then(m => m.DOCTOR_ROUTES) },

{ path: 'receptionist',
// canActivate: [ roleGuard],
// data: { roles: ['receptionist'] },
loadChildren: () => import('./features/receptionist/receptionist.routes').then(m => m.RECEPTIONIST_ROUTES) },

{ path: 'patient',
// canActivate: [authGuard],
// data: { roles: ['patient'] },
loadChildren: () => import('./features/patient-feature/patient.routes').then(m => m.PATIENT_ROUTES) }
,
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  }

  ,

];
