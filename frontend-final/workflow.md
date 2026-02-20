# Conference2 — Total Workflow

> Full end-to-end workflow for the conference management platform.
> **Architecture**: Express.js frontend (EJS views) → Python FastAPI backend (SQLite via SQLAlchemy)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PUBLIC USERS                          │
│       (Attendees, Firms, General Visitors)               │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   Express.js :3001  │  (app.js — EJS views)
              │                     │
              │  Pages:             │
              │   /            home │
              │   /contact          │
              │   /payment          │
              │   /pending-approval │
              │   /checkin          │
              │   /verify/:code     │
              │   /terminal (admin) │
              └──────────┬──────────┘
                         │  fetchBackend()
              ┌──────────▼──────────┐
              │  FastAPI :8000      │  (backend/)
              │                     │
              │  Routers:           │
              │   /api/firms        │
              │   /api/registrations│
              │   /api/payments     │
              │   /api/tickets      │
              │   /api/inquiries    │
              │   /api/notifications│
              │   /api/settings     │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  SQLite (SQLAlchemy)│
              │                     │
              │  Tables:            │
              │   law_firms         │
              │   registrations     │
              │   payments          │
              │   check_ins         │
              │   inquiries         │
              │   settings          │
              │   admin_notif_recip │
              └─────────────────────┘
```

---

## Data Models

| Model                       | Key Fields                                                             | Purpose                            |
|-----------------------------|------------------------------------------------------------------------|-------------------------------------|
| **LawFirm**                 | name, code (6-char), email, required_registrations, is_law_firm, logo  | Organizations/firms invited to event|
| **Registration**            | firm_id, full_name, email, phone, status, ticket_type, ticket_code, qr | Attendee registrations              |
| **Payment**                 | registration_id, amount, merchant_code, reference, status              | MTN MoMo payment records            |
| **CheckIn**                 | registration_id, checked_in_at, method                                 | Day-of-event check-in tracking      |
| **Inquiry**                 | name, email, organization, inquiry_type, message, status               | Contact form submissions            |
| **Settings**                | key, value                                                             | App config (prices, SMTP, Arkesel)  |
| **AdminNotificationRecipient** | recipient_type (email/phone), value, enabled                       | Who receives admin alerts           |

### Registration Status Flow

```
pending_approval → approved (pending_payment) → payment_submitted → confirmed → checked_in
                 ↘ rejected
```

### Ticket Types

| Type           | Behavior                                          |
|----------------|---------------------------------------------------|
| **Access Code** | Free — firm-invited, auto-confirmed on registration |
| **Paid**        | Requires payment → admin verification → confirmation |

---

## Workflow 1: Public Homepage

**Page**: `GET /` → `views/pages/home.ejs`

**User sees**:
1. Hero section with event details
2. Featured Insight card
3. About / team section (`about-team-section.ejs`)
4. CTA section (`cta-section.ejs`)
5. Event Organizers (`organizer-section.ejs`)
6. Footer (`footer.ejs`)
7. Navbar (`navbar.ejs`)

**No API calls** — purely static content.

---

## Workflow 2: Contact / Inquiry Submission

**Page**: `GET /contact` → `views/pages/contact.ejs`

```
User fills form (name, email, org, inquiry_type, message)
        │
        ▼
POST /api/inquiries
        │
        ▼
Backend stores in `inquiries` table (status: "pending")
        │
        ▼
Admin views via GET /api/inquiries (requires auth)
```

---

## Workflow 3: Registration (Access Code — Free Ticket)

> For attendees from invited firms/organizations.

```
1. Admin creates firm via dashboard
   POST /api/admin/invite → POST /api/firms
   (generates unique 6-char access code)
         │
2. Firm shares access code with their attendees
         │
3. Attendee opens homepage, enters access code in registration form
   POST /api/register
         │
         ▼
4. Backend validates:
   ├── Check max capacity (Settings: max_capacity)
   ├── Validate access code → find firm (GET /api/firms/by-code/:code)
   ├── Check firm has free slots remaining
   └── Check for duplicate email under same firm
         │
         ▼
5. If firm has free slots:
   ├── ticket_type = "Access Code"
   ├── status = "confirmed" (auto-confirmed, no payment needed)
   ├── Generate 4-char ticket_code + QR data
   └── Send ticket notification (email + SMS via Arkesel)
         │
   Return: { id, ticket_code, status: "confirmed" }
         │
         ▼
6. User sees confirmation with ticket code + QR
```

---

## Workflow 4: Registration (Paid Ticket — No Access Code)

> For attendees registering without a firm invitation.

```
1. Attendee opens homepage, submits form WITHOUT access code
   POST /api/register
         │
         ▼
2. Backend validates:
   ├── Check max capacity
   └── Check for duplicate email
         │
         ▼
3. Registration created:
   ├── ticket_type = "Paid"
   ├── status = "pending_approval"
   └── Send notifications:
       ├── Email to user: "Registration pending approval"
       └── Email/SMS to admins: "New registration needs approval"
         │
   Return: { id, status: "pending_approval" }
         │
         ▼
