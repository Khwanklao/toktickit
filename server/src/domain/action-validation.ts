import { ValidationResult, ValidationErrorDetail } from "./errors.js";

export interface ActionInputData {
  description?: string | null;
  result?: string | null;
  followUpRequired?: boolean | null;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
}

export function validateActionInput(data: ActionInputData): ValidationResult {
  const errors: ValidationErrorDetail[] = [];

  // Description validation: 5 to 2,000 characters, whitespace-only invalid
  const desc = typeof data.description === "string" ? data.description.trim() : "";
  if (!desc || desc.length < 5 || desc.length > 2000) {
    errors.push({
      field: "description",
      code: "VALIDATION_ERROR",
      message: "Description must be between 5 and 2,000 characters and cannot be whitespace-only.",
    });
  }

  // Result validation: 5 to 2,000 characters, whitespace-only invalid
  const result = typeof data.result === "string" ? data.result.trim() : "";
  if (!result || result.length < 5 || result.length > 2000) {
    errors.push({
      field: "result",
      code: "VALIDATION_ERROR",
      message: "Result must be between 5 and 2,000 characters and cannot be whitespace-only.",
    });
  }

  // Follow-up validation: required 5 to 2,000 chars when followUpRequired is true
  if (data.followUpRequired !== undefined && data.followUpRequired !== null && typeof data.followUpRequired !== "boolean") {
    errors.push({
      field: "followUpRequired",
      code: "VALIDATION_ERROR",
      message: "followUpRequired must be a boolean.",
    });
  } else if (data.followUpRequired === true) {
    const note = typeof data.followUpNote === "string" ? data.followUpNote.trim() : "";
    if (!note || note.length < 5 || note.length > 2000) {
      errors.push({
        field: "followUpNote",
        code: "VALIDATION_ERROR",
        message: "Follow-up note is required and must be between 5 and 2,000 characters when follow-up is required.",
      });
    }
  }

  // Attachment notes: optional, up to 500 characters
  if (data.attachmentNotes !== undefined && data.attachmentNotes !== null) {
    if (data.attachmentNotes.length > 500) {
      errors.push({
        field: "attachmentNotes",
        code: "VALIDATION_ERROR",
        message: "Attachment notes cannot exceed 500 characters.",
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
}
