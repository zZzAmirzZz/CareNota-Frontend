// src/app/features/doctor/pages/recording/recording.ts
import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  NgZone,

} from '@angular/core';
// add these imports at the top

import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DoctorNavbar } from '../../../../layout/doctor-layout/doctor-navbar/doctor-navbar';
import { API } from '../../../../core/constants/api';
import { interval, Subscription, switchMap, takeWhile } from 'rxjs';
import {  EMPTY } from 'rxjs';
import {catchError } from 'rxjs/operators';

interface PatientInfo {
  name: string;
  id: number;
  age: number;
  gender: string;
  visitType: string;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

@Component({
  selector: 'app-recording',
  standalone: true,
  imports: [CommonModule, RouterModule, DoctorNavbar],
  templateUrl: './recording.html',
  styleUrl: './recording.css',
})
export class Recording implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private http   = inject(HttpClient);
  private zone   = inject(NgZone);

  // ── State signals ──────────────────────────────────────────────────────────
  visitId        = signal<number>(0);
  recordingState = signal<RecordingState>('idle');
  elapsedSeconds = signal(0);
  micGranted     = signal(false);
  selectedFile   = signal<File | null>(null);

  // Upload phase
  isUploading  = signal(false);
  uploadError  = signal<string | null>(null);
  isUploaded   = signal(false);   // true once POST /api/audio/upload returns 200

  // Polling phase
  isPolling    = signal(false);
  pollError    = signal<string | null>(null);

  patient = signal<PatientInfo>({
    name: 'Patient', id: 0, age: 0, gender: '—', visitType: '—',
  });

  waveformBars: number[] = Array.from({ length: 40 }, (_, i) => i);
  barHeights   = signal<number[]>(Array(40).fill(8));

  // ── Derived ────────────────────────────────────────────────────────────────
  /** True when there is audio to upload (mic blob or file) and we're stopped */
  get canUpload(): boolean {
    return !this.isUploading() &&
           !this.isUploaded() &&
           this.recordingState() === 'stopped' &&
           (this.selectedFile() !== null || this.audioChunks.length > 0);
  }

  /** True once upload succeeded and polling hasn't started/finished */
  get canGenerateSummary(): boolean {
    return this.isUploaded() && !this.isPolling();
  }

