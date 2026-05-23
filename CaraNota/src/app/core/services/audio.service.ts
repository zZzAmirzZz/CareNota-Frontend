// src/app/core/services/audio.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Covers all endpoints under /api/audio  (lowercase — per API docs)
//
// API used:
//   POST  /api/audio/upload              → uploadAudio()
//   GET   /api/audio/{visitId}/status    → getStatus()
//
// ⚠️ Missing endpoint noted in API docs:
//   DELETE /api/audio/{visitId}  — does NOT exist yet.
//   The response includes a "deletionAt" date — backend auto-deletes files,
//   but there is no manual delete endpoint. Ask backend team if needed.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AudioRecordResponseDto,
  AudioStatusDto,
} from '../models/appointment.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private http    = inject(HttpClient);
  // lowercase /api/audio — per API docs (different from /Api/Visit)
  private baseUrl = `${environment.apiUrl}/api/audio`;

  // ── Upload ────────────────────────────────────────────────────────────────
  // Called by recording.ts after the doctor ends the recording.
  // audioBlob  — the MediaRecorder output (audio/webm)
  // visitId    — the REAL visitId returned by POST /Api/Visit (NOT appointmentID)
  uploadAudio(audioBlob: Blob, visitId: number): Observable<AudioRecordResponseDto> {
    const form = new FormData();
    form.append('AudioFile', audioBlob, `visit-${visitId}.webm`);
    form.append('VisitId', String(visitId));
    return this.http.post<AudioRecordResponseDto>(`${this.baseUrl}/upload`, form);
  }

  // ── Poll status ───────────────────────────────────────────────────────────
  // Call after upload to check if AI transcription/processing is done.
  // Possible status values: 'Pending' | 'Processing' | 'Completed' | 'Failed'
  // Poll every 5–10s until status === 'Completed', then navigate to summary page.
  getStatus(visitId: number): Observable<AudioStatusDto> {
    return this.http.get<AudioStatusDto>(`${this.baseUrl}/${visitId}/status`);
  }
}
