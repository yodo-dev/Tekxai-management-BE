# Future Enhancements

## Phase 2 — Chat Module

The existing Chat UI (Discord-style: servers, channels, DMs) is fully built on the frontend with mock/in-memory data. Below is the recommended architecture for making it real.

### Recommended Architecture

**Technology Stack:**
- **WebSocket Server:** Socket.IO v4 (works with Express; handles reconnection, rooms, namespaces)
- **Message Persistence:** PostgreSQL via Prisma (add `chat_servers`, `chat_channels`, `chat_messages`, `chat_members` tables)
- **Real-time Delivery:** Socket.IO rooms per channel/DM
- **File Uploads:** S3/MinIO for message attachments
- **Read Receipts:** Stored in `chat_message_reads` table, updated on socket event

### Database Schema (New Tables)

```prisma
model chat_servers {
  id          String   @id @default(cuid())
  name        String
  icon        String?
  owner_id    String
  created_at  DateTime @default(now())
  channels    chat_channels[]
  members     chat_server_members[]
}

model chat_channels {
  id          String   @id @default(cuid())
  server_id   String
  name        String
  type        String   @default("text")  // text | voice | dm
  created_at  DateTime @default(now())
  server      chat_servers  @relation(...)
  messages    chat_messages[]
}

model chat_messages {
  id          String   @id @default(cuid())
  channel_id  String
  user_id     String
  content     String
  reply_to_id String?
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  deleted_at  DateTime?
  channel     chat_channels @relation(...)
  user        users         @relation(...)
  reads       chat_message_reads[]
}
```

### Implementation Plan

**Backend (4–6 days):**
1. Install `socket.io` on Express server
2. Add chat Prisma tables and run migration
3. Build `ChatGateway` handling events: `join_channel`, `send_message`, `typing_start`, `typing_stop`, `mark_read`
4. REST endpoints for server/channel CRUD
5. JWT authentication on WebSocket handshake

**Frontend (3–4 days):**
1. Replace `chatTypes.ts` static data with real API calls
2. Replace message state with Socket.IO client (`socket.io-client`)
3. Connect `ServerRail`, `ChannelSidebar`, `ChatContent` to real sockets
4. Add message persistence (load history on channel open)
5. Implement typing indicators and read receipts

**Estimated Total Effort:** 8–12 days (1–2 developers)

### Migration Strategy

1. Keep current mock UI untouched
2. Add feature flag `VITE_ENABLE_REAL_CHAT=false`
3. Build real backend in parallel
4. Test with flag enabled
5. Flip flag in production once stable

---

## Phase 3 — Additional Enhancements

### Email Notifications
- **Tool:** Nodemailer + SMTP or SendGrid
- **Use cases:** Invite emails, OTP delivery, bonus approval notifications, ticket updates
- **Estimated effort:** 2–3 days

### File Upload / Storage
- **Tool:** MinIO (self-hosted) or AWS S3
- **Use cases:** User avatars, HR documents (offer letters, contracts), asset photos, timesheet attachments
- **Estimated effort:** 2–3 days

### Advanced Reporting & Export
- **Tools:** `pdfkit` (PDF), `xlsx` (Excel), `chart.js` (charts)
- **Reports:** Asset register, payroll summary, performance scorecards, attendance reports
- **Estimated effort:** 3–5 days

### Mobile App
- **Tool:** React Native (code reuse from FE)
- **Key flows:** Check-in/check-out, daily report submission, ticket creation, notifications
- **Estimated effort:** 4–6 weeks

### Audit Log
- **Approach:** Middleware that logs all mutating requests (POST/PUT/DELETE) to `audit_logs` table
- **Fields:** user_id, action, entity, entity_id, old_value, new_value, ip, timestamp
- **Estimated effort:** 2–3 days

### Two-Factor Authentication (2FA)
- **Tool:** `speakeasy` (TOTP), `qrcode`
- **Flows:** Setup via QR, verify on login for ADMIN/SUPER_ADMIN
- **Estimated effort:** 2–3 days

### Redis Caching
- **Tool:** `ioredis` + Redis
- **Cache targets:** User sessions, frequently-read lists (departments, teams, roles), dashboard stats
- **Estimated effort:** 2–3 days

### Swagger / OpenAPI UI
- **Tool:** `swagger-ui-express` + `swagger-jsdoc`
- **Benefit:** Auto-generated interactive docs at `/api/v1/docs`
- **Estimated effort:** 1–2 days

### CI/CD Pipeline
- **Tool:** GitHub Actions
- **Steps:** lint → test → build → deploy
- **Estimated effort:** 1–2 days

### Structured Logging
- **Tool:** `pino` + `pino-pretty` (dev), `pino-http` (request logging)
- **Estimated effort:** 1 day
