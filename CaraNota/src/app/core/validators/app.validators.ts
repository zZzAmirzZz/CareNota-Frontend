import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVE / FIELD-LEVEL VALIDATORS
// Each function mirrors the corresponding FluentValidation rule on the backend.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Password — min 8 chars, at least one uppercase letter, at least one special
 * character.
 * Matches: RegisterDto (minLength 8), CreateDoctorDto / CreateReceptionistDto
 * (minLength 1 on the DTO but the auth layer enforces 8+).
 */
export function strongPassword(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value ?? '';
  const errors: ValidationErrors = {};
  if (v.length < 8)            errors['minlength']  = { requiredLength: 8, actualLength: v.length };
  if (!/[A-Z]/.test(v))        errors['uppercase']  = true;
  if (!/[^A-Za-z0-9]/.test(v)) errors['special']    = true;
  return Object.keys(errors).length ? errors : null;
}

/**
 * Egyptian phone number.
 * Accepts: 01XXXXXXXXX (11 digits, prefix 010 / 011 / 012 / 015)
 * or +201XXXXXXXXX (13 chars with country code).
 * Matches: RegisterDto / CreateDoctorDto / CreateReceptionistDto phoneNumber.
 */
export function egyptianPhone(control: AbstractControl): ValidationErrors | null {
  const v: string = (control.value ?? '').trim();
  const valid = /^(\+20|0)1[0-2,5]\d{8}$/.test(v);
  return valid ? null : { egyptianPhone: true };
}

/**
 * Rejects blank / whitespace-only strings.
 * Used on every NotEmpty() field that can still receive spaces from the user.
 */
export function noWhitespace(control: AbstractControl): ValidationErrors | null {
  const isBlank = (control.value ?? '').trim().length === 0;
  return isBlank ? { whitespace: true } : null;
}

/**
 * Maximum character length.
 * Factory — pass the same number used in the backend MaximumLength() call.
 *
 * Usage:  Validators.compose([maxLength(150)])
 * (Angular's built-in Validators.maxLength does the same — this is a named
 *  wrapper so error keys stay consistent across the app.)
 */
export function maxLength(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const len = (control.value ?? '').length;
    return len > max ? { maxlength: { requiredLength: max, actualLength: len } } : null;
  };
}

/**
 * Minimum numeric value — mirrors GreaterThan(0) on integer ID fields.
 * Use on FormControls that hold numeric IDs (patientID, doctorID, visitID …).
 */
export function positiveInteger(control: AbstractControl): ValidationErrors | null {
  const v = Number(control.value);
  return isNaN(v) || v <= 0 ? { positiveInteger: true } : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-FIELD / GROUP-LEVEL VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensures two sibling controls have the same value.
 * Attach to the FormGroup, not an individual control.
 *
 * Usage:
 *   fb.group({ password: [], confirmPassword: [] }, { validators: mustMatch('password', 'confirmPassword') })
 *
 * Matches: ChangePasswordDto (newPassword / confirmNewPassword).
 */
export function mustMatch(controlName: string, matchingControlName: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(controlName)?.value;
    const b = group.get(matchingControlName)?.value;
    if (a !== b) {
      group.get(matchingControlName)?.setErrors({ mustMatch: true });
      return { mustMatch: true };
    }
    // Only clear mustMatch — don't wipe out other errors already on the control.
    const existing = group.get(matchingControlName)?.errors;
    if (existing) {
      const { mustMatch: _, ...rest } = existing;
      group.get(matchingControlName)?.setErrors(Object.keys(rest).length ? rest : null);
    }
    return null;
  };
}

/**
 * Ensures startTime < endTime on a FormGroup with those two controls.
 * Attach to the FormGroup.
 *
 * Matches: CreateAppointmentValidator / UpdateAppointmentValidator time rules.
 *
 * Usage:
 *   fb.group({ startTime: [], endTime: [] }, { validators: endAfterStart('startTime', 'endTime') })
 */
export function endAfterStart(startName: string, endName: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const start = group.get(startName)?.value;
    const end   = group.get(endName)?.value;
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate   = new Date(end);
    if (endDate <= startDate) {
      group.get(endName)?.setErrors({ endBeforeStart: true });
      return { endBeforeStart: true };
    }
    const existing = group.get(endName)?.errors;
    if (existing) {
      const { endBeforeStart: _, ...rest } = existing;
      group.get(endName)?.setErrors(Object.keys(rest).length ? rest : null);
    }
    return null;
  };
}

/**
 * Ensures a datetime value is in the future (UTC).
 * Matches: CreateAppointmentValidator — StartTime must be > DateTime.UtcNow.
 */
