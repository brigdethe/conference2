const path = require('path');
const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// API Routes
app.get('/api/firms', (req, res) => {
  res.json(db.getFirms());
});

app.post('/api/admin/invite', (req, res) => {
  const { firmName, email } = req.body;
  if (!firmName || !email) {
    return res.status(400).json({ error: 'Firm name and email are required' });
  }

  const firm = db.createFirm(firmName);

  // In a real app, we would send an email here
  console.log(`[INVITE] Sending invite to ${email} for firm ${firm.name} with code ${firm.code}`);

  res.json({
    success: true,
    firm,
    message: 'Invitation sent successfully'
  });
});

app.post('/api/register', (req, res) => {
  const { accessCode, ...userData } = req.body;

  // 1. Validate Access Code if provided
  let firm = null;
  if (accessCode) {
    firm = db.getFirmByCode(accessCode);
    if (!firm) {
      return res.status(400).json({ error: 'Invalid Access Code' });
    }
  }

  // 2. Determine Status based on logic
  let status = 'confirmed';
  let message = 'Registration successful';

  if (firm) {
    userData.lawFirm = firm.name; // Override/Ensure firm name matches code
    const count = db.getFirmRegistrationCount(firm.name);

    if (count >= 2) {
      status = 'pending_payment';
      message = 'Free registration limit reached for this firm. Please proceed to payment.';
    }
  } else {
    // No code provided? 
    // For now, let's assume public registration is allowed but maybe always paid?
    // Or strictly require code for this specific flow?
    // The prompt implies this flow is for invitations.
    // Let's stick to the prompt: logic applies "For every law firm included in an invitation"

    // If user selects a firm from dropdown manually without code?
    // We will fallback to existing behavior or treat as 'pending_payment' if we want to enforce codes.
    // For this specific requirement, let's require code for "Free" entitlement.
    status = 'pending_payment';
  }

  const registration = db.addRegistration({
    ...userData,
    status
  });

  res.json({
    success: true,
    status,
    message,
    registration
  });
});

app.get('/api/users', (req, res) => {
  const users = db.getRegistrations().map(reg => ({
    id: reg.id,
    fullName: reg.fullName,
    jobTitle: reg.jobTitle,
    lawFirm: reg.lawFirm,
    email: reg.email,
    phone: reg.phoneNumber,
    attendanceType: reg.attendanceType,
    ticketType: reg.status === 'confirmed' ? 'Free/VIP' : 'Pending Payment',
    registeredAt: reg.registeredAt
  }));

  res.json({
    users,
    total: users.length
  });
});

app.get('/', (_req, res) => res.render('pages/home'));
app.get('/contact', (_req, res) => res.render('pages/contact'));

app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
