/**
 * Storage upload validation unit tests (SEC-2 / SEC-3)
 * Run with: node --test tests/storage/upload-validation.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { is_mime_allowed, is_extension_dangerous, can_modify_file } from '../../src/modules/storage/upload-validation.js';

describe('SEC-3: is_mime_allowed', () => {
  it('allows common document/image types', () => {
    assert.equal(is_mime_allowed('image/png'), true);
    assert.equal(is_mime_allowed('application/pdf'), true);
    assert.equal(is_mime_allowed('application/vnd.openxmlformats-officedocument.wordprocessingml.document'), true);
  });

  it('rejects executable/script mime types', () => {
    assert.equal(is_mime_allowed('application/x-msdownload'), false);
    assert.equal(is_mime_allowed('application/x-sh'), false);
    assert.equal(is_mime_allowed('application/octet-stream'), false);
  });

  it('rejects an empty or unknown mime type', () => {
    assert.equal(is_mime_allowed(''), false);
    assert.equal(is_mime_allowed('made/up'), false);
  });
});

describe('SEC-3: is_extension_dangerous', () => {
  it('flags common executable/script extensions', () => {
    for (const name of ['malware.exe', 'payload.bat', 'run.sh', 'script.ps1', 'installer.msi', 'lib.dll', 'app.apk', 'x.jar', 'y.vbs', 'z.js']) {
      assert.equal(is_extension_dangerous(name), true, `expected ${name} to be flagged`);
    }
  });

  it('is case-insensitive', () => {
    assert.equal(is_extension_dangerous('MALWARE.EXE'), true);
  });

  it('allows normal document/image extensions', () => {
    for (const name of ['report.pdf', 'photo.png', 'sheet.xlsx', 'notes.txt', 'archive.zip']) {
      assert.equal(is_extension_dangerous(name), false, `expected ${name} to be allowed`);
    }
  });
});

describe('SEC-2: can_modify_file', () => {
  const owner = { id: 'user-1', roles: ['EMPLOYEE'] };
  const otherEmployee = { id: 'user-2', roles: ['EMPLOYEE'] };
  const admin = { id: 'user-3', roles: ['ADMIN'] };
  const file = { id: 'file-1', user_id: 'user-1' };

  it('allows the file owner to modify their own file', () => {
    assert.equal(can_modify_file(owner, file), true);
  });

  it('denies a different employee who does not own the file', () => {
    assert.equal(can_modify_file(otherEmployee, file), false);
  });

  it('allows an admin to modify any file', () => {
    assert.equal(can_modify_file(admin, file), true);
  });

  it('denies access when the file record does not exist', () => {
    assert.equal(can_modify_file(owner, null), false);
  });
});