4. User redirected to → GET /pending-approval
   (views/pages/pending-approval.ejs — polling status page)
```

---

## Workflow 5: Admin Approval / Rejection

```
Admin logs in:
  POST /api/admin/login (username: admin, password: sem!9bli$$)
         │
         ▼
Admin views pending registrations:
  GET /api/registrations/pending-approvals
         │
         ├── APPROVE: POST /api/registrations/:id/approve
         │     ├── status → "pending_payment"
         │     ├── approved_at = now()
         │     └── Send email + SMS with payment link
         │         (link: /payment?id=:registration_id)
         │
         └── REJECT: POST /api/registrations/:id/reject
               ├── status → "rejected"
               └── Send rejection notification (email with optional reason)
```

---

## Workflow 6: Payment (MTN MoMo)

**Page**: `GET /payment?id=:registrationId` → `views/pages/payment.ejs`

```
1. User clicks payment link from approval email
   GET /payment?id=123
         │
         ▼
2. Server validates:
   ├── Registration exists?
   ├── Already confirmed? → redirect /
   └── Payment expired? (3 days from approved_at)
         │
         ▼
3. Render payment page with:
   ├── User details (name, email, phone, company)
   ├── Ticket price (Settings: ticket_price, default: 150)
   ├── Merchant code (Settings: merchant_code)
   └── Merchant name (Settings: merchant_name)
         │
4. User initiates payment (MTN MoMo)
   POST /api/pay
   ├── Creates Payment record (amount, merchant_code)
   ├── status = "confirmed" (auto on this endpoint)
   ├── Generates ticket_code + QR
   └── Commits to DB
         │
   — OR —
         │
   POST /api/payment-submitted
   ├── status → "payment_submitted"
   └── Notifies admin: "Payment submitted, awaiting verification"
         │
         ▼
5. Admin verifies payment:
   POST /api/registrations/:id/verify-payment
   ├── Payment.status → "confirmed"
   ├── Registration.status → "confirmed"
   ├── Generate ticket_code + QR
   └── Send ticket notification (email with QR + SMS)
```

---

## Workflow 7: Ticket Issuance & Delivery

```
Triggered after payment confirmation:
         │
         ▼
1. Generate 4-char alphanumeric ticket_code (unique)
2. Generate QR data (JSON: ticket_code, registration_id, full_name, firm_name)
3. Store ticket_code + qr_data on Registration
         │
         ▼
4. Send ticket notification:
   ├── Email: HTML ticket card with embedded QR image (PNG attachment)
   │   Contains: name, ticket code, org, event details
   └── SMS (Arkesel): "Your ticket code is XXXX. Show at venue."
         │
         ▼
5. User can retrieve ticket anytime:
   GET /api/registration/:id/ticket
   Returns: { ticket_code, qr_image (base64), full_name, email, firm_name }
```

---

## Workflow 8: Event Day Check-In

**Page**: `GET /checkin` → `views/pages/checkin.ejs`

```
1. Staff opens /checkin on tablet/phone
         │
2. Scan QR code or enter ticket code manually
         │
         ▼
3. Verify ticket:
   GET /api/tickets/verify/:ticketCode
   ├── Find registration by ticket_code
   ├── Check status = "confirmed"
   ├── Check not already checked in
   └── Return attendee details
         │
         ▼
4. Check in:
   POST /api/tickets/checkin
   Body: { ticket_code, method: "qr" | "code" }
   ├── Create CheckIn record (checked_in_at = now)
   └── Return success with attendee info
