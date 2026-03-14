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

export const verifyImageFileType = verifyByMagicBytes(
  IMAGE_MIME_TYPES,
  "Invalid file type. Only images are allowed."
);

export const verifyImageOrPdfFileType = verifyByMagicBytes(
  IMAGE_AND_PDF_MIME_TYPES,
  "Invalid file type. File content does not match allowed image/PDF types."
);
