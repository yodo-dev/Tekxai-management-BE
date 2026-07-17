/**
 * Regression test for the production-readiness audit fix: POST /storage/upload
 * previously performed NO mime-type/extension validation at all (unlike
 * POST /storage/presign, which always has), letting any file type — including
 * ones on the dangerous-extension blocklist — be written to disk/S3 and
 * served back with a public URL.
 *
 * This test drives the actual route handler registered in storage.routes.js
 * (not a re-implementation) so it fails if the validation calls are ever
 * removed again.
 *
 * Run: node --test tests/storage/upload-route-validation.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import router from '../../src/modules/storage/storage.routes.js';

// Express Router internals: router.stack holds one Layer per router.use()/
// router.METHOD() call. For a route registered with multiple handlers
// (multer middleware + our async handler), layer.route.stack holds each
// handler in order — we want the last one (the actual upload logic).
function find_route_handler(method, path) {
  const layer = router.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method],
  );
  if (!layer) throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  const handlers = layer.route.stack.map((s) => s.handle);
  return handlers[handlers.length - 1];
}

function mock_res() {
  const res = {
    status_code: 200,
    body: null,
    status(code) { this.status_code = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return res;
}

describe('POST /storage/upload — mime/extension validation', () => {
  const upload_handler = find_route_handler('post', '/upload');

  it('rejects a disallowed mime type before touching storage', async () => {
    const req = {
      user: { id: 'user-1', roles: ['EMPLOYEE'] },
      file: { originalname: 'notes.txt', mimetype: 'application/x-msdownload', buffer: Buffer.from('x'), size: 1 },
      protocol: 'https', get: () => 'example.com',
    };
    const res = mock_res();
    let next_err = null;
    await upload_handler(req, res, (err) => { next_err = err; });

    assert.equal(next_err, null, 'should not fall through to error handler');
    assert.equal(res.status_code, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /not allowed/i);
  });

  it('rejects a dangerous file extension even with an allowed-looking mime type', async () => {
    const req = {
      user: { id: 'user-1', roles: ['EMPLOYEE'] },
      // A .exe uploaded with a spoofed image mimetype must still be blocked
      // by the extension blocklist.
      file: { originalname: 'payload.exe', mimetype: 'image/png', buffer: Buffer.from('x'), size: 1 },
      protocol: 'https', get: () => 'example.com',
    };
    const res = mock_res();
    let next_err = null;
    await upload_handler(req, res, (err) => { next_err = err; });

    assert.equal(next_err, null);
    assert.equal(res.status_code, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /extension not allowed/i);
  });
});
