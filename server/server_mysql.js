const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

// ── CONFIGURACIÓN MYSQL ──────────────────────────────────────
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hotel_elegance',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};
const pool = mysql.createPool(dbConfig);

// Validar la conexión
pool.getConnection()
    .then(conn => {
        console.log('✅ Conexión a MySQL establecida exitosamente (hotel_elegance)');
        conn.release();
    })
    .catch(err => {
        console.error('⚠️  Error conectando a MySQL:', err.message);
        console.error('Asegúrate de haber ejecutado database.sql en MySQL Workbench.');
    });

// ── MIDDLEWARE ───────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// Servir el frontend estáticamente (opcional)
app.use(express.static(path.join(__dirname, '..', 'hotel-app')));

// ── RUTAS ──────────────────────────────────────────────────

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'ok',
            message: '🏨 Hotel Elegance API (MySQL)',
            timestamp: new Date().toISOString(),
            version: '2.0.0'
        });
    } catch (err) {
        res.status(500).json({ error: 'Sin conexión a base de datos' });
    }
});

// ── AUTH: REGISTRO ────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
    try {
        const { fullname, email, username, password } = req.body;

        if (!fullname || !email || !username || !password) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }

        const [existing] = await pool.query(
            'SELECT username FROM users WHERE username = ? OR email = ? LIMIT 1',
            [username, email]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'El usuario o email ya está registrado' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newId = uuidv4();
        
        await pool.query(
            'INSERT INTO users (id, fullname, email, username, passwordHash, role) VALUES (?, ?, ?, ?, ?, ?)',
            [newId, fullname, email, username, passwordHash, 'user']
        );

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: { id: newId, fullname, email, username, role: 'user' }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// ── AUTH: LOGIN ───────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
        }

        const [rows] = await pool.query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const user = rows[0];
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        res.json({
            message: 'Login exitoso',
            user: {
                id: user.id,
                fullname: user.fullname,
                email: user.email,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

// ── USERS CRUD ────────────────────────────────────────────
app.get('/api/users', async (req, res) => {
    try {
        const [usersList] = await pool.query('SELECT id, fullname, email, username, role, createdAt FROM users');
        res.json({ users: usersList });
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [userCheck] = await pool.query('SELECT username FROM users WHERE id = ?', [id]);
        
        if (userCheck.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (userCheck[0].username === 'admin') {
            return res.status(403).json({ error: 'No se puede eliminar el administrador principal' });
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'Usuario eliminado exitosamente', user: { username: userCheck[0].username } });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

// ── ROOMS CRUD ──────────────────────────────────────────────
app.get('/api/rooms', async (req, res) => {
    try {
        const [rooms] = await pool.query('SELECT * FROM rooms');
        const [features] = await pool.query('SELECT * FROM room_features');

        // Formatear datos
        const roomsMap = rooms.map(r => ({
            ...r,
            price: parseFloat(r.price),
            available: Boolean(r.available),
            features: features.filter(f => f.room_id === r.id).map(f => f.feature)
        }));

        res.json({ rooms: roomsMap });
    } catch (err) {
        res.status(500).json({ error: 'Error listando habitaciones' });
    }
});

app.get('/api/rooms/:id', async (req, res) => {
    try {
        const [rooms] = await pool.query('SELECT * FROM rooms WHERE id = ?', [req.params.id]);
        if (rooms.length === 0) return res.status(404).json({ error: 'Habitación no encontrada' });
        
        const room = rooms[0];
        const [features] = await pool.query('SELECT feature FROM room_features WHERE room_id = ?', [room.id]);
        
        res.json({
            room: {
                ...room,
                price: parseFloat(room.price),
                available: Boolean(room.available),
                features: features.map(f => f.feature)
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Error al buscar habitación' });
    }
});

app.post('/api/rooms', async (req, res) => {
    try {
        const { id, title, price, icon, badge, features, description } = req.body;

        if (!title || !price || !description) {
            return res.status(400).json({ error: 'Título, precio y descripción son obligatorios' });
        }

        const newId = id || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        const [existing] = await pool.query('SELECT id FROM rooms WHERE id = ?', [newId]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Ya existe una habitación con este ID' });
        }

        await pool.query(
            'INSERT INTO rooms (id, title, price, icon, badge, description, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [newId, title, Number(price), icon || '🛏️', badge || null, description, true]
        );

        if (Array.isArray(features) && features.length > 0) {
            const fValues = features.map(f => [newId, f]);
            await pool.query('INSERT INTO room_features (room_id, feature) VALUES ?', [fValues]);
        }

        res.status(201).json({ message: 'Habitación creada exitosamente', id: newId });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

app.put('/api/rooms/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, price, icon, badge, features, description, available } = req.body;

        const [rooms] = await pool.query('SELECT id FROM rooms WHERE id = ?', [id]);
        if (rooms.length === 0) return res.status(404).json({ error: 'Habitación no encontrada' });

        if (title) await pool.query('UPDATE rooms SET title = ? WHERE id = ?', [title, id]);
        if (price !== undefined) await pool.query('UPDATE rooms SET price = ? WHERE id = ?', [Number(price), id]);
        if (icon) await pool.query('UPDATE rooms SET icon = ? WHERE id = ?', [icon, id]);
        if (badge !== undefined) await pool.query('UPDATE rooms SET badge = ? WHERE id = ?', [badge, id]);
        if (description) await pool.query('UPDATE rooms SET description = ? WHERE id = ?', [description, id]);
        if (available !== undefined) await pool.query('UPDATE rooms SET available = ? WHERE id = ?', [available, id]);

        if (features && Array.isArray(features)) {
            await pool.query('DELETE FROM room_features WHERE room_id = ?', [id]);
            if (features.length > 0) {
                const fValues = features.map(f => [id, f]);
                await pool.query('INSERT INTO room_features (room_id, feature) VALUES ?', [fValues]);
            }
        }

        res.json({ message: 'Habitación actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

app.delete('/api/rooms/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM rooms WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Habitación no encontrada' });
        res.json({ message: 'Habitación eliminada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar habitación' });
    }
});

// ── OFFERS ────────────────────────────────────────────────
app.get('/api/offers', async (req, res) => {
    try {
        const [offers] = await pool.query('SELECT * FROM offers');
        const [includes] = await pool.query('SELECT * FROM offer_includes');

        const offersMap = offers.map(o => ({
            ...o,
            oldPrice: o.oldPrice ? parseFloat(o.oldPrice) : null,
            newPrice: o.newPrice ? parseFloat(o.newPrice) : null,
            includes: includes.filter(i => i.offer_id === o.id).map(i => i.include_text)
        }));

        res.json({ offers: offersMap });
    } catch (err) {
        res.status(500).json({ error: 'Error listando ofertas' });
    }
});

app.get('/api/offers/:id', async (req, res) => {
    try {
        const [offers] = await pool.query('SELECT * FROM offers WHERE id = ?', [req.params.id]);
        if (offers.length === 0) return res.status(404).json({ error: 'Oferta no encontrada' });
        
        const offer = offers[0];
        const [includes] = await pool.query('SELECT include_text FROM offer_includes WHERE offer_id = ?', [offer.id]);

        res.json({ offer: {
            ...offer,
             oldPrice: offer.oldPrice ? parseFloat(offer.oldPrice) : null,
             newPrice: offer.newPrice ? parseFloat(offer.newPrice) : null,
             includes: includes.map(i => i.include_text)
        }});
    } catch (err) {
        res.status(500).json({ error: 'Error buscando oferta' });
    }
});

// ── RESERVATIONS CRUD ──────────────────────────────────────

app.post('/api/reservations', async (req, res) => {
    try {
        const {
            roomId, checkIn, checkOut, guests,
            name, email, special, username
        } = req.body;

        if (!roomId || !checkIn || !checkOut || !name || !email || !username) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        const [rooms] = await pool.query('SELECT * FROM rooms WHERE id = ?', [roomId]);
        if (rooms.length === 0) return res.status(404).json({ error: 'Habitación no encontrada' });
        const room = rooms[0];

        const nights = Math.ceil(
            (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
        );
        if (nights <= 0) {
            return res.status(400).json({ error: 'Las fechas son inválidas' });
        }

        const roomPrice = parseFloat(room.price);
        const subtotal = roomPrice * nights;
        const taxes = Math.round(subtotal * 0.12);
        const total = subtotal + taxes;

        const resId = 'RES-' + uuidv4().slice(0, 8).toUpperCase();

        await pool.query(
            `INSERT INTO reservations 
            (id, roomId, roomTitle, roomIcon, checkIn, checkOut, nights, guests, name, email, special, price, subtotal, taxes, total, status, username) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [resId, roomId, room.title, room.icon, checkIn, checkOut, nights, guests, name, email, special, roomPrice, subtotal, taxes, total, 'confirmed', username]
        );

        res.status(201).json({
            message: '¡Reserva confirmada!',
            reservation: {
                id: resId, roomId, roomTitle: room.title, checkIn, checkOut, nights, total, status: 'confirmed'
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

app.get('/api/reservations', async (req, res) => {
    try {
        const [reservations] = await pool.query('SELECT * FROM reservations ORDER BY createdAt DESC');
        res.json({ reservations, total: reservations.length });
    } catch (err) {
        res.status(500).json({ error: 'Error listando reservaciones' });
    }
});

app.get('/api/reservations/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const [reservations] = await pool.query('SELECT * FROM reservations WHERE username = ? ORDER BY createdAt DESC', [username]);
        res.json({ reservations });
    } catch (err) {
        res.status(500).json({ error: 'Error buscando reservaciones de usuario' });
    }
});

app.put('/api/reservations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, checkIn, checkOut, guests, special, status } = req.body;

        const [rows] = await pool.query('SELECT * FROM reservations WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Reservación no encontrada' });
        
        let resv = rows[0];

        // Validar propiedad
        if (username && resv.username !== username) {
            return res.status(403).json({ error: 'No tienes permiso para modificar esta reserva' });
        }

        // Fechas
        let newCheckIn = checkIn ? checkIn : resv.checkIn;
        let newCheckOut = checkOut ? checkOut : resv.checkOut;
        
        if (checkIn || checkOut) {
            const nights = Math.ceil((new Date(newCheckOut) - new Date(newCheckIn)) / (1000 * 60 * 60 * 24));
            if (nights <= 0) return res.status(400).json({ error: 'Las fechas son inválidas' });
            
            const p = parseFloat(resv.price);
            const sub = p * nights;
            const tax = Math.round(sub * 0.12);
            const tot = sub + tax;

            await pool.query(
                `UPDATE reservations SET checkIn=?, checkOut=?, nights=?, subtotal=?, taxes=?, total=? WHERE id=?`,
                [newCheckIn, newCheckOut, nights, sub, tax, tot, id]
            );
        }

        if (guests) await pool.query('UPDATE reservations SET guests=? WHERE id=?', [guests, id]);
        if (special !== undefined) await pool.query('UPDATE reservations SET special=? WHERE id=?', [special, id]);
        if (status) await pool.query('UPDATE reservations SET status=? WHERE id=?', [status, id]);

        res.json({ message: 'Reservación actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando reservación', details: error.message });
    }
});

app.delete('/api/reservations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.body; 

        let query = 'SELECT username FROM reservations WHERE id = ?';
        let params = [id];
        
        if (username) {
            query += ' AND username = ?';
            params.push(username);
        }

        const [rows] = await pool.query(query, params);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Reservación no encontrada o no tienes permisos' });
        }

        await pool.query('UPDATE reservations SET status = "cancelled" WHERE id = ?', [id]);
        res.json({ message: 'Reservación cancelada' });
    } catch (err) {
        res.status(500).json({ error: 'Error cancelando reservación' });
    }
});

// ── 404 ──────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── ARRANCAR SERVIDOR ─────────────────────────────────────
app.listen(PORT, () => {
    console.log('\x1b[33m%s\x1b[0m', '🏨 Hotel Elegance API con MySQL');
    console.log('\x1b[32m%s\x1b[0m', `✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log('\x1b[36m%s\x1b[0m', '\nEndpoints disponibles:');
    console.log('  GET    /api/health');
    console.log('  POST   /api/auth/login, /api/auth/register');
    console.log('  GET, POST, PUT, DELETE   /api/rooms, /api/reservations');
    console.log('\x1b[90m%s\x1b[0m', '\n🔑 Importante: Asegúrate de cargar database.sql en MySQL');
});
