export interface ValidationErrorDetail {
  field: string;
  code: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; errors?: undefined }
  | { ok: false; errors: ValidationErrorDetail[] };

export class ValidationError extends Error {
  public readonly errors: ValidationErrorDetail[];

  constructor(message: string, errors: ValidationErrorDetail[] = []) {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
}
