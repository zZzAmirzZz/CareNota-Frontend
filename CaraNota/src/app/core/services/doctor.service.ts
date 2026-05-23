// src/app/core/services/doctor.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { Doctor } from '../models/appointment.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private http    = inject(HttpClient);
  private auth    = inject(AuthService);
  private baseUrl = `${environment.apiUrl}/api/Doctor`;

  // Normalizes whatever the backend sends into the Doctor shape the app uses.
  // The .NET backend returns doctorId / DoctorId — this maps it to id.
private normalize(raw: any): Doctor {
  return {
    id: raw.id ?? raw.doctorID ?? raw.doctorId ?? 0,
    fullName: raw.fullName ?? raw.name ?? raw.FullName ?? '',
    email: raw.email ?? raw.Email ?? '',
    specialty: raw.specialty ?? raw.Specialty ?? raw.specialization ?? '', // ← added fallback
    phoneNumber: raw.phoneNumber ?? raw.PhoneNumber,
  };
}
  getAllDoctors(): Observable<Doctor[]> {
    return this.http.get<any[]>(this.baseUrl).pipe(
      map(list => list.map(d => this.normalize(d)))
    );
  }

  getDoctorById(id: number): Observable<Doctor> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map(d => this.normalize(d))
    );
  }

  getDoctorsBySpecialty(specialty: string): Observable<Doctor[]> {
    return this.http.get<any[]>(`${this.baseUrl}/specialty/${specialty}`).pipe(
      map(list => list.map(d => this.normalize(d)))
    );
  }

  updateSpecialty(id: number, specialty: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, { specialty });
  }

  deleteDoctor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  resolveDoctorId(): Observable<Doctor> {
    const userId = this.auth.getUserId();
    if (!userId) throw new Error('No userId found — user must be logged in');
    return this.http.get<any>(`${this.baseUrl}/${userId}`).pipe(
      map(d => this.normalize(d)),
      tap(doctor => this.auth.saveDoctorId(doctor.id))
    );
  }
}
