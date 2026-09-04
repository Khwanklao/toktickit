import { describe, it, expect } from "vitest";
import { validateAttachmentFile } from "../../src/utils/attachment-validation.js";

describe("UNIT-02: Attachment validation logic tests (BR-06, AC-04, AC-23)", () => {
  it("passes validation for valid JPEG, PNG, WEBP, and PDF files within 5MB", () => {
    const validJpeg = {
      fieldname: "file",
      originalname: "test.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from("test"),
    } as Express.Multer.File;

    const validPng = {
      fieldname: "file",
      originalname: "test.png",
      encoding: "7bit",
      mimetype: "image/png",
      size: 2 * 1024 * 1024, // 2MB
      buffer: Buffer.from("test"),
    } as Express.Multer.File;

    const validWebp = {
      fieldname: "file",
      originalname: "test.webp",
      encoding: "7bit",
      mimetype: "image/webp",
      size: 500 * 1024,
      buffer: Buffer.from("test"),
    } as Express.Multer.File;

    const validPdf = {
      fieldname: "file",
      originalname: "test.pdf",
      encoding: "7bit",
      mimetype: "application/pdf",
      size: 5 * 1024 * 1024, // Exactly 5MB
      buffer: Buffer.from("test"),
    } as Express.Multer.File;

    expect(validateAttachmentFile(validJpeg).isValid).toBe(true);
    expect(validateAttachmentFile(validPng).isValid).toBe(true);
    expect(validateAttachmentFile(validWebp).isValid).toBe(true);
    expect(validateAttachmentFile(validPdf).isValid).toBe(true);
  });

  it("rejects missing file or undefined file", () => {
    const res = validateAttachmentFile(undefined);
    expect(res.isValid).toBe(false);
    expect(res.message).toContain("required");
  });

  it("rejects empty files (0 bytes)", () => {
    const emptyFile = {
      fieldname: "file",
      originalname: "empty.txt",
      encoding: "7bit",
      mimetype: "text/plain",
      size: 0,
      buffer: Buffer.from(""),
    } as Express.Multer.File;

    const res = validateAttachmentFile(emptyFile);
    expect(res.isValid).toBe(false);
    expect(res.message).toContain("empty");
  });

  it("rejects files exceeding 5MB (5,242,880 bytes)", () => {
    const oversizedFile = {
      fieldname: "file",
      originalname: "large.pdf",
      encoding: "7bit",
      mimetype: "application/pdf",
      size: 5 * 1024 * 1024 + 1, // 5MB + 1 byte
      buffer: Buffer.from("test"),
    } as Express.Multer.File;

    const res = validateAttachmentFile(oversizedFile);
    expect(res.isValid).toBe(false);
    expect(res.message).toContain("5MB");
  });

  it("rejects unsupported MIME types (e.g. text/plain, application/zip, image/gif, video/mp4)", () => {
    const textFile = {
      fieldname: "file",
      originalname: "test.txt",
      encoding: "7bit",
      mimetype: "text/plain",
      size: 1024,
      buffer: Buffer.from("test"),
    } as Express.Multer.File;

    const zipFile = {
      fieldname: "file",
      originalname: "archive.zip",
      encoding: "7bit",
      mimetype: "application/zip",
      size: 1024,
      buffer: Buffer.from("test"),
    } as Express.Multer.File;

    expect(validateAttachmentFile(textFile).isValid).toBe(false);
    expect(validateAttachmentFile(zipFile).isValid).toBe(false);
  });
});
