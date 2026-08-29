/**
 * Form signatures live in src/assets (bundled with content hashes), not in
 * /public, so they are not available at a guessable URL like
 * /assets/instructor-signature.png.
 */
import instructorSignatureUrl from "@/assets/signatures/instructor-signature.png";
import principalSignatureUrl from "@/assets/signatures/principal-signature.png";

async function urlToBytes(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Signature asset failed to load");
  return res.arrayBuffer();
}

let instructorBytes: ArrayBuffer | null = null;
let principalBytes: ArrayBuffer | null = null;

export async function loadInstructorSignatureBytes(): Promise<ArrayBuffer> {
  instructorBytes ??= await urlToBytes(instructorSignatureUrl);
  return instructorBytes.slice(0);
}

export async function loadPrincipalSignatureBytes(): Promise<ArrayBuffer> {
  principalBytes ??= await urlToBytes(principalSignatureUrl);
  return principalBytes.slice(0);
}
