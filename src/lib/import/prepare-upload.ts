/**
 * Gets an upload ready for smart import. PDFs and Word documents go as
 * they are. Photos are scaled to at most 2000px and sent as JPEG: phone
 * photos are often 5–10 MB and HEIC, and the program text reads just as
 * well smaller.
 */

export const PDF = "application/pdf";
export const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const ACCEPT = `${PDF},.pdf,${DOCX},.docx,image/*`;

const MAX_DOC_BYTES = 10 * 1024 * 1024;
const MAX_PHOTO_SIDE = 2000;

export class UploadError extends Error {}

export interface PreparedUpload {
  file: Blob;
  fileName: string;
}

const isImage = (f: File) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name);

export async function prepareUpload(file: File): Promise<PreparedUpload> {
  const name = file.name || "program";
  if (/\.doc$/i.test(name)) {
    throw new UploadError("Older Word files (.doc) can't be read. Save it as .docx or PDF and try again.");
  }
  if (file.type === PDF || /\.pdf$/i.test(name) || file.type === DOCX || /\.docx$/i.test(name)) {
    if (file.size > MAX_DOC_BYTES) {
      throw new UploadError("That file is over 10 MB. Upload just the order of service.");
    }
    // Some browsers leave the type blank; the server checks it.
    const type = file.type || (/\.pdf$/i.test(name) ? PDF : DOCX);
    return { file: file.type ? file : new Blob([file], { type }), fileName: name };
  }
  if (isImage(file)) return { file: await toJpeg(file), fileName: name.replace(/\.[^.]+$/, "") + ".jpg" };
  throw new UploadError("Upload a PDF, a Word document (.docx) or a photo of the program.");
}

async function toJpeg(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new UploadError(
      "This photo can't be opened in this browser. Take a screenshot of it, or save it as JPG, and try again.",
    );
  }
  const k = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new UploadError("Couldn't prepare that photo. Try another one.");
  return blob;
}
