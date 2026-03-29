const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const BACKEND_API_KEY = process.env.BACKEND_API_KEY || '';

if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET not set. Using random secret — sessions will not persist across restarts.');
}
if (!ADMIN_PASSWORD) {
  console.warn('WARNING: ADMIN_PASSWORD not set. Admin login will be disabled until it is configured.');
}

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Serve React Onboarding App
app.use('/onboarding', express.static(path.join(__dirname, 'frontend-final', 'dist')));

app.use('/admin', express.static(path.join(__dirname, 'quantro-main', 'dist')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'quantro-main', 'dist', 'index.html')));
app.get('/admin/*', (req, res) => res.sendFile(path.join(__dirname, 'quantro-main', 'dist', 'index.html')));

// Protected document serving
const DOCUMENTS_DIR = path.join(__dirname, 'documents');
const documentCatalog = JSON.parse(fs.readFileSync(path.join(DOCUMENTS_DIR, 'catalog.json'), 'utf8'));

app.get('/api/documents', (req, res) => {
  res.json(documentCatalog.map(d => ({ slug: d.slug, title: d.title, description: d.description })));
});

app.get('/api/documents/:slug', (req, res) => {
  const doc = documentCatalog.find(d => d.slug === req.params.slug);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const filePath = path.join(DOCUMENTS_DIR, doc.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  fs.createReadStream(filePath).pipe(res);
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.set('trust proxy', 1);

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many payment attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiter for ticket verification to prevent brute-force attacks
// Only 5 attempts per 15 minutes per IP
const ticketVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many ticket verification attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

app.use('/api/', generalLimiter);

function generateCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

function validateCsrfToken(req, res, next) {
  const token = req.body._csrf || req.headers['x-csrf-token'];
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized. Please login.' });
}

function requireOwnerOrAdmin(req, res, next) {
  const id = parseInt(req.params.id);
  if (req.session && req.session.isAdmin) return next();
  if (req.session && Array.isArray(req.session.ownedRegistrations) && req.session.ownedRegistrations.includes(id)) {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden. You do not own this registration.' });
}

function checkHoneypot(req, res, next) {
  if (req.body.website && req.body.website.trim() !== '') {
    return res.status(400).json({ error: 'Invalid submission detected.' });
  }
  next();
}

async function fetchBackend(endpoint, options = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (BACKEND_API_KEY) {
    headers['X-API-Key'] = BACKEND_API_KEY;
  }
  const response = await fetch(url, {
    ...options,
    headers,
  });
  return response;
}

app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ success: true, message: 'Login successful' });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/api/admin/check', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ authenticated: true });
  }
  return res.json({ authenticated: false });
});

app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken(req);
  res.json({ csrfToken: token });
});

app.get('/api/firms', async (req, res) => {
  try {
    const response = await fetchBackend('/api/firms');
    const data = await response.json();
    // Strip sensitive fields from public response (codes, emails)
    // Admin panel uses /api/firms/activity instead
    if (Array.isArray(data)) {
      const sanitized = data.map(({ code, email, ...rest }) => rest);
      return res.json(sanitized);
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching firms:', error);
    res.status(500).json({ error: 'Failed to fetch firms' });
  }
});

app.get('/api/firms/activity', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/api/firms/activity');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching firm activity:', error);
    res.status(500).json({ error: 'Failed to fetch firm activity' });
  }
});

// Access code deactivation endpoints
app.post('/api/firms/:firmId/deactivate', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend(`/api/firms/${req.params.firmId}/deactivate`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error) {
    console.error('Error deactivating access code:', error);
    res.status(500).json({ error: 'Failed to deactivate access code' });
  }
});

app.post('/api/firms/:firmId/activate', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend(`/api/firms/${req.params.firmId}/activate`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error) {
    console.error('Error activating access code:', error);
    res.status(500).json({ error: 'Failed to activate access code' });
  }
});

