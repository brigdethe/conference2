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

app.get('/api/firms/activity', (req, res) => {
  const firms = db.getFirms();
  const registrations = db.getRegistrations();

  const normalizeStatus = (value) => {
    const status = String(value || '').toLowerCase();
    return status === 'confirmed' ? 'confirmed' : 'pending_payment';
  };

  const firmActivity = firms
    .map((firm) => {
      const firmRegistrations = registrations
        .filter((registration) => registration.lawFirm === firm.name)
        .map((registration) => {
          const status = normalizeStatus(registration.status);
          const ticketType =
            registration.ticketType ||
            (status === 'confirmed' ? 'Access Code' : 'Paid');

          return {
            id: registration.id,
            fullName: registration.fullName || '',
            email: registration.email || '',
            jobTitle: registration.jobTitle || '',
            phone: registration.phoneNumber || '',
            registeredAt: registration.registeredAt || null,
            status,
            ticketType,
          };
        })
        .sort((a, b) => {
          const aTime = new Date(a.registeredAt || 0).getTime();
          const bTime = new Date(b.registeredAt || 0).getTime();
          return bTime - aTime;
        });

      const confirmedAccessCode = firmRegistrations.filter(
        (registration) =>
          registration.status === 'confirmed' &&
          registration.ticketType === 'Access Code'
      ).length;

      const confirmedPaid = firmRegistrations.filter(
        (registration) =>
          registration.status === 'confirmed' &&
          registration.ticketType === 'Paid'
      ).length;

      const pendingPayment = firmRegistrations.filter(
        (registration) => registration.status === 'pending_payment'
      ).length;

      return {
        name: firm.name,
        code: firm.code,
        totalRegistrations: firmRegistrations.length,
        confirmedAccessCode,
        confirmedPaid,
        pendingPayment,
        freeSlotsRemaining: Math.max(0, 2 - confirmedAccessCode),
        lastRegistrationAt: firmRegistrations[0]?.registeredAt || null,
        registrations: firmRegistrations,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  res.json({
    firms: firmActivity,
    total: firmActivity.length,
  });
});

app.post('/api/admin/invite', (req, res) => {
  const { firmName, email } = req.body;
  if (!firmName || !email) {
    return res.status(400).json({ error: 'Firm name and email are required' });
  }

  const firm = db.createFirm(firmName);

  // In a real app, we would send an email here
  const inviteMessage = `
  ======================================================
  [INVITATION EMAIL SIMULATION]
  To: ${email}
  Subject: Invitation to Ghana Competition Law Seminar
  ======================================================
  
  Dear Partner,

  You are cordially invited to register for the Ghana Competition Law Seminar.
  
  **IMPORTANT REGISTRATION INSTRUCTIONS:**
  
  1. Go to the registration page: http://localhost:3001/contact
  2. Use your unique Firm Access Code: **${firm.code}**
  3. This code will automatically select your Law Firm.
  
  *Note: The first 2 registrations for your firm are COMPLIMENTARY. 
  Any subsequent registrations will require payment.*
  
  We look forward to seeing you there.
  ======================================================
  `;

  console.log(inviteMessage);

  res.json({
    success: true,
    firm,
    message: 'Invitation sent successfully',
    debugMessage: inviteMessage // Sending back to frontend if needed for debugging
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

  // 2. Determine Status & Ticket Type
  let status = 'confirmed';
  let message = 'Registration successful';
  let ticketType = 'Access Code';

  if (firm) {
    userData.lawFirm = firm.name;
    const count = db.getFirmRegistrationCount(firm.name);

    if (count >= 2) {
      status = 'pending_payment';
      ticketType = 'Paid';
      message = 'Free registration limit reached. Payment required.';
    }
  } else {
    // No code = Paid
    status = 'pending_payment';
    ticketType = 'Paid';
    message = 'Payment required for public registration.';
  }

  const registration = db.addRegistration({
    ...userData,
    status,
    ticketType
  });

  res.json({
    success: true,
    status,
    message,
    registration
  });
});

app.get('/payment', (req, res) => {
  const { id } = req.query;
  const registrations = db.getRegistrations();
  const registration = registrations.find(r => r.id == id);

  if (!registration || registration.status === 'confirmed') {
    return res.redirect('/');
  }

  res.render('pages/payment', { registration });
});

app.post('/api/pay', (req, res) => {
  const { registrationId } = req.body;
  const registrations = db.getRegistrations();
  const registration = registrations.find(r => r.id == registrationId);

  if (!registration) {
    return res.status(404).json({ error: 'Registration not found' });
  }

  registration.status = 'confirmed';
  // Persist change
  // In a real app we'd call db.update(), but here our db is basically direct object reference + save
  // We need to trigger a save. Since db.js doesn't expose a generic update, we might need to rely on reference 
  // or add an update method? 
  // Checking db.js... db.getRegistrations returns the array reference. 
  // But db.js only saves in addRegistration/createFirm. 
  // We need to force a save.
  // Ideally, we'd add an updateRegistration method to db.js. 
  // For now, let's just re-save the whole list if we can, or just accept in-memory for this step 
  // and I'll fix db.js in a sec to support updates.
  // Actually, I should update db.js to expose a save function or update method.
  // Let me just hack it for a second: require fs/path here? No, that's messy.
  // I will assume for now I will update db.js next.

  // WAIT: typical "db" pattern. 
  // Let's add db.updateRegistrationStatus(id, status) to db.js next.
  // For now, I'll put the route here and assume db.updateRegistration works.
  db.updateRegistration(registrationId, { status: 'confirmed' });

  res.json({ success: true });
});

app.get('/api/users', (req, res) => {
  const statusFilter = (req.query.status || 'confirmed').toString().toLowerCase();
  const registrations = db.getRegistrations().filter(reg => {
    if (statusFilter === 'all') return true;
    return (reg.status || '').toLowerCase() === 'confirmed';
  });

  const users = registrations.map(reg => ({
    id: reg.id,
    fullName: reg.fullName,
    jobTitle: reg.jobTitle,
    lawFirm: reg.lawFirm,
    email: reg.email,
    phone: reg.phoneNumber,
    attendanceType: reg.attendanceType,
    ticketType: reg.ticketType || (reg.status === 'confirmed' ? 'Access Code' : 'Paid'), // Fallback
    registeredAt: reg.registeredAt,
    status: reg.status
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
