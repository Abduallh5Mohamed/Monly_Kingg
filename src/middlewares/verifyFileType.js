import fsp from "fs/promises";
import { fileTypeFromBuffer } from "file-type";

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

const IMAGE_AND_PDF_MIME_TYPES = [...IMAGE_MIME_TYPES, "application/pdf"];
const ALLOWED_ALL_MIMES = [...IMAGE_AND_PDF_MIME_TYPES];

const getUploadedFiles = (req) => {
  if (Array.isArray(req.files)) return req.files;
  if (req.file) return [req.file];
  if (req.files && typeof req.files === "object") {
    return Object.values(req.files).flat();
  }
  return [];
};

const removeFiles = async (files) => {
  await Promise.all(files.map((file) => fsp.unlink(file.path).catch(() => {})));
};

const verifyByMagicBytes = (allowedTypes, invalidMessage) => async (req, res, next) => {
  if (!req.file) return next();

  try {
    const buffer = await fsp.readFile(req.file.path);
    const detected = await fileTypeFromBuffer(buffer);

    if (!detected || !allowedTypes.includes(detected.mime)) {
      await fsp.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        message: invalidMessage,
      });
    }

    return next();
  } catch (_error) {
    await fsp.unlink(req.file.path).catch(() => {});
    return res.status(400).json({
      success: false,
      message: "File validation failed",
    });
  }
};

export const verifyImageFileType = async (req, res, next) => {
  // SECURITY FIX: Validate all uploaded files (single, array, and fields-object uploads).
  const files = getUploadedFiles(req);
  if (!files.length) return next();

  try {
    for (const file of files) {
      const buffer = await fsp.readFile(file.path);
      const detected = await fileTypeFromBuffer(buffer);
      if (!detected || !IMAGE_MIME_TYPES.includes(detected.mime)) {
        await removeFiles(files);
        return res.status(400).json({
          success: false,
          message: "Invalid file type. Only images are allowed.",
        });
      }
    }

    return next();
  } catch (_error) {
    await removeFiles(files);
    return res.status(400).json({
      success: false,
      message: "File validation failed",
    });
  }
};

export const verifyImageOrPdfFileType = verifyByMagicBytes(
  IMAGE_AND_PDF_MIME_TYPES,
  "Invalid file type. File content does not match allowed image/PDF types."
);

export const verifyAnyFileType = async (req, res, next) => {
  const files = getUploadedFiles(req);
  if (!files.length) return next();

  try {
    for (const file of files) {
      const buffer = await fsp.readFile(file.path);
      const detected = await fileTypeFromBuffer(buffer);
      if (!detected || !ALLOWED_ALL_MIMES.includes(detected.mime)) {
        await removeFiles(files);
        return res.status(400).json({ success: false, message: "Invalid file type detected" });
      }
    }

    return next();
  } catch (_error) {
    await removeFiles(files);
    return res.status(400).json({ success: false, message: "File validation failed" });
  }
};
