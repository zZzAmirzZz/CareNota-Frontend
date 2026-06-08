// src/app/core/services/summary.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single service for the entire visit-summary page.
// Combines what was split across SummaryService + AudioService polling
// so visit-summary.ts injects only this one service.
//
// Covers:
//   § Audio polling  — GET /api/audio/{visitId}/status
//   § Summary CRUD   — GET / PUT /api/visits/{visitId}/summary
//   § Approval       — POST /api/visits/{visitId}/summary/approve
//   § Patient view   — GET /api/visits/{visitId}/patient-summary
//
// AudioService itself is unchanged — it still owns uploadAudio() used by
// recording.ts. This service only adds the polling helper on top.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, switchMap, takeWhile, tap, catchError, of } from 'rxjs';
import {
  VisitSummaryResponseDto,
  UpdateSummaryDto,
  ApproveSummaryDto,
  PatientSummaryViewDto,
  AudioProcessingStatus,
  AudioStatusDto,
} from '../models/appointment.model';
import { API } from '../constants/api';

// ── Callback type used by the component to react to each poll tick ────────────
export type PollTickCallback = (status: AudioProcessingStatus, pollCount: number) => void;

@Injectable({ providedIn: 'root' })
export class SummaryService {
  private http = inject(HttpClient);

  // ── § Audio polling ────────────────────────────────────────────────────────
  //
  // pollUntilReady()
  //   Polls GET /api/audio/{visitId}/status every `intervalMs` (default 6 s).
  //   Emits each AudioStatusDto until status is 'Completed' or 'Failed',
  //   or until `maxPolls` attempts (default 30 → ~3 min).
  //
  //   Usage in component:
  //     this.summaryService.pollUntilReady(visitId, (status, n) => {
  //       this.audioStatus.set(status);
  //       this.pollCount.set(n);
  //     }).subscribe({
  //       next: dto => { if (dto.status === 'Completed') this.loadSummary(); },
  //       error: () => { /* handle connection error */ }
  //     });
  //
  pollUntilReady(
    visitId: number,
    onTick?: PollTickCallback,
    intervalMs = 6_000,
    maxPolls   = 30,
  ): Observable<AudioStatusDto> {
    let count = 0;

    return interval(intervalMs).pipe(
      tap(() => count++),
      switchMap(() =>
        this.http.get<AudioStatusDto>(API.AUDIO.STATUS(visitId)).pipe(
          catchError(() =>
            // Network hiccup — return a synthetic 'Processing' so polling continues
            of({ visitId, status: 'Processing' as AudioProcessingStatus })
          )
        )
      ),
      tap(dto => onTick?.(dto.status, count)),
      takeWhile(
        dto => dto.status !== 'Completed' && dto.status !== 'Failed' && count < maxPolls,
        true,   // emit the terminating value so the component sees 'Completed'
      ),
    );
  }

  // ── § Summary CRUD ─────────────────────────────────────────────────────────

  // GET /api/visits/{visitId}/summary
  // Returns the full doctor + patient AI summary for the doctor review page.
  getSummary(visitId: number): Observable<VisitSummaryResponseDto> {
    return this.http.get<VisitSummaryResponseDto>(API.SUMMARY.BASE(visitId));
  }

  // PUT /api/visits/{visitId}/summary
  // Doctor edits AI-generated fields before approving.
  // Body (EditSummaryDto): subjective, objective, assessment, plan, whenToSeekHelp
  // Returns 204 No Content on success.
  editSummary(visitId: number, dto: UpdateSummaryDto): Observable<void> {
    return this.http.put<void>(API.SUMMARY.BASE(visitId), dto);
  }

  // ── § Approval ─────────────────────────────────────────────────────────────

  // POST /api/visits/{visitId}/summary/approve
  // Single call that:
  //   1. Saves approval status to the visit record
  //   2. Triggers patient notification (backend responsibility)
  //
  // Body: { followUpDate?: string }  — ISO 8601 datetime, optional
  // ⚠️ Breaking change from old API: was { rating: number 0–5 }
  // Returns 200 on success.
  approveSummary(visitId: number, dto: ApproveSummaryDto): Observable<void> {
    return this.http.post<void>(API.SUMMARY.APPROVE(visitId), dto);
  }

  // ── § Patient-facing view ──────────────────────────────────────────────────

  // GET /api/visits/{visitId}/patient-summary
  // Simplified read-only view for the patient portal / patient dashboard page.
  // Different from patientSummary embedded in VisitSummaryResponseDto —
  // this is a standalone endpoint returning PatientSummaryViewDto.
  getPatientSummary(visitId: number): Observable<PatientSummaryViewDto> {
    return this.http.get<PatientSummaryViewDto>(API.SUMMARY.PATIENT_VIEW(visitId));
  }
}
