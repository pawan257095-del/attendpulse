import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBackupJson, encryptBackup, decryptBackup } from './backupUtils';
import { FullBackupData } from '../types';

test('backup validation migrates legacy OVERTIME records to PRESENT with overtimeHours', () => {
  const legacyBackup = JSON.stringify({
    version: 1,
    exportDate: '2026-11-01T00:00:00Z',
    activities: [{ id: 'act-1', name: 'Factory' }],
    members: [{ id: 'm-1', name: 'Bob', memberCode: 'B01' }],
    attendance: [
      { id: 'rec-1', activityId: 'act-1', memberId: 'm-1', date: '2026-11-02', status: 'PRESENT' },
      { id: 'rec-2', activityId: 'act-1', memberId: 'm-1', date: '2026-11-03', status: 'OVERTIME', overtimeHours: 3.5 },
      { id: 'rec-3', activityId: 'act-1', memberId: 'm-1', date: '2026-11-04', status: 'OVERTIME' }, // legacy without explicit hours
    ],
  });

  const result = validateBackupJson(legacyBackup);
  assert.equal(result.isValid, true);
  assert.ok(result.data);
  assert.equal(result.data.attendance.length, 3);
  assert.equal(result.data.attendance[0].status, 'PRESENT');
  // rec-2 converted
  assert.equal(result.data.attendance[1].status, 'PRESENT');
  assert.equal(result.data.attendance[1].overtimeHours, 3.5);
  // rec-3 converted with fallback 2h
  assert.equal(result.data.attendance[2].status, 'PRESENT');
  assert.equal(result.data.attendance[2].overtimeHours, 2);
});

test('backup validation rejects invalid JSON and non-backup objects', () => {
  assert.equal(validateBackupJson('{invalid json').isValid, false);
  assert.equal(validateBackupJson(JSON.stringify({ notAnArray: 123 })).isValid, false);
  assert.equal(validateBackupJson(JSON.stringify({ activities: 'invalid' })).isValid, false);
});

test('AES-GCM encryption and decryption roundtrip works with password', async () => {
  const sampleData: FullBackupData = {
    version: 2,
    appVersion: '2.0.0',
    exportDate: '2026-11-10T00:00:00Z',
    settings: {
      theme: 'light',
      enableNotifications: false,
      autoBackupFrequency: 'never',
      dateFormat: 'YYYY-MM-DD',
      firstDayOfWeek: 1,
      compactView: false,
      enableAppLock: false,
    },
    activities: [{
      id: 'act-test',
      name: 'Confidential Project',
      color: '#4f46e5',
      icon: 'shield',
      startDate: '2026-01-01',
      workingDays: [1, 2, 3, 4, 5],
      workingHours: 8,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    }],
    members: [{
      id: 'mem-1',
      activityId: 'act-test',
      name: 'Classified Agent',
      memberCode: '007',
      joiningDate: '2026-01-01',
      isActive: true,
      createdAt: '',
      updatedAt: '',
    }],
    attendance: [{
      id: 'att-1',
      activityId: 'act-test',
      memberId: 'mem-1',
      date: '2026-11-10',
      status: 'PRESENT',
      createdAt: '',
      updatedAt: '',
    }],
    shifts: [],
    holidays: [],
  };

  const password = 'StrongPassword123!';
  const encrypted = await encryptBackup(sampleData, password);

  assert.equal(encrypted.isEncrypted, true);
  assert.equal(encrypted.algorithm, 'AES-GCM');
  assert.ok(encrypted.ciphertext.length > 20);
  assert.ok(encrypted.salt.length === 32); // 16 bytes hex

  // Decrypt with correct password
  const decrypted = await decryptBackup(encrypted, password);
  assert.equal(decrypted.activities[0].name, 'Confidential Project');
  assert.equal(decrypted.members[0].name, 'Classified Agent');

  // Decrypt with incorrect password should fail
  await assert.rejects(
    async () => {
      await decryptBackup(encrypted, 'WrongPassword!');
    },
    /Incorrect decryption password/
  );
});
