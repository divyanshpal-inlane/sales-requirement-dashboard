/**
 * Form signatures are bundled into the admin JS (inlined data URLs), not
 * copied to /public. That means they are not available at a guessable
 * URL like /assets/instructor-signature.png.
 *
 * Decode with atob — `fetch(data:...)` fails in some browsers once the
 * data URL is large, which breaks bulk Form 14/15/5 generation.
 */
import instructorSignatureDataUrl from "@/assets/signatures/instructor-signature.png?inline";
import principalSignatureDataUrl from "@/assets/signatures/principal-signature.jpg?inline";

function dataUrlToBytes(dataUrl: string): ArrayBuffer {
  if (!dataUrl) throw new Error("Signature asset failed to load");
  const comma = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || comma < 0) {
    throw new Error("Signature asset is not an inlined data URL");
  }
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

let instructorBytes: ArrayBuffer | null = null;
let principalBytes: ArrayBuffer | null = null;

export async function loadInstructorSignatureBytes(): Promise<ArrayBuffer> {
  instructorBytes ??= dataUrlToBytes(instructorSignatureDataUrl);
  return instructorBytes.slice(0);
}

export async function loadPrincipalSignatureBytes(): Promise<ArrayBuffer> {
  principalBytes ??= dataUrlToBytes(principalSignatureDataUrl);
  return principalBytes.slice(0);
}
