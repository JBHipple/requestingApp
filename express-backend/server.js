const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database setup
const dbPath = path.join(__dirname, 'requests.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database at', dbPath);
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    const createRequestsTable = `
        CREATE TABLE IF NOT EXISTS requests (
            rowId INTEGER PRIMARY KEY AUTOINCREMENT,
            RequestText TEXT NOT NULL,
            SubmitDate DATETIME DEFAULT CURRENT_TIMESTAMP,
            SubmittedBy TEXT NOT NULL,
            Status TEXT DEFAULT 'pending' CHECK(Status IN ('pending', 'in-progress', 'completed')),
            Priority BOOLEAN DEFAULT 0,
            SortOrder INTEGER DEFAULT 0,
            Year INTEGER,
            Type TEXT
        )
    `;
    
    db.run(createRequestsTable, (err) => {
        if (err) {
            console.error('Error creating requests table:', err.message);
        } else {
            console.log('Requests table ready');
            // Add Year and Type columns to existing table if they don't exist
            db.run(`ALTER TABLE requests ADD COLUMN Year INTEGER`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding Year column:', err.message);
                }
            });
            db.run(`ALTER TABLE requests ADD COLUMN Type TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding Type column:', err.message);
                }
            });
        }
    });

    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    db.run(createUsersTable, (err) => {
        if (err) {
            console.error('Error creating users table:', err.message);
        } else {
            console.log('Users table ready');
        }
    });
}

// Routes

// Get all requests
app.get('/api/requests', (req, res) => {
    const query = `
        SELECT rowId, RequestText, SubmitDate, SubmittedBy, Status, Priority, SortOrder, Year, Type
        FROM requests 
        ORDER BY Priority DESC, SortOrder ASC, SubmitDate ASC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching requests:', err.message);
            res.status(500).json({ error: 'Failed to fetch requests' });
        } else {
            res.json(rows);
        }
    });
});

// Create a new request
app.post('/api/requests', (req, res) => {
    const { text, submittedBy, priority = false, sortOrder = 0, year, type } = req.body;
    
    if (!text || !submittedBy) {
        return res.status(400).json({ error: 'Text and submittedBy are required' });
    }

    const query = `
        INSERT INTO requests (RequestText, SubmittedBy, Status, Priority, SortOrder, Year, Type)
        VALUES (?, ?, 'pending', ?, ?, ?, ?)
    `;
    
    db.run(query, [text, submittedBy, priority ? 1 : 0, sortOrder, year, type], function(err) {
        if (err) {
            console.error('Error creating request:', err.message);
            res.status(500).json({ error: 'Failed to create request' });
        } else {
            res.status(201).json({ 
                rowId: this.lastID,
                message: 'Request created successfully' 
            });
        }
    });
});

// Update request status
app.put('/api/requests/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'in-progress', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const query = `
        UPDATE requests 
        SET Status = ? 
        WHERE rowId = ?
    `;
    
    db.run(query, [status, id], function(err) {
        if (err) {
            console.error('Error updating request status:', err.message);
            res.status(500).json({ error: 'Failed to update request status' });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Request not found' });
        } else {
            res.json({ message: 'Request status updated successfully' });
        }
    });
});

// Update request sort order
app.put('/api/requests/:id/sortorder', (req, res) => {
    const { id } = req.params;
    const { sortOrder } = req.body;
    
    const query = `
        UPDATE requests 
        SET SortOrder = ? 
        WHERE rowId = ?
    `;
    
    db.run(query, [sortOrder, id], function(err) {
        if (err) {
            console.error('Error updating request sort order:', err.message);
            res.status(500).json({ error: 'Failed to update request sort order' });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Request not found' });
        } else {
            res.json({ message: 'Request sort order updated successfully' });
        }
    });
});

// Delete a request
app.delete('/api/requests/:id', (req, res) => {
    const { id } = req.params;
    
    const query = 'DELETE FROM requests WHERE rowId = ?';
    
    db.run(query, [id], function(err) {
        if (err) {
            console.error('Error deleting request:', err.message);
            res.status(500).json({ error: 'Failed to delete request' });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Request not found' });
        } else {
            res.json({ message: 'Request deleted successfully' });
        }
    });
});

// Update request order (for drag and drop)
app.put('/api/requests/reorder', (req, res) => {
    const { requestIds } = req.body;
    
    if (!Array.isArray(requestIds)) {
        return res.status(400).json({ error: 'requestIds must be an array' });
    }

    // Update the sort order for each request based on its position in the array
    const updatePromises = requestIds.map((id, index) => {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE requests SET SortOrder = ? WHERE rowId = ?';
            db.run(query, [index, id], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });
    });

    Promise.all(updatePromises)
        .then(() => {
            res.json({ message: 'Request order updated successfully' });
        })
        .catch((err) => {
            console.error('Error updating request order:', err.message);
            res.status(500).json({ error: 'Failed to update request order' });
        });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Server accessible from outside on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});
