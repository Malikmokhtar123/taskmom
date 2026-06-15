# TaskMom

A supply tracker and SMS reminder app for parents managing Type 1 diabetes supplies for multiple kids.

## Commands
- `npm run dev` — start dev server at http://localhost:3000
- `npm run build` — production build
- `npm run lint` — ESLint

## Architecture
Next.js 15 App Router. No `src/` directory — app lives at `app/`.

**Database**: SQLite via `better-sqlite3` (synchronous). Singleton in `db/database.ts`.

**Schema**:
- `children(id, name, dob)` — child profiles
- `supplies(id, child_id, type, unit, daily_usage, current_stock, reorder_threshold, pharmacy_url)` — per-child supply tracking
- `reminders(id, phone, message, send_at, sent)` — scheduled SMS queue

**API routes**:
- `POST /api/children` — add a child
- `GET /api/children` — list all children with their supplies
- `POST /api/supplies` — add/update a supply for a child
- `GET /api/supplies/[childId]` — get supplies for a child
- `POST /api/remind` — manually trigger reminder check (also called by cron)

**SMS**: Twilio. Credentials via env vars `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.

**Frontend** (`app/page.tsx`): Dashboard showing all children, their supply levels, and days remaining. Color-coded: green (>14 days), yellow (7–14 days), red (<7 days).

## Environment Variables
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
REMINDER_PHONE=        # the mom's phone number to text
```

## Conventions
- Days remaining = current_stock / daily_usage
- Red threshold triggers SMS reminder
- Reorder links open pharmacy URL in new tab
- Supply types: insulin_vials, insulin_pens, cgm_sensors, test_strips, pump_cartridges, lancets
