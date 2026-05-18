import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/admin-shell/admin-shell.component').then(
        (m) => m.AdminShellComponent
      ),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },


      {
        path: 'doctors',
        loadComponent: () =>
          import('./components/doctors/doctors.component').then(
            (m) => m.DoctorsComponent
          ),
      },


      {
        path: 'receptionists',
        loadComponent: () =>
          import('./components/receptionists/receptionists.component').then(
            (m) => m.ReceptionistsComponent
          ),
      },



      {
        path: 'create-user',
        loadComponent: () =>
          import('./components/create-user/create-user.component').then(
            (m) => m.CreateUserComponent
          ),
      },
      
    ],
  },
];
