const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3001;
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

async function fetchBackend(endpoint, options = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response;
}

app.get('/api/firms', async (req, res) => {
  try {
    const response = await fetchBackend('/api/firms');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching firms:', error);
    res.status(500).json({ error: 'Failed to fetch firms' });
  }
});

app.get('/api/firms/activity', async (req, res) => {
  try {
    const response = await fetchBackend('/api/firms/activity');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching firm activity:', error);
    res.status(500).json({ error: 'Failed to fetch firm activity' });
  }
});

app.get('/api/registration/:id/ticket', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await fetchBackend(`/api/registrations/${id}/ticket`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
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

app.get('/api/registrations/pending-payments', async (req, res) => {
  try {
    const response = await fetchBackend('/api/registrations/pending-payments');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ error: 'Failed to fetch pending payments' });
  }
});

app.get('/api/inquiries', async (req, res) => {
  try {
    const response = await fetchBackend('/api/inquiries');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
});

app.post('/api/inquiries', async (req, res) => {
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

app.post('/api/admin/invite', async (req, res) => {
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
      debugMessage: inviteMessage
    });
  } catch (error) {
    console.error('Error creating firm:', error);
    res.status(500).json({ error: 'Failed to create firm' });
  }
});

app.post('/api/register', async (req, res) => {
  const { accessCode, fullName, companyName, jobTitle, lawFirm, phoneNumber, email } = req.body;

  try {
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
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error registering:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

app.get('/payment', async (req, res) => {
  const { id } = req.query;

  try {
    const response = await fetchBackend(`/api/registrations/${id}`);
    
    if (!response.ok) {
      return res.redirect('/');
    }

    const registration = await response.json();

    if (registration.status === 'confirmed') {
      return res.redirect('/');
    }

    // Fetch payment settings
    let settings = {
      ticket_price: '150',
      merchant_code: '123456',
      merchant_name: 'CMC Conference'
    };
    
    try {
      const settingsResponse = await fetchBackend('/api/settings');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        settingsData.forEach(s => {
          if (s.key === 'ticket_price' && s.value) settings.ticket_price = s.value;
          if (s.key === 'merchant_code' && s.value) settings.merchant_code = s.value;
          if (s.key === 'merchant_name' && s.value) settings.merchant_name = s.value;
        });
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    }

    res.render('pages/payment', { 
      registration: {
        id: registration.id,
        fullName: registration.full_name,
        email: registration.email,
        phone: registration.phone,
        jobTitle: registration.job_title,
        company: registration.company,
        status: registration.status,
        ticketType: registration.ticket_type,
        firmName: registration.firm_name
      },
      settings
    });
  } catch (error) {
    console.error('Error fetching registration:', error);
    res.redirect('/');
  }
});

app.post('/api/pay', async (req, res) => {
  const { registrationId } = req.body;

  try {
    const response = await fetchBackend(`/api/payments/pay?registration_id=${registrationId}`, {
      method: 'POST',
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

app.post('/api/payment-submitted', async (req, res) => {
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

app.post('/api/registrations/:id/verify-payment', async (req, res) => {
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

app.get('/api/users', async (req, res) => {
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
      email: registration.email,
      firm_name: registration.firm_name
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

app.get('/', (_req, res) => res.render('pages/home'));
app.get('/contact', (_req, res) => res.render('pages/contact'));
app.get('/terminal', (_req, res) => res.render('pages/terminal'));
app.get('/checkin', (_req, res) => res.render('pages/checkin'));

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
app.get('/api/terminal/logs', async (_req, res) => {
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
    } catch (e) {}
    
    // Fetch nginx access logs
    try {
      const { stdout: nginxLogs } = await execPromise('tail -n 50 /var/log/nginx/access.log 2>/dev/null || echo ""');
      nginxLogs.split('\n').filter(line => line.trim()).forEach(line => {
        const existing = serverLogs.find(l => l.source === 'nginx' && l.message === line);
        if (!existing) {
          addLog('nginx', line, 'info');
        }
      });
    } catch (e) {}
    
    // Fetch nginx error logs
    try {
      const { stdout: nginxErrors } = await execPromise('tail -n 50 /var/log/nginx/error.log 2>/dev/null || echo ""');
      nginxErrors.split('\n').filter(line => line.trim()).forEach(line => {
        const existing = serverLogs.find(l => l.source === 'nginx' && l.message === line);
        if (!existing) {
          addLog('nginx', line, 'error');
        }
      });
    } catch (e) {}
    
    res.json({ logs: serverLogs.slice(-500) });
  } catch (error) {
    res.json({ logs: serverLogs.slice(-500) });
  }
});

app.post('/api/terminal/clear', (_req, res) => {
  serverLogs = [];
  res.json({ success: true });
});

app.post('/api/terminal/reset-db', async (req, res) => {
  const { seed } = req.body;
  
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    console.log('Starting database reset...');
    
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
      const { stdout, stderr } = await execPromise('cd /var/www/conference2/backend && source venv/bin/activate && python seed_organizations.py');
      seedMessage = stdout || 'Seed completed';
      if (stderr) console.error('Seed stderr:', stderr);
      console.log('Seed script completed');
    }
    
    res.json({ 
      success: true, 
      message: seed ? `Database reset and seeded. ${seedMessage}` : 'Database cleared successfully.'
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
