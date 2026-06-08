// core/services/auth.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// FIXES vs previous version:
//   ✅ logout() — revoke is now fire-and-forget AFTER session clear (no empty body issue)
//   ✅ Uses API constants instead of raw strings
//   ✅ refreshToken() uses API constants
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import {
  LoginRequest,
  LoginResponse,
  RawLoginResponse,
  RegisterRequest,
  RegisterResponse,
  UserRole,
} from '../models/user';
import { API } from '../constants/api';

interface JwtPayload {
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress':   string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name':           string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role':         string;
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
  private readonly ADMIN_ID_KEY        = 'admin_id';

  private currentUserSubject = new BehaviorSubject<LoginResponse['user'] | null>(
    this.getUserFromStorage()
  );
  currentUser$ = this.currentUserSubject.asObservable();

  // ── Auth API calls ────────────────────────────────────────────────────────

  login(payload: LoginRequest): Observable<RawLoginResponse> {
    return this.http
      .post<RawLoginResponse>(API.AUTH.LOGIN, payload)
      .pipe(tap(res => {
        const normalized = this.normalizeLoginResponse(res);
        this.setSession(normalized);
        this.currentUserSubject.next(normalized.user);
      }));
  }

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(API.AUTH.REGISTER, payload);
  }

  refreshToken(): Observable<RawLoginResponse> {
    return this.http
      .post<RawLoginResponse>(API.AUTH.REFRESH, {
        accessToken:  this.getToken(),
        refreshToken: localStorage.getItem(this.REFRESH_KEY),
      })
      .pipe(tap(res => {
        const normalized = this.normalizeLoginResponse(res);
        this.setSession(normalized);
        this.currentUserSubject.next(normalized.user);
      }));
  }

  // ✅ FIX: clear session first, then fire revoke (avoids 401 loop in error interceptor)
  // The revoke call is best-effort — we don't wait for it before navigating.
  logout(): void {
    this.clearSession();
    this.router.navigate(['/auth/login']);
    this.http.post(API.AUTH.REVOKE, null).subscribe({ error: () => {} });
  }

  // ── Response normalization ────────────────────────────────────────────────

  private normalizeLoginResponse(raw: RawLoginResponse): LoginResponse {
    const rawRole = raw.roles?.[0]?.toLowerCase() ?? 'patient';

    if (raw.patientId)      localStorage.setItem(this.PATIENT_ID_KEY,      raw.patientId.toString());
    if (raw.doctorId)       localStorage.setItem(this.DOCTOR_ID_KEY,        raw.doctorId.toString());
    if (raw.receptionistId) localStorage.setItem(this.RECEPTIONIST_ID_KEY,  raw.receptionistId.toString());
    if (raw.adminId)        localStorage.setItem(this.ADMIN_ID_KEY,          raw.adminId.toString());

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

  // ── Token management ─────────────────────────────────────────────────────

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
    localStorage.removeItem(this.ADMIN_ID_KEY);
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
      return JSON.parse(atob(token.split('.')[1])) as JwtPayload;
    } catch {
      return null;
    }
  }

  // ── State & authorization ─────────────────────────────────────────────────

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
    const raw = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    return raw ? (raw.toLowerCase() as UserRole) : null;
  }

  getUserId(): string | null {
    return this.currentUserSubject.value?.id ?? null;
  }

  // ── Role-specific integer IDs ─────────────────────────────────────────────

  getPatientId(): number | null {
    const v = localStorage.getItem(this.PATIENT_ID_KEY);
    return v ? parseInt(v, 10) : null;
  }

  getDoctorId(): number | null {
    const v = localStorage.getItem(this.DOCTOR_ID_KEY);
    return v ? parseInt(v, 10) : null;
  }

  getReceptionistId(): number | null {
    const v = localStorage.getItem(this.RECEPTIONIST_ID_KEY);
    return v ? parseInt(v, 10) : null;
  }

  getAdminId(): number | null {
    const v = localStorage.getItem(this.ADMIN_ID_KEY);
    return v ? parseInt(v, 10) : null;
  }

  saveDoctorId(doctorId: number): void {
    localStorage.setItem(this.DOCTOR_ID_KEY, doctorId.toString());
  }

  redirectByRole(role: UserRole): void {
    const routes: Record<UserRole, string> = {
      doctor:       '/doctor/dashboard',
      patient:      '/patient/home',
      receptionist: '/receptionist/dashboard',
      admin:        '/admin/dashboard',
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