export function futureDate(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const date = new Date(control.value);
  return date <= new Date() ? { pastDate: true } : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN-SPECIFIC VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Blood type — only the 8 standard ABO/Rh combinations.
 * Matches: UpdatePatientValidator AllowedBloodTypes.
 */
export function bloodType(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const allowed = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  return allowed.includes(control.value) ? null : { bloodType: true };
}

/**
 * Gender — only the three values accepted by the backend.
 * Matches: UpdatePatientValidator AllowedGenders / RegisterDto gender field.
 */
export function gender(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const allowed = ['Male', 'Female', 'Other'];
  return allowed.includes(control.value) ? null : { gender: true };
}

/**
 * Appointment status — must be one of the three enum values.
 * Matches: UpdateAppointmentValidator Status.IsInEnum().
 */
export function appointmentStatus(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const allowed = ['Scheduled', 'Completed', 'Cancelled'];
  return allowed.includes(control.value) ? null : { appointmentStatus: true };
}

/**
 * Audio file validator — checks extension and MIME type before upload.
 * Matches: AudioUploadValidator (AllowedExtensions / AllowedContentTypes / MaxFileSizeBytes).
 *
 * Use on a FormControl whose value is a File object.
 */
export function audioFile(control: AbstractControl): ValidationErrors | null {
  const file: File | null = control.value;
  if (!file) return null;

  const errors: ValidationErrors = {};

  const allowedExtensions  = ['.wav', '.mp3', '.m4a'];
  const allowedContentTypes = [
    'audio/wav', 'audio/x-wav',
    'audio/mpeg', 'audio/mp3',
    'audio/x-m4a', 'audio/mp4', 'audio/m4a',
  ];
  const maxSizeBytes = 52_428_800; // 50 MB

  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(ext))              errors['audioExtension']    = true;
  if (!allowedContentTypes.includes(file.type))      errors['audioContentType']  = true;
  if (file.size > maxSizeBytes)                      errors['audioSize']         = { max: 50, unit: 'MB' };

  return Object.keys(errors).length ? errors : null;
}

/**
 * Lab result file — PDF / image only, max 5 MB.
 * Matches: UploadLabResultValidator.
 *
 * Use on a FormControl whose value is a File object.
 */
export function labResultFile(control: AbstractControl): ValidationErrors | null {
  const file: File | null = control.value;
  if (!file) return null;

  const errors: ValidationErrors = {};

  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  const maxSizeBytes = 5_242_880; // 5 MB

  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(ext))  errors['labFileExtension'] = true;
  if (file.size > maxSizeBytes)          errors['labFileSize']      = { max: 5, unit: 'MB' };

  return Object.keys(errors).length ? errors : null;
}

/**
 * Summary rating — integer between 1 and 5 inclusive.
 * Matches: RateSummaryValidator InclusiveBetween(1, 5).
 */
export function summaryRating(control: AbstractControl): ValidationErrors | null {
  const v = Number(control.value);
  if (isNaN(v) || !Number.isInteger(v) || v < 1 || v > 5) {
    return { summaryRating: { min: 1, max: 5 } };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HUMAN-READABLE ERROR MESSAGES
// Import this map in your components / a shared pipe to display errors.
//
// Usage in template:
//   <span *ngIf="ctrl.errors">{{ validationMessages[firstKey(ctrl.errors)] }}</span>
// ─────────────────────────────────────────────────────────────────────────────

export const validationMessages: Record<string, string | ((err: unknown) => string)> = {
  required:           'This field is required.',
  whitespace:         'This field cannot be blank.',
  minlength:          (e: any) => `Minimum ${e.requiredLength} characters required.`,
  maxlength:          (e: any) => `Cannot exceed ${e.requiredLength} characters.`,
  email:              'Enter a valid email address.',
  egyptianPhone:      'Enter a valid Egyptian phone number (e.g. 01012345678).',
  uppercase:          'Password must contain at least one uppercase letter.',
  special:            'Password must contain at least one special character.',
  mustMatch:          'Passwords do not match.',
  positiveInteger:    'Must be a valid positive number.',
  pastDate:           'Date must be in the future.',
  endBeforeStart:     'End time must be after start time.',
  bloodType:          'Must be a valid blood type (A+, A-, B+, B-, AB+, AB-, O+, O-).',
  gender:             'Must be Male, Female, or Other.',
  appointmentStatus:  'Must be Scheduled, Completed, or Cancelled.',
  audioExtension:     'Only .wav, .mp3, and .m4a files are accepted.',
  audioContentType:   'Invalid audio format.',
  audioSize:          'Audio file must not exceed 50 MB.',
  labFileExtension:   'Only PDF, JPG, JPEG, and PNG files are accepted.',
  labFileSize:        'File must not exceed 5 MB.',
  summaryRating:      'Rating must be between 1 and 5.',
};

/**
 * Helper — returns the first error key from a ValidationErrors object.
 * Useful in templates: {{ getMessage(ctrl.errors) }}
 */
export function getFirstMessage(errors: ValidationErrors | null): string {
  if (!errors) return '';
  const key = Object.keys(errors)[0];
  const msg = validationMessages[key];
  if (!msg) return 'Invalid value.';
  return typeof msg === 'function' ? msg(errors[key]) : msg;
}
