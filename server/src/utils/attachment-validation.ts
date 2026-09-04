export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB = 5,242,880 bytes

export interface FileValidationResult {
  isValid: boolean;
  message?: string;
}

export function validateAttachmentFile(file?: Express.Multer.File): FileValidationResult {
  if (!file) {
    return {
      isValid: false,
      message: "Attachment file is required",
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      message: "Attachment file cannot be empty (0 bytes)",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      message: "File size exceeds maximum allowed limit of 5MB",
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      isValid: false,
      message: `Invalid MIME type '${file.mimetype}'. Allowed types: image/jpeg, image/png, image/webp, application/pdf`,
    };
  }

  return { isValid: true };
}
