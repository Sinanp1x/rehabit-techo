// src/services/crypto.ts — E2EE via Web Crypto API (AES-256-GCM + PBKDF2)
// The master password NEVER leaves the device.

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function bufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

// ─────────────────────────────────────────────
// Key Derivation
// ─────────────────────────────────────────────

export function generateSalt(): string {
  return bufferToBase64(crypto.getRandomValues(new Uint8Array(SALT_BYTES)).buffer);
}

export async function deriveKey(password: string, saltB64: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: base64ToBuffer(saltB64),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ─────────────────────────────────────────────
// Encrypt / Decrypt
// ─────────────────────────────────────────────

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string;         // base64
}

export async function encryptData(key: CryptoKey, plaintext: string): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  );
  return {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv.buffer),
  };
}

export async function decryptData(
  key: CryptoKey,
  payload: EncryptedPayload,
): Promise<string> {
  const dec = new TextDecoder();
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(payload.iv) },
    key,
    base64ToBuffer(payload.ciphertext),
  );
  return dec.decode(plaintext);
}

// ─────────────────────────────────────────────
// Recovery Code
// ─────────────────────────────────────────────

export function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  // Format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  return hex.match(/.{1,4}/g)?.join('-') ?? hex;
}

// ─────────────────────────────────────────────
// Verify Password (attempt decrypt of a known test string)
// ─────────────────────────────────────────────

const VERIFY_PLAINTEXT = 'rehabit-echo-verify-v1';

export async function encryptVerifier(key: CryptoKey): Promise<EncryptedPayload> {
  return encryptData(key, VERIFY_PLAINTEXT);
}

export async function verifyPassword(
  key: CryptoKey,
  verifier: EncryptedPayload,
): Promise<boolean> {
  try {
    const result = await decryptData(key, verifier);
    return result === VERIFY_PLAINTEXT;
  } catch {
    return false;
  }
}