  // ── Private ────────────────────────────────────────────────────────────────
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream:      MediaStream | null = null;
  private analyser:    AnalyserNode | null = null;
  private audioCtx:    AudioContext | null = null;
  private animFrame:   number | null = null;
  private pollSub:     Subscription | null = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('visitId'));
    this.visitId.set(id);
    const state = history.state as any;
    if (state?.patient) this.patient.set(state.patient);

  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.stopStream();
    this.pollSub?.unsubscribe();
  }

  // ── Timer ──────────────────────────────────────────────────────────────────
  private startTimer(): void {
    this.timerInterval = setInterval(
      () => this.zone.run(() => this.elapsedSeconds.update(s => s + 1)), 1000
    );
  }

  private stopTimer(): void {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
  }

  get formattedTime(): string {
    const s = this.elapsedSeconds();
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
  }

  // ── Recording ──────────────────────────────────────────────────────────────
  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micGranted.set(true);

      this.audioCtx = new AudioContext();
      const source  = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      source.connect(this.analyser);

      this.audioChunks   = [];
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      this.mediaRecorder.start(100);

      this.recordingState.set('recording');
      this.startTimer();
      this.animateWaveform();
    } catch {
      // Mic denied — fall through to stopped state so user can upload a file
      this.micGranted.set(false);
      this.recordingState.set('stopped');
    }
  }

  togglePause(): void {
    if (this.recordingState() === 'recording') {
      this.recordingState.set('paused');
      this.stopTimer();
      this.mediaRecorder?.pause();
    } else if (this.recordingState() === 'paused') {
      this.recordingState.set('recording');
      this.startTimer();
      this.mediaRecorder?.resume();
      if (this.analyser) this.animateWaveform();
    }
  }

  async endRecording(): Promise<void> {
    if (this.recordingState() === 'stopped') return;
    this.recordingState.set('stopped');
    this.stopTimer();
    this.clearTimers();

    await new Promise<void>(resolve => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => resolve();
        this.mediaRecorder.stop();
      } else {
        resolve();
      }
    });
    this.stopStream();
  }

  // ── File handling ──────────────────────────────────────────────────────────
  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;
    this.selectedFile.set(file);
    this.uploadError.set(null);
    this.isUploaded.set(false);

    // Stop any active recording and move to stopped state
    this.clearTimers();
    this.stopStream();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.audioChunks = [];
    this.recordingState.set('stopped');
    this.stopTimer();
  }

  clearFile(): void {
    this.selectedFile.set(null);
    this.isUploaded.set(false);
    this.uploadError.set(null);
  }

  get selectedFileName(): string { return this.selectedFile()?.name ?? ''; }
  get selectedFileSize(): string {
    const bytes = this.selectedFile()?.size ?? 0;
    if (!bytes) return '';
    const kb = bytes / 1024;
    return kb < 1024 ? Math.round(kb) + ' KB' : (kb / 1024).toFixed(1) + ' MB';
  }

  // ── Step 1: Upload audio ───────────────────────────────────────────────────
  // POST /api/audio/upload  (multipart: AudioFile + VisitId)
  uploadAudio(): void {
    if (!this.canUpload) return;

    const file    = this.selectedFile();
    const micBlob = this.audioChunks.length > 0
      ? new Blob(this.audioChunks, { type: 'audio/webm' })
      : null;
    const toUpload = file ?? micBlob;
    if (!toUpload) return;

    const form = new FormData();
    // Field names must match backend exactly: AudioFile, VisitId
    form.append('AudioFile', toUpload, file?.name ?? 'recording.webm');
    form.append('VisitId',   String(this.visitId()));

    this.isUploading.set(true);
    this.uploadError.set(null);

    this.http.post(API.AUDIO.UPLOAD, form).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.isUploaded.set(true);   // unlock Generate Summary button
      },
      error: (err: HttpErrorResponse) => {
        this.isUploading.set(false);
        const msg = err.error?.message ?? err.error?.detail ?? 'Upload failed. Please try again.';
        this.uploadError.set(msg);
      }
    });
  }

  // ── Step 2: Poll for summary ───────────────────────────────────────────────
  // GET /api/visits/{visitId}/summary
  // • 404 → still processing, keep polling
  // • 200 → done, navigate to summary page
  // • other → stop, show error
generateSummary(): void {
  if (!this.canGenerateSummary) return;

  this.isPolling.set(true);
  this.pollError.set(null);

  const visitId = this.visitId();

  this.pollSub = interval(5000).pipe(
    switchMap(() =>
      this.http.get<any>(API.SUMMARY.BASE(visitId)).pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) {
            // Still processing — swallow the error, let interval fire again
            return EMPTY;
          }
          // Real error — rethrow to stop polling
          throw err;
        })
      )
    )
  ).subscribe({
    next: (summary) => {
      // 200 received — stop polling and navigate
      this.pollSub?.unsubscribe();
      this.isPolling.set(false);
      this.router.navigate([`/doctor/visit-summary/${visitId}`], {
        state: { patient: this.patient(), summary }
      });
    },
    error: (err: HttpErrorResponse) => {
      this.isPolling.set(false);
      const msg = err.error?.detail ?? err.error?.message ?? 'AI processing failed. Please try again.';
      this.pollError.set(msg);
    }
  });
}

  // ── Waveform ───────────────────────────────────────────────────────────────
  private animateWaveform(): void {
    if (!this.analyser) return;
    const buf = new Uint8Array(this.analyser.frequencyBinCount);
    const tick = () => {
      const state = this.recordingState();
      if (state === 'stopped' || state === 'idle') return;
      this.analyser!.getByteFrequencyData(buf);
      const bars = this.waveformBars.map(i => {
        const idx = Math.floor(i * (buf.length / this.waveformBars.length));
        return state === 'paused' ? 4 : Math.max(4, Math.min(56, (buf[idx] || 0) * 0.5));
      });
      this.zone.run(() => this.barHeights.set(bars));
      this.animFrame = requestAnimationFrame(tick);
    };
    this.animFrame = requestAnimationFrame(tick);
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  private clearTimers(): void {
    if (this.animFrame) { cancelAnimationFrame(this.animFrame); this.animFrame = null; }
  }

  private stopStream(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.audioCtx?.close().catch(() => {});
    this.stream = null; this.analyser = null; this.audioCtx = null;
  }
}