```

**Also**: `GET /verify/:ticketCode` → `views/pages/verify.ejs`
- Public-facing ticket verification page (scan a QR → shows attendee info)

---

## Workflow 9: Admin Dashboard

Admin accesses via the separate React dashboard app (quantro-main/).

### Authentication
| Endpoint                | Method | Description             |
|-------------------------|--------|-------------------------|
| `/api/admin/login`      | POST   | Login (rate-limited 5/15min) |
| `/api/admin/logout`     | POST   | Destroy session          |
| `/api/admin/check`      | GET    | Check auth status        |

### Firm Management
| Endpoint                | Method | Description              |
|-------------------------|--------|--------------------------|
| `/api/firms`            | GET    | List all firms + stats   |
| `/api/admin/invite`     | POST   | Create firm + send invite|
| `/api/firms/activity`   | GET    | Firm activity breakdown  |
| `PATCH /api/firms/:id`  | PATCH  | Update firm details      |
| `DELETE /api/firms/:id` | DELETE | Delete firm (no registrations) |

### Registration Management
| Endpoint                                    | Method | Description                    |
|---------------------------------------------|--------|--------------------------------|
| `/api/registrations/pending-approvals`      | GET    | List pending approvals         |
| `/api/registrations/:id/approve`            | POST   | Approve registration           |
| `/api/registrations/:id/reject`             | POST   | Reject registration            |
| `/api/registrations/approved-registrations` | GET    | List approved registrations    |
| `/api/registrations/rejected-registrations` | GET    | List rejected registrations    |
| `/api/registrations/pending-payments`       | GET    | List pending payment users     |
| `/api/registrations/:id/verify-payment`     | POST   | Verify & confirm payment       |
| `/api/users?status=confirmed`               | GET    | List confirmed users           |

### Server Terminal
| Endpoint                    | Method | Description                   |
|-----------------------------|--------|-------------------------------|
| `/api/terminal/logs`        | GET    | Fetch server/backend/nginx logs |
| `/api/terminal/clear`       | POST   | Clear log buffer               |
| `/api/terminal/reset-db`    | POST   | Reset DB (optional seed), preserves settings |

---

## Workflow 10: Notifications System

All notifications go through `backend/routers/notifications.py`.

### Channels
| Channel    | Provider       | Config Keys                           |
|------------|----------------|---------------------------------------|
| **Email**  | SMTP (Gmail)   | smtp_email, smtp_password, smtp_sender_name |
| **SMS**    | Arkesel API    | arkesel_api_key, arkesel_sender_id    |

### Notification Types
| Event                        | Email | SMS | To       |
|------------------------------|-------|-----|----------|
| Ticket issued                | ✅ (with QR image) | ✅ | User |
| Payment submitted            | ✅    | ✅  | Admins   |
| Registration pending approval| ✅    | —   | User     |
| New registration needs review| ✅    | ✅  | Admins   |
| Approved (payment link sent) | ✅    | ✅  | User     |
| Rejected                     | ✅    | —   | User     |

---

## Security & Rate Limiting

| Limiter              | Window  | Max Requests | Applies To              |
|----------------------|---------|-------------|--------------------------|
| `registrationLimiter`| 15 min  | 5           | POST /api/register       |
| `paymentLimiter`     | 60 min  | 10          | POST /api/pay, /api/payment-submitted |
| `loginLimiter`       | 15 min  | 5           | POST /api/admin/login    |
| `generalLimiter`     | 1 min   | 100         | All /api/* routes        |

**Additional**:
- CSRF token protection (session-based)
- Honeypot field (`website`) on registration form
- Session-based admin auth (24h cookie lifetime)
- `requireAdmin` middleware on all admin endpoints

---

## Settings (Configurable via Dashboard)

| Key                  | Default           | Purpose                        |
|----------------------|-------------------|--------------------------------|
| `ticket_price`       | 150               | Cost per paid ticket           |
| `merchant_code`      | 123456            | MTN MoMo merchant code         |
| `merchant_name`      | CMC Conference    | Display name on payment page   |
| `max_capacity`       | 500               | Registration cap               |
| `smtp_email`         | —                 | Gmail sender address           |
| `smtp_password`      | —                 | Gmail app password             |
| `smtp_sender_name`   | —                 | From name in emails            |
| `arkesel_api_key`    | —                 | Arkesel SMS API key            |
| `arkesel_sender_id`  | —                 | Arkesel SMS sender ID          |

---

## Complete User Journey (Happy Path)

```
                                    ┌──────────────┐
                                    │   ADMIN      │
                                    │ Creates Firm │
                                    │ + Access Code│
                                    └──────┬───────┘
                                           │
                        ┌──────────────────┬┴─────────────────┐
                        │                  │                   │
              ┌─────────▼──────┐  ┌────────▼───────┐  ┌───────▼──────┐
              │ WITH Code      │  │ WITHOUT Code   │  │ Visitor      │
              │ (Org Attendee) │  │ (Public)       │  │ (Questions)  │
              └─────────┬──────┘  └────────┬───────┘  └───────┬──────┘
                        │                  │                   │
                  Auto-Confirm       Pending Approval    Contact Form
                        │                  │                   │
                   ┌────▼─────┐     ┌──────▼──────┐    ┌──────▼──────┐
                   │ TICKET   │     │ Admin       │    │ Inquiry     │
                   │ ISSUED   │     │ Approves    │    │ Stored      │
                   │ (free)   │     └──────┬──────┘    └─────────────┘
                   └────┬─────┘            │
                        │           ┌──────▼──────┐
                        │           │ Payment     │
                        │           │ (MTN MoMo)  │
                        │           └──────┬──────┘
                        │                  │
                        │           ┌──────▼──────┐
                        │           │ Admin       │
                        │           │ Verifies $  │
                        │           └──────┬──────┘
                        │                  │
                        │           ┌──────▼──────┐
                        │           │ TICKET      │
                        │           │ ISSUED      │
                        │           │ (paid)      │
                        │           └──────┬──────┘
                        │                  │
                        └───────┬──────────┘
                                │
                         ┌──────▼──────┐
                         │ EVENT DAY   │
                         │ Check-In    │
                         │ (QR/Code)   │
                         └─────────────┘
```
