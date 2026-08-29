/**
 * Form signatures are bundled into the admin JS (inlined data URLs), not
 * copied to /public. That means they are not available at a guessable
 * URL like /assets/instructor-signature.png.
 */
import instructorSignatureDataUrl from "@/assets/signatures/instructor-signature.png?inline";
import principalSignatureDataUrl from "@/assets/signatures/principal-signature.jpg?inline";

async function dataUrlToBytes(dataUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(dataUrl);
  if (!res.ok) throw new Error("Failed to decode signature");
  return res.arrayBuffer();
}

export const loadInstructorSignatureBytes = () =>
  dataUrlToBytes(instructorSignatureDataUrl);

export const loadPrincipalSignatureBytes = () =>
  dataUrlToBytes(principalSignatureDataUrl);
