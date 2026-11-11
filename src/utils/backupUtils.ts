import { FullBackupData, EncryptedBackupData } from '../types';

/**
 * Validates and migrates backup JSON.
 * Migrates version 1 backups (converting 'OVERTIME' status to 'PRESENT' + overtimeHours).
 */
export function validateBackupJson(jsonString: string): { isValid: boolean; data?: FullBackupData; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'Backup file is not a valid JSON object.' };
    }

    // Check if this is an encrypted backup
    if (parsed.isEncrypted && parsed.ciphertext && parsed.salt && parsed.iv) {
      return { isValid: false, error: 'ENCRYPTED_BACKUP' };
    }

    if (!Array.isArray(parsed.activities)) {
      return { isValid: false, error: 'Missing or invalid "activities" list in backup file.' };
    }

    if (!Array.isArray(parsed.members)) {
      return { isValid: false, error: 'Missing or invalid "members" list in backup file.' };
    }

    if (!Array.isArray(parsed.attendance)) {
      return { isValid: false, error: 'Missing or invalid "attendance" records in backup file.' };
    }

    // Schema Migration:
    // If any attendance record has status === 'OVERTIME', migrate to 'PRESENT' with overtimeHours
    const migratedAttendance = parsed.attendance.map((rec: any) => {
      if (rec && rec.status === 'OVERTIME') {
        return {
          ...rec,
          status: 'PRESENT',
          overtimeHours: rec.overtimeHours !== undefined ? Number(rec.overtimeHours) : 2,
        };
      }
      return rec;
    });

    const validated: FullBackupData = {
      version: typeof parsed.version === 'number' ? parsed.version : 2,
      appVersion: parsed.appVersion || '2.0.0',
      exportDate: parsed.exportDate || new Date().toISOString(),
      settings: parsed.settings || {},
      activities: parsed.activities,
      members: parsed.members,
      attendance: migratedAttendance,
      shifts: Array.isArray(parsed.shifts) ? parsed.shifts : [],
      holidays: Array.isArray(parsed.holidays) ? parsed.holidays : [],
    };

    return { isValid: true, data: validated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown JSON parse error';
    return { isValid: false, error: `Invalid JSON syntax: ${message}` };
  }
}

export function downloadJsonFile(content: object, fileName: string) {
  const jsonStr = JSON.stringify(content, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ----------------- WEB CRYPTO AES-GCM ENCRYPTION -----------------

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptBackup(data: FullBackupData, password: string): Promise<EncryptedBackupData> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const enc = new TextEncoder();
  const encodedData = enc.encode(JSON.stringify(data));

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    encodedData
  );

  // Convert cipherBuffer to base64
  let binary = '';
  const bytes = new Uint8Array(cipherBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const ciphertext = btoa(binary);

  return {
    version: 2,
    isEncrypted: true,
    algorithm: 'AES-GCM',
    salt: bufferToHex(salt.buffer),
    iv: bufferToHex(iv.buffer),
    ciphertext,
    exportDate: new Date().toISOString(),
  };
}

export async function decryptBackup(encryptedData: EncryptedBackupData, password: string): Promise<FullBackupData> {
  try {
    const salt = hexToBuffer(encryptedData.salt);
    const iv = hexToBuffer(encryptedData.iv);
    const key = await deriveKey(password, salt);

    const binaryString = atob(encryptedData.ciphertext);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
      },
      key,
      bytes as unknown as BufferSource
    );

    const dec = new TextDecoder();
    const jsonStr = dec.decode(decryptedBuffer);
    const result = validateBackupJson(jsonStr);
    if (!result.isValid || !result.data) {
      throw new Error(result.error || 'Decrypted data is not a valid backup.');
    }
    return result.data;
  } catch (err: unknown) {
    throw new Error('Incorrect decryption password or corrupt encrypted backup file.');
  }
}

// ----------------- STORAGE ESTIMATE & PERSISTENCE -----------------

export async function getStorageEstimate(): Promise<{ usageMB: number; quotaMB: number; percent: number } | null> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usageMB = Number(((estimate.usage || 0) / (1024 * 1024)).toFixed(2));
      const quotaMB = Number(((estimate.quota || 0) / (1024 * 1024)).toFixed(1));
      const percent = quotaMB > 0 ? Number(((usageMB / quotaMB) * 100).toFixed(2)) : 0;
      return { usageMB, quotaMB, percent };
    } catch {
      return null;
    }
  }
  return null;
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        return await navigator.storage.persist();
      }
      return isPersisted;
    } catch {
      return false;
    }
  }
  return false;
}