app.post('/api/firms/deactivate-all', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/api/firms/deactivate-all', {
      method: 'POST',
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error) {
    console.error('Error deactivating all access codes:', error);
    res.status(500).json({ error: 'Failed to deactivate all access codes' });
  }
});

app.post('/api/firms/activate-all', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/api/firms/activate-all', {
      method: 'POST',
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error) {
    console.error('Error activating all access codes:', error);
    res.status(500).json({ error: 'Failed to activate all access codes' });
  }
});

app.get('/api/registration/:id/status', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await fetchBackend(`/api/registrations/${id}/status`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

app.get('/api/registrations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await fetchBackend(`/api/registrations/${id}`);
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error) {
    console.error('Error fetching registration:', error);
    res.status(500).json({ error: 'Failed to fetch registration' });
  }
});

app.post('/api/ticket-pdf', async (req, res) => {
  const { ticketCode, fullName, qrImage } = req.body;
  if (!ticketCode) return res.status(400).json({ error: 'Missing ticketCode' });

  try {
    const PDFDocument = require('pdfkit');
    const MM = 2.8346;
    const W = 100 * MM;
    const H = 150 * MM;
    const BROWN = '#5b3426';
    const CREAM = '#f8f2e8';
    const MUTED = '#7b6a5e';

    const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticketCode}.pdf"`);
    doc.pipe(res);

    doc.rect(0, 0, W, H).fill('#ffffff');

    doc.roundedRect(5 * MM, 5 * MM, 90 * MM, 140 * MM, 3 * MM)
      .lineWidth(1)
      .strokeColor(BROWN)
      .stroke();

    doc.font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(BROWN)
      .text('Competition Policy & Law Seminar', 0, 18 * MM, { align: 'center' });

    doc.font('Helvetica')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text('Conference Ticket', 0, 24 * MM, { align: 'center' });

    doc.roundedRect(10 * MM, 30 * MM, 80 * MM, 28 * MM, 2 * MM)
      .fill(CREAM);

    doc.font('Helvetica')
      .fontSize(6.5)
      .fillColor(MUTED)
      .text('TICKET CODE', 0, 38 * MM, { align: 'center' });

    doc.font('Courier-Bold')
      .fontSize(22)
      .fillColor(BROWN)
      .text(ticketCode.toUpperCase(), 0, 45 * MM, { align: 'center' });

    if (fullName) {
      doc.font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text('ATTENDEE', 0, 61 * MM, { align: 'center' });
      doc.font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(BROWN)
        .text(fullName, 10 * MM, 66 * MM, { width: 80 * MM, align: 'center' });
    }

    if (qrImage) {
      const imgBuffer = Buffer.from(qrImage, 'base64');
      const qrY = fullName ? 78 * MM : 65 * MM;
      doc.image(imgBuffer, W / 2 - 20 * MM, qrY, { width: 40 * MM, height: 40 * MM });
    }

    doc.font('Helvetica')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text('Present this ticket at check-in', 0, 118 * MM, { align: 'center' });

    doc.fontSize(6.5)
      .text('Mövenpick Ambassador Hotel, Accra', 0, 124 * MM, { align: 'center' });

    doc.fontSize(6)
      .fillColor('#aaaaaa')
      .text('25 March 2026', 0, 130 * MM, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Could not generate PDF' });
  }
});

app.get('/api/settings', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/api/settings');
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    // Mask sensitive values in response
    const SENSITIVE_KEYS = ['smtp_password', 'arkesel_api_key'];
    if (Array.isArray(data)) {
      const masked = data.map(item => {
        if (SENSITIVE_KEYS.includes(item.key) && item.value) {
          return { ...item, value: item.value.length > 0 ? '••••••••' : '' };
        }
        return item;
      });
      return res.json(masked);
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.get('/api/registrations/pending-payments', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/api/registrations/pending-payments');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ error: 'Failed to fetch pending payments' });
  }
});

app.get('/api/inquiries', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/api/inquiries');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
});

