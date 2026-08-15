const BYTE_CHUNK_SIZE = 0x8000;

export function encodeUtf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += BYTE_CHUNK_SIZE) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + BYTE_CHUNK_SIZE),
    );
  }

  return btoa(binary);
}

export function decodeUtf8Base64(value: string | null): string | null {
  if (value === null) return null;

  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
