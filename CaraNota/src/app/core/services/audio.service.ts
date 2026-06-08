// src/app/core/services/audio.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AudioRecordResponseDto, AudioStatusDto } from '../models/appointment.model';
import { API } from '../constants/api';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private http = inject(HttpClient);

  // POST /api/audio/upload  — multipart/form-data
  // Swagger fields: AudioFile (binary), VisitId (int32)
  uploadAudio(audio: File | Blob, visitId: number): Observable<AudioRecordResponseDto> {
    const form = new FormData();

    if (audio instanceof File) {
      // Real file upload — preserve original filename and MIME type exactly
      form.append('AudioFile', audio, audio.name);
    } else {
      // Mic recording blob — give it a proper webm filename
      form.append('AudioFile', audio, `visit-${visitId}-recording.webm`);
    }

    // VisitId must be an integer — append as plain number string, no quotes
    form.append('VisitId', visitId.toString());

    return this.http.post<AudioRecordResponseDto>(API.AUDIO.UPLOAD, form);
  }

  // GET /api/audio/{visitId}/status
  getStatus(visitId: number): Observable<AudioStatusDto> {
    return this.http.get<AudioStatusDto>(API.AUDIO.STATUS(visitId));
  }
}
