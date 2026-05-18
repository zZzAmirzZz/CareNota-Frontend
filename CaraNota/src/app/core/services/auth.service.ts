// src/app/core/services/auth.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  RawLoginResponse,
  RegisterRequest,
  RegisterResponse,
  UserRole,
} from '../models/user';

interface JwtPayload {
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': string;
  exp: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly TOKEN_KEY           = 'access_token';
  private readonly REFRESH_KEY         = 'refresh_token';
  private readonly USER_KEY            = 'cn_user';
  private readonly PATIENT_ID_KEY      = 'patient_id';
  private readonly DOCTOR_ID_KEY       = 'doctor_id';
  private readonly RECEPTIONIST_ID_KEY = 'receptionist_id';
  private readonly ADMIN_ID_KEY        = 'admin_id';   // ← added

  private currentUserSubject = new BehaviorSubject<LoginResponse['user'] | null>(
    this.getUserFromStorage()
  );
  currentUser$ = this.currentUserSubject.asObservable();

  // ─── Auth API Calls ───────────────────────────────────────────────────

  login(payload: LoginRequest): Observable<RawLoginResponse> {
    return this.http
      .post<RawLoginResponse>(`${environment.apiUrl}/Api/Auth/Login`, payload)
      .pipe(
        tap((res) => {
          const normalized = this.normalizeLoginResponse(res);
          this.setSession(normalized);
          this.currentUserSubject.next(normalized.user);
        })
      );
  }

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
      `${environment.apiUrl}/Api/Auth/Register`,
      payload
    );
  }

  refreshToken(): Observable<RawLoginResponse> {
    const accessToken  = this.getToken();
    const refreshToken = localStorage.getItem(this.REFRESH_KEY);
    return this.http
      .post<RawLoginResponse>(`${environment.apiUrl}/Api/Auth/Refresh`, {
        accessToken,
        refreshToken,
      })
      .pipe(
        tap((res) => {
          const normalized = this.normalizeLoginResponse(res);
          this.setSession(normalized);
          this.currentUserSubject.next(normalized.user);
        })
      );
  }

  logout(): void {
    this.http
      .post(`${environment.apiUrl}/Api/Auth/Revoke`, {})
      .subscribe({ error: () => {} });
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  // ─── Response Normalization ───────────────────────────────────────────

  private normalizeLoginResponse(raw: RawLoginResponse): LoginResponse {
    const rawRole = raw.roles?.[0]?.toLowerCase() ?? 'patient';

    // Store whichever integer ID the backend returned for this role
    if (raw.patientId)      localStorage.setItem(this.PATIENT_ID_KEY,      raw.patientId.toString());
    if (raw.doctorId)       localStorage.setItem(this.DOCTOR_ID_KEY,        raw.doctorId.toString());
    if (raw.receptionistId) localStorage.setItem(this.RECEPTIONIST_ID_KEY,  raw.receptionistId.toString());
    if (raw.adminId)        localStorage.setItem(this.ADMIN_ID_KEY,          raw.adminId.toString()); // ← added

    return {
      token:        raw.accessToken,
      refreshToken: raw.refreshToken,
      user: {
        id:    raw.userId,
        name:  raw.fullName,
        email: raw.email,
        role:  rawRole as UserRole,
      },
    };
  }

  // ─── Token Management ─────────────────────────────────────────────────

  private setSession(authResult: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY,   authResult.token);
    localStorage.setItem(this.REFRESH_KEY, authResult.refreshToken);
    localStorage.setItem(this.USER_KEY,    JSON.stringify(authResult.user));
  }

  private clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.PATIENT_ID_KEY);
    localStorage.removeItem(this.DOCTOR_ID_KEY);
    localStorage.removeItem(this.RECEPTIONIST_ID_KEY);
    localStorage.removeItem(this.ADMIN_ID_KEY);   // ← added
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    return token && token !== 'undefined' ? token : null;
  }

  private decodeToken(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const base64Payload = token.split('.')[1];
      return JSON.parse(atob(base64Payload)) as JwtPayload;
    } catch {
      return null;
    }
  }

  // ─── State & Authorization ────────────────────────────────────────────

  isLoggedIn(): boolean {
    const payload = this.decodeToken();
    if (!payload) return false;
    return payload.exp * 1000 > Date.now();
  }

  getCurrentRole(): UserRole | null {
    const storedRole = this.currentUserSubject.value?.role;
    if (storedRole) return storedRole;
    const payload = this.decodeToken();
    if (!payload) return null;
    const rawRole = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    return rawRole ? (rawRole.toLowerCase() as UserRole) : null;
  }

  getUserId(): string | null {
    return this.currentUserSubject.value?.id ?? null;
  }

  // ─── Role-specific integer IDs ────────────────────────────────────────

  getPatientId(): number | null {
    const val = localStorage.getItem(this.PATIENT_ID_KEY);
    return val ? parseInt(val, 10) : null;
  }

  getDoctorId(): number | null {
    const val = localStorage.getItem(this.DOCTOR_ID_KEY);
    return val ? parseInt(val, 10) : null;
  }

  getReceptionistId(): number | null {
    const val = localStorage.getItem(this.RECEPTIONIST_ID_KEY);
    return val ? parseInt(val, 10) : null;
  }

  // ← added
  getAdminId(): number | null {
    const val = localStorage.getItem(this.ADMIN_ID_KEY);
    return val ? parseInt(val, 10) : null;
  }

  saveDoctorId(doctorId: number): void {
    localStorage.setItem(this.DOCTOR_ID_KEY, doctorId.toString());
  }

  redirectByRole(role: UserRole): void {
    const routes: Record<UserRole, string> = {
      doctor:       '/doctor/dashboard',
      patient:      '/patient/dashboard',
      receptionist: '/receptionist/dashboard',
      admin:        '/admin/dashboard',   // ← added
    };
    this.router.navigate([routes[role]]);
  }

  private getUserFromStorage(): LoginResponse['user'] | null {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    try {
      return JSON.parse(raw);
    } catch {
      localStorage.removeItem(this.USER_KEY);
      return null;
    }
  }
}