app.post('/api/inquiries', inquiryLimiter, async (req, res) => {
  try {
    const response = await fetchBackend('/api/inquiries', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error creating inquiry:', error);
    res.status(500).json({ error: 'Failed to create inquiry' });
  }
});

app.post('/api/admin/invite', requireAdmin, async (req, res) => {
  const { firmName, email } = req.body;
  if (!firmName || !email) {
    return res.status(400).json({ error: 'Firm name and email are required' });
  }

  try {
    const response = await fetchBackend('/api/firms', {
      method: 'POST',
      body: JSON.stringify({ name: firmName }),
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json(error);
    }

    const firm = await response.json();

    res.json({
      success: true,
      firm,
      message: 'Invitation sent successfully'
    });
  } catch (error) {
    console.error('Error creating firm:', error);
    res.status(500).json({ error: 'Failed to create firm' });
  }
});

app.post('/api/register', registrationLimiter, checkHoneypot, async (req, res) => {
  const { accessCode, fullName, companyName, jobTitle, lawFirm, phoneNumber, email, reasonForAttending } = req.body;

  try {
    let maxCapacity = 500;
    try {
      const settingsRes = await fetchBackend('/api/settings/max_capacity');
      if (settingsRes.ok) {
        const setting = await settingsRes.json();
        maxCapacity = parseInt(setting.value) || 500;
      }
    } catch (e) { }

    const countRes = await fetchBackend('/api/registrations/count');
    if (countRes.ok) {
      const countData = await countRes.json();
      if (countData.count >= maxCapacity) {
        return res.status(400).json({ error: 'Registration is closed. Maximum capacity has been reached.' });
      }
    }

    const response = await fetchBackend('/api/registrations', {
      method: 'POST',
      body: JSON.stringify({
        access_code: accessCode,
        full_name: fullName,
        email: email,
        phone: phoneNumber,
        job_title: jobTitle,
        company: companyName,
        law_firm: lawFirm,
        reason_for_attending: reasonForAttending,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // Track registration ownership in session
    if (data.registration && data.registration.id) {
      if (!req.session.ownedRegistrations) {
        req.session.ownedRegistrations = [];
      }
      req.session.ownedRegistrations.push(data.registration.id);
    }

    // Return only essential fields — do not expose ticket_code, qr_data, email, phone in network response
    res.json({
      success: data.success,
      status: data.status,
      message: data.message,
      registration: data.registration ? {
        id: data.registration.id,
        status: data.registration.status,
        ticket_type: data.registration.ticket_type,
        firm_name: data.registration.firm_name
      } : undefined
    });
  } catch (error) {
    console.error('Error registering:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

app.get('/payment', async (req, res) => {
  const { id } = req.query;
  // Redirect to onboarding page with the registration ID
  if (id) {
    return res.redirect(`/onboarding/?id=${id}`);
  }
  return res.redirect('/');
});

app.post('/api/payment-submitted', paymentLimiter, async (req, res) => {
  const { registrationId } = req.body;

  try {
    const response = await fetchBackend(`/api/registrations/${registrationId}/payment-submitted`, {
      method: 'POST',
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error marking payment submitted:', error);
    res.status(500).json({ error: 'Failed to mark payment submitted' });
  }
});

app.post('/api/registrations/:id/verify-payment', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const response = await fetchBackend(`/api/registrations/${id}/verify-payment`, {
      method: 'POST',
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

app.get('/api/registrations/pending-approvals', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/api/registrations/pending-approvals');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

app.post('/api/registrations/:id/approve', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const response = await fetchBackend(`/api/registrations/${id}/approve`, {
      method: 'POST',
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error approving registration:', error);
    res.status(500).json({ error: 'Failed to approve registration' });
  }
});

app.post('/api/registrations/:id/reject', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const response = await fetchBackend(`/api/registrations/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error rejecting registration:', error);
    res.status(500).json({ error: 'Failed to reject registration' });
  }
});

app.delete('/api/registrations/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const response = await fetchBackend(`/api/registrations/${id}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error deleting registration:', error);
    res.status(500).json({ error: 'Failed to delete registration' });
  }
});

app.post('/api/registrations/:id/manual-confirm', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const response = await fetchBackend(`/api/registrations/${id}/manual-confirm`, {
      method: 'POST',
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error manually confirming registration:', error);
    res.status(500).json({ error: 'Failed to confirm registration' });
  }
});

app.post('/api/notifications/send-reminder', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/api/notifications/send-reminder', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

app.post('/api/notifications/send-registration-report', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/api/notifications/send-registration-report', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error sending registration report:', error);
    res.status(500).json({ error: 'Failed to send registration report' });
  }
});

app.get('/api/registrations/approved-registrations', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/api/registrations/approved-registrations');
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching approved registrations:', error);
    res.status(500).json({ error: 'Failed to fetch approved registrations' });
  }
});

app.get('/api/registrations/rejected-registrations', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/api/registrations/rejected-registrations');
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching rejected registrations:', error);
    res.status(500).json({ error: 'Failed to fetch rejected registrations' });
  }
});

app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const status = req.query.status || 'confirmed';
    const response = await fetchBackend(`/api/registrations/users?status=${status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/registration/:id/ticket', async (req, res) => {
  const { id } = req.params;

  try {
    const regResponse = await fetchBackend(`/api/registrations/${id}`);
    if (!regResponse.ok) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const registration = await regResponse.json();

    if (!registration.ticket_code) {
      return res.status(400).json({ error: 'No ticket issued' });
    }

    const qrResponse = await fetchBackend(`/api/tickets/${registration.ticket_code}/qr`);
    let qrImage = '';

    if (qrResponse.ok) {
      const qrData = await qrResponse.json();
      qrImage = qrData.qr_image || '';
    }

    res.json({
      ticket_code: registration.ticket_code,
      qr_image: qrImage,
      full_name: registration.full_name,
      firm_name: registration.firm_name
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

app.get('/api/tickets/by-code/:ticketCode', ticketVerifyLimiter, async (req, res) => {
  const { ticketCode } = req.params;
  try {
    const response = await fetchBackend(`/api/tickets/${encodeURIComponent(ticketCode)}`);
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    // Return limited data to prevent information leakage
    res.json({
      id: data.id,
      status: data.status,
      ticket_type: data.ticket_type
    });
  } catch (error) {
    console.error('Error fetching ticket by code:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

app.get('/api/tickets/verify/:ticketCode', ticketVerifyLimiter, async (req, res) => {
  const { ticketCode } = req.params;
  try {
    const response = await fetchBackend(`/api/tickets/verify/${ticketCode}`);
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    // Return only necessary data - no personal info exposed
    res.json({
      valid: data.valid,
      ticket_type: data.ticket_type,
      status: data.status,
      checked_in: data.checked_in
    });
  } catch (error) {
    console.error('Error verifying ticket:', error);
    res.status(500).json({ error: 'Failed to verify ticket' });
  }
});

// Ticket check-in endpoint (proxy to backend) - admin only
app.post('/api/tickets/checkin', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/api/tickets/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json(data);
  } catch (error) {
    console.error('Error checking in ticket:', error);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

// Feedback API proxy routes
app.post('/api/feedback', async (req, res) => {
  try {
    const response = await fetchBackend('/feedback', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

app.get('/api/feedback', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/feedback');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

app.get('/api/feedback/stats', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/feedback/stats');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({ error: 'Failed to fetch feedback stats' });
  }
});

app.get('/api/feedback/export', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/feedback/export');
    if (!response.ok) {
      const data = await response.json();
      return res.status(response.status).json(data);
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=feedback_responses.csv');
    const text = await response.text();
    res.send(text);
  } catch (error) {
    console.error('Error exporting feedback:', error);
    res.status(500).json({ error: 'Failed to export feedback' });
  }
});

app.get('/api/feedback/invites', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/feedback/invites');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching invites:', error);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
});

app.post('/api/feedback/opened/:token', async (req, res) => {
  try {
    const response = await fetchBackend(`/feedback/opened/${req.params.token}`, { method: 'POST' });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error recording opened:', error);
    res.status(500).json({ error: 'Failed to record opened' });
  }
});

app.get('/api/feedback/check/:token', async (req, res) => {
  try {
    const response = await fetchBackend(`/feedback/check/${req.params.token}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error checking feedback:', error);
    res.status(500).json({ error: 'Failed to check feedback' });
  }
});

app.post('/api/feedback/analyze', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/feedback/analyze', {
      method: 'POST',
      body: JSON.stringify(req.body || {}),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error) {
    console.error('Error analyzing feedback:', error);
    res.status(500).json({ error: 'Failed to analyze feedback' });
  }
});

app.post('/api/feedback/reset', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/feedback/reset', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error) {
    console.error('Error resetting feedback:', error);
    res.status(500).json({ error: 'Failed to reset feedback' });
  }
});

app.patch('/api/inquiries/:id/resolve', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend(`/api/inquiries/${req.params.id}/resolve`, { method: 'PATCH' });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error) {
    console.error('Error resolving inquiry:', error);
    res.status(500).json({ error: 'Failed to resolve inquiry' });
  }
});

app.delete('/api/inquiries/:id', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend(`/api/inquiries/${req.params.id}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    res.status(500).json({ error: 'Failed to delete inquiry' });
  }
});

app.post('/api/notifications/send-survey-invite', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/notifications/send-survey-invite', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error) {
    console.error('Error sending survey invite:', error);
    res.status(500).json({ error: 'Failed to send survey invite' });
  }
});

app.post('/api/notifications/send-custom-survey-invite', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/notifications/send-custom-survey-invite', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error) {
    console.error('Error sending custom survey invite:', error);
    res.status(500).json({ error: 'Failed to send custom survey invite' });
  }
});

app.post('/api/notifications/send-survey-reminder', requireAdmin, async (req, res) => {
  try {
    const response = await fetchBackend('/notifications/send-survey-reminder', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error) {
    console.error('Error sending survey reminder:', error);
    res.status(500).json({ error: 'Failed to send survey reminder' });
  }
});

// Maintenance mode - main pages temporarily down
app.get('/', (_req, res) => res.render('pages/maintenance'));
app.get('/contact', (_req, res) => res.render('pages/maintenance'));
app.get('/terminal', (_req, res) => res.render('pages/maintenance'));
app.get('/checkin', (_req, res) => res.render('pages/maintenance'));
app.get('/verify/:ticketCode', (_req, res) => res.render('pages/maintenance'));
app.get('/pending-approval', (_req, res) => res.render('pages/maintenance'));

// Active routes (survey + onboarding remain available)
app.get('/feedback', (_req, res) => res.render('pages/feedback'));

// Catch-all for Onboarding App React Router
app.get(['/onboarding', '/onboarding/*'], (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend-final', 'dist', 'index.html'));
});

// Terminal logs storage
let serverLogs = [];
const MAX_LOGS = 1000;

function addLog(source, message, level = 'info') {
  const log = {
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    source,
    message: String(message),
    level
  };
  serverLogs.push(log);
  if (serverLogs.length > MAX_LOGS) {
    serverLogs = serverLogs.slice(-MAX_LOGS);
  }
}

// Override console methods to capture logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args) => {
  addLog('frontend', args.join(' '), 'info');
  originalConsoleLog.apply(console, args);
};

console.error = (...args) => {
  addLog('frontend', args.join(' '), 'error');
  originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  addLog('frontend', args.join(' '), 'warn');
  originalConsoleWarn.apply(console, args);
};

// Terminal API endpoints
app.get('/api/terminal/logs', requireAdmin, async (_req, res) => {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    // Fetch backend logs
    try {
      const { stdout: backendLogs } = await execPromise('journalctl -u conference-backend -n 100 --no-pager --output=short-iso 2>/dev/null || echo ""');
      backendLogs.split('\n').filter(line => line.trim()).forEach(line => {
        const isError = line.toLowerCase().includes('error') || line.toLowerCase().includes('exception');
        const existing = serverLogs.find(l => l.source === 'backend' && l.message === line);
        if (!existing) {
          addLog('backend', line, isError ? 'error' : 'info');
        }
      });
    } catch (e) { }

    // Fetch nginx access logs
    try {
      const { stdout: nginxLogs } = await execPromise('tail -n 50 /var/log/nginx/access.log 2>/dev/null || echo ""');
      nginxLogs.split('\n').filter(line => line.trim()).forEach(line => {
        const existing = serverLogs.find(l => l.source === 'nginx' && l.message === line);
        if (!existing) {
          addLog('nginx', line, 'info');
        }
      });
    } catch (e) { }

    // Fetch nginx error logs
    try {
      const { stdout: nginxErrors } = await execPromise('tail -n 50 /var/log/nginx/error.log 2>/dev/null || echo ""');
      nginxErrors.split('\n').filter(line => line.trim()).forEach(line => {
        const existing = serverLogs.find(l => l.source === 'nginx' && l.message === line);
        if (!existing) {
          addLog('nginx', line, 'error');
        }
      });
    } catch (e) { }

    res.json({ logs: serverLogs.slice(-500) });
  } catch (error) {
    res.json({ logs: serverLogs.slice(-500) });
  }
});

app.post('/api/terminal/clear', requireAdmin, (_req, res) => {
  serverLogs = [];
  res.json({ success: true });
});

app.post('/api/terminal/reset-db', requireAdmin, async (req, res) => {
  const { seed } = req.body;

  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    console.log('Starting database reset...');

    // First, backup the settings before reset
    let savedSettings = [];
    try {
      const settingsRes = await fetchBackend('/api/settings');
      if (settingsRes.ok) {
        savedSettings = await settingsRes.json();
        console.log('Settings backed up:', savedSettings.length, 'items');
      }
    } catch (e) {
      console.log('Could not backup settings:', e.message);
    }

    // Stop the backend service temporarily
    await execPromise('systemctl stop conference-backend || true');

    // Remove the database file
    await execPromise('rm -f /var/www/conference2/backend/conference.db');
    console.log('Database file removed');

    // Restart the backend (this will recreate the tables)
    await execPromise('systemctl start conference-backend');
    console.log('Backend service restarted');

    // Wait a moment for the service to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    let seedMessage = '';
    if (seed) {
      // Run the seed script
      console.log('Running seed script...');
      const { stdout, stderr } = await execPromise('cd /var/www/conference2/backend && . venv/bin/activate && python seed_organizations.py');
      seedMessage = stdout || 'Seed completed';
      if (stderr) console.error('Seed stderr:', stderr);
      console.log('Seed script completed');
    }

    // Restore important settings (SMTP, Arkesel, etc.)
    if (savedSettings.length > 0) {
      const settingsToRestore = savedSettings.filter(s =>
        s.value && s.value.trim() !== '' && [
          'smtp_email', 'smtp_password', 'smtp_sender_name',
          'arkesel_api_key', 'arkesel_sender_id',
          'merchant_code', 'merchant_name', 'ticket_price', 'max_capacity'
        ].includes(s.key)
      );

      if (settingsToRestore.length > 0) {
        try {
          await fetchBackend('/api/settings', {
            method: 'PUT',
            body: JSON.stringify({ settings: settingsToRestore.map(s => ({ key: s.key, value: s.value })) })
          });
          console.log('Settings restored:', settingsToRestore.length, 'items');
        } catch (e) {
          console.error('Failed to restore settings:', e.message);
        }
      }
    }

    res.json({
      success: true,
      message: seed ? `Database reset and seeded. Settings preserved. ${seedMessage}` : 'Database cleared successfully. Settings preserved.'
    });
  } catch (error) {
    console.error('Database reset error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
