# Production deploys: use `sudo pm2`, not plain `pm2`

## The problem

There are **two separate pm2 daemons** on the production EC2 box (`api.tekxai.services`),
one per Linux user, and only one of them is authoritative:

| Daemon owner | Started via | Status |
|---|---|---|
| `root` | `sudo pm2 start ecosystem.config.cjs --env production` (2026-06-29) | **This is the real one.** Bound to port 3000, root's pm2 supervises it with `autorestart: true`, root's copy is what nginx/the public internet actually talks to. |
| `ubuntu` | `pm2 start ...` run as the `ubuntu` login user at some point | A parallel, non-authoritative daemon. Restarting/reloading `tekxai-be` under this daemon does **not** affect production traffic — it just manages its own separate, idle process. |

pm2 daemons are per-user (each user gets their own `~/.pm2`). Running `pm2 list` /
`pm2 restart tekxai-be` as `ubuntu` only ever touches `ubuntu`'s daemon. It looks
completely normal — clean restart, correct logs, correct code on disk — but the
process it's managing is not the one bound to port 3000 and never was.

## How this was discovered (2026-07-19)

A migration fix (`prisma migrate deploy`) was applied and `pm2 restart tekxai-be`
was run repeatedly as `ubuntu`. Every restart looked successful (clean logs,
correct git commit, correct route present in `src/routes/index.js`), yet the
live site kept returning `404 Route not found` on a route that definitely
existed in the code.

Diagnosis path:
1. `curl http://localhost:3000/...` (bypassing nginx/DNS) still 404'd — ruled out nginx/CDN.
2. `sudo lsof -i :3000` / `sudo ss -ltnp` showed the actual listening process was
   a **different PID, running as `root`, started days earlier** — not the PID
   pm2 (as `ubuntu`) reported as "online."
3. Killing that root PID directly caused it to **respawn immediately under a new PID**,
   still as root — meaning something was actively supervising it.
4. `sudo pm2 list` revealed root's own separate pm2 daemon, managing an app
   with the same name (`tekxai-be`), created back on **2026-06-29** — the actual
   original deploy. `pm2 show tekxai-be` under root showed
   `SUDO_COMMAND: /usr/bin/pm2 start ecosystem.config.cjs --env production`,
   confirming it was started with `sudo`.
5. Once the stray root PID was killed and root's pm2 auto-restart forked a
   fresh process from the current (already-updated) code on disk, the route
   started working (`401 Authentication required` instead of `404`, confirming
   the route now exists and is correctly auth-gated).

## Rule going forward

**Every production restart/reload/deploy command must be run as root:**

```bash
sudo pm2 restart tekxai-be --update-env
# or, if root's daemon doesn't have it running for some reason:
sudo pm2 start ecosystem.config.cjs --env production
```

Do **not** run plain `pm2 restart tekxai-be` as the `ubuntu` login user and
assume it affected production — verify by checking `sudo pm2 list` (or
`sudo lsof -i :3000`) if there's ever doubt about which process is actually
serving traffic.

## Two follow-ups worth doing deliberately (not urgent, plan for a maintenance window)

1. **Kill the confusion at the source**: either (a) delete/stop the `ubuntu`-owned
   pm2 daemon's copy of `tekxai-be` entirely so there's only one daemon to ever
   touch, or (b) document loudly (this file) so nobody restarts the wrong one again.
2. **Stop running the app as root.** A public-facing Node process should run
   under a scoped, non-privileged service user. Running it as root means any
   future RCE-class vulnerability in the app is a full system compromise
   instead of a contained one. This requires re-provisioning the pm2 process
   under a dedicated user (or `ubuntu` itself, made authoritative) and updating
   `ecosystem.config.cjs` + any startup scripts accordingly — not a live change,
   schedule it.

## Reference

- `ecosystem.config.js` (tracked in git) vs `ecosystem.config.cjs` (untracked,
  present on the server only) — root's authoritative process uses the `.cjs`
  one. If these ever diverge in content, the `.cjs` one on the server is what's
  actually live.
