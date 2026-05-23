// src/app/core/services/summary.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Covers all endpoints under /api/visits/{visitId}/summary  (lowercase)
//
// API used:
//   GET   /api/visits/{visitId}/summary          → getSummary()
//   PUT   /api/visits/{visitId}/summary          → editSummary()
//   POST  /api/visits/{visitId}/summary/approve  → approveSummary()
//   POST  /api/visits/{visitId}/summary/rating   → submitRating()
//
// ⚠️ Notes from API docs:
//   - /approve and /rating use the SAME body { rating: float } — likely the same
//     operation. Use approveSummary() to approve + rate in one call.
//   - DELETE /api/visits/{visitId}/summary does NOT exist.
//     Cannot discard/regenerate a summary once created.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  VisitSummaryResponseDto,
  UpdateSummaryDto,
  ApproveSummaryDto,
} from '../models/appointment.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SummaryService {
  private http = inject(HttpClient);
  // lowercase /api/visits — per API docs
  private base = (visitId: number) =>
    `${environment.apiUrl}/api/visits/${visitId}/summary`;

  // ── Read ──────────────────────────────────────────────────────────────────
  // Returns both doctor SOAP summary and patient-friendly summary
  getSummary(visitId: number): Observable<VisitSummaryResponseDto> {
    return this.http.get<VisitSummaryResponseDto>(this.base(visitId));
  }

  // ── Update ────────────────────────────────────────────────────────────────
  // Doctor can edit the AI-generated SOAP fields before approving
  // Returns 204 No Content
  editSummary(visitId: number, dto: UpdateSummaryDto): Observable<void> {
    return this.http.put<void>(this.base(visitId), dto);
  }

  // ── Approve ───────────────────────────────────────────────────────────────
  // Marks summary as approved and submits a rating (0–5)
  approveSummary(visitId: number, dto: ApproveSummaryDto): Observable<void> {
    return this.http.post<void>(`${this.base(visitId)}/approve`, dto);
  }

  // ── Rating only ───────────────────────────────────────────────────────────
  // Same body as approve — use if you want to rate without re-approving
  submitRating(visitId: number, dto: ApproveSummaryDto): Observable<void> {
    return this.http.post<void>(`${this.base(visitId)}/rating`, dto);
  }
}
