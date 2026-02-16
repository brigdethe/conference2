const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

// Helper to load data
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(raw);
        }
    } catch (err) {
        console.error('Error loading data:', err);
    }
    // Default structure if file missing or error
    return { lawFirms: [], registrations: [] };
}

// Helper to save data
function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error saving data:', err);
    }
}

// Initialize in-memory cache from file
let dbData = loadData();

function generateCode(name) {
    const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
    const random = Math.floor(100 + Math.random() * 900);
    return `${prefix}${random}`;
}

module.exports = {
    getFirms: () => dbData.lawFirms,

    createFirm: (name) => {
        // Refresh data in case another process updated it (unlikely here but good practice)
        dbData = loadData();

        const existing = dbData.lawFirms.find(f => f.name.toLowerCase() === name.toLowerCase());
        if (existing) return existing;

        const newFirm = {
            name,
            code: generateCode(name)
        };
        dbData.lawFirms.push(newFirm);

        // Persist
        saveData(dbData);

        return newFirm;
    },

    getFirmByCode: (code) => {
        return dbData.lawFirms.find(f => f.code === code);
    },

    getRegistrations: () => dbData.registrations,

    addRegistration: (registration) => {
        dbData = loadData();

        const newReg = {
            id: dbData.registrations.length + 1,
            registeredAt: new Date().toISOString(),
            ...registration
        };
        dbData.registrations.push(newReg);

        saveData(dbData);

        return newReg;
    },

    getFirmRegistrationCount: (firmName) => {
        // We might want to reload data here too if high concurrency, but for now in-memory cache is mostly fine 
        // if this process is the only writer. To be safe/consistent:
        // dbData = loadData(); 
        // (Skipping reload on read-only for performance unless strict consistency needed)

        return dbData.registrations.filter(r =>
            r.lawFirm === firmName &&
            r.status === 'confirmed'
        ).length;
    }
};
