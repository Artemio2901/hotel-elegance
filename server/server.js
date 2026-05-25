require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// ── CONFIGURACIÓN DE CONEXIÓN A POSTGRESQL (SUPABASE) ────────────────
// En producción, Render/Railway/etc. inyectarán DATABASE_URL de Supabase
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:[TU_CONTRASEÑA]@db.ceqpszssnubpmnfxzjxl.supabase.co:5432/postgres';

const pool = new Pool({
    connectionString: connectionString,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false // Requerido para conexiones seguras en la nube
});

// Validar la conexión
pool.connect()
    .then(client => {
        console.log('✅ Conexión a PostgreSQL (Supabase) establecida exitosamente');
        client.release();
    })
    .catch(err => {
        console.error('⚠️ Error conectando a PostgreSQL (Supabase):', err.message);
        console.error('Asegúrate de configurar la variable de entorno DATABASE_URL o de tener las credenciales correctas.');
    });

// ── MIDDLEWARE ───────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// Servir el frontend estáticamente
app.use(express.static(path.join(__dirname, '..', 'hotel-app')));

// ── RUTAS ──────────────────────────────────────────────────

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'ok',
            message: '🏨 Hotel Elegance API (PostgreSQL/Supabase)',
            timestamp: new Date().toISOString(),
            version: '2.0.0'
        });
    } catch (err) {
        res.status(500).json({ error: 'Sin conexión a base de datos', details: err.message });
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

        const { rows: existing } = await pool.query(
            'SELECT username FROM users WHERE username = $1 OR email = $2 LIMIT 1',
            [username, email]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'El usuario o email ya está registrado' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newId = uuidv4();
        
        await pool.query(
            'INSERT INTO users (id, fullname, email, username, passwordHash, role) VALUES ($1, $2, $3, $4, $5, $6)',
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

        // Mapeamos passwordhash para mantener compatibilidad camelCase
        const { rows } = await pool.query(
            'SELECT id, fullname, email, username, role, passwordhash AS "passwordHash" FROM users WHERE username = $1 LIMIT 1', 
            [username]
        );
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
        const { rows: usersList } = await pool.query(
            'SELECT id, fullname, email, username, role, createdat AS "createdAt" FROM users'
        );
        res.json({ users: usersList });
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener usuarios', details: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { rows: userCheck } = await pool.query('SELECT username FROM users WHERE id = $1', [id]);
        
        if (userCheck.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (userCheck[0].username === 'admin') {
            return res.status(403).json({ error: 'No se puede eliminar el administrador principal' });
        }

        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'Usuario eliminado exitosamente', user: { username: userCheck[0].username } });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar usuario', details: err.message });
    }
});

// ── ROOMS CRUD ──────────────────────────────────────────────
app.get('/api/rooms', async (req, res) => {
    try {
        const { rows: rooms } = await pool.query('SELECT * FROM rooms');
        const { rows: features } = await pool.query('SELECT * FROM room_features');

        // Formatear datos para el frontend
        const roomsMap = rooms.map(r => ({
            ...r,
            price: parseFloat(r.price),
            available: Boolean(r.available),
            features: features.filter(f => f.room_id === r.id).map(f => f.feature)
        }));

        res.json({ rooms: roomsMap });
    } catch (err) {
        res.status(500).json({ error: 'Error listando habitaciones', details: err.message });
    }
});

app.get('/api/rooms/:id', async (req, res) => {
    try {
        const { rows: rooms } = await pool.query('SELECT * FROM rooms WHERE id = $1', [req.params.id]);
        if (rooms.length === 0) return res.status(404).json({ error: 'Habitación no encontrada' });
        
        const room = rooms[0];
        const { rows: features } = await pool.query('SELECT feature FROM room_features WHERE room_id = $1', [room.id]);
        
        res.json({
            room: {
                ...room,
                price: parseFloat(room.price),
                available: Boolean(room.available),
                features: features.map(f => f.feature)
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Error al buscar habitación', details: err.message });
    }
});

app.post('/api/rooms', async (req, res) => {
    try {
        const { id, title, price, icon, badge, features, description } = req.body;

        if (!title || !price || !description) {
            return res.status(400).json({ error: 'Título, precio y descripción son obligatorios' });
        }

        const newId = id || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        const { rows: existing } = await pool.query('SELECT id FROM rooms WHERE id = $1', [newId]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Ya existe una habitación con este ID' });
        }

        await pool.query(
            'INSERT INTO rooms (id, title, price, icon, badge, description, available) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [newId, title, Number(price), icon || '🛏️', badge || null, description, true]
        );

        if (Array.isArray(features) && features.length > 0) {
            for (const f of features) {
                await pool.query('INSERT INTO room_features (room_id, feature) VALUES ($1, $2)', [newId, f]);
            }
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

        const { rows: rooms } = await pool.query('SELECT id FROM rooms WHERE id = $1', [id]);
        if (rooms.length === 0) return res.status(404).json({ error: 'Habitación no encontrada' });

        if (title) await pool.query('UPDATE rooms SET title = $1 WHERE id = $2', [title, id]);
        if (price !== undefined) await pool.query('UPDATE rooms SET price = $1 WHERE id = $2', [Number(price), id]);
        if (icon) await pool.query('UPDATE rooms SET icon = $1 WHERE id = $2', [icon, id]);
        if (badge !== undefined) await pool.query('UPDATE rooms SET badge = $1 WHERE id = $2', [badge, id]);
        if (description) await pool.query('UPDATE rooms SET description = $1 WHERE id = $2', [description, id]);
        if (available !== undefined) await pool.query('UPDATE rooms SET available = $1 WHERE id = $2', [available, id]);

        if (features && Array.isArray(features)) {
            await pool.query('DELETE FROM room_features WHERE room_id = $1', [id]);
            for (const f of features) {
                await pool.query('INSERT INTO room_features (room_id, feature) VALUES ($1, $2)', [id, f]);
            }
        }

        res.json({ message: 'Habitación actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

app.delete('/api/rooms/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM rooms WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Habitación no encontrada' });
        res.json({ message: 'Habitación eliminada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar habitación', details: error.message });
    }
});

// ── OFFERS ────────────────────────────────────────────────
app.get('/api/offers', async (req, res) => {
    try {
        // Mapeamos camelCase
        const { rows: offers } = await pool.query(
            'SELECT id, title, badge, icon, description, oldprice AS "oldPrice", newprice AS "newPrice", validity FROM offers'
        );
        const { rows: includes } = await pool.query('SELECT * FROM offer_includes');

        const offersMap = offers.map(o => ({
            ...o,
            oldPrice: o.oldPrice ? parseFloat(o.oldPrice) : null,
            newPrice: o.newPrice ? parseFloat(o.newPrice) : null,
            includes: includes.filter(i => i.offer_id === o.id).map(i => i.include_text)
        }));

        res.json({ offers: offersMap });
    } catch (err) {
        res.status(500).json({ error: 'Error listando ofertas', details: err.message });
    }
});

app.get('/api/offers/:id', async (req, res) => {
    try {
        const { rows: offers } = await pool.query(
            'SELECT id, title, badge, icon, description, oldprice AS "oldPrice", newprice AS "newPrice", validity FROM offers WHERE id = $1', 
            [req.params.id]
        );
        if (offers.length === 0) return res.status(404).json({ error: 'Oferta no encontrada' });
        
        const offer = offers[0];
        const { rows: includes } = await pool.query('SELECT include_text FROM offer_includes WHERE offer_id = $1', [offer.id]);

        res.json({ offer: {
            ...offer,
             oldPrice: offer.oldPrice ? parseFloat(offer.oldPrice) : null,
             newPrice: offer.newPrice ? parseFloat(offer.newPrice) : null,
             includes: includes.map(i => i.include_text)
        }});
    } catch (err) {
        res.status(500).json({ error: 'Error buscando oferta', details: err.message });
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

        const { rows: rooms } = await pool.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
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
            (id, roomid, roomtitle, roomicon, checkin, checkout, nights, guests, name, email, special, price, subtotal, taxes, total, status, username) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
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
        const { rows: reservations } = await pool.query(
            `SELECT id, roomid AS "roomId", roomtitle AS "roomTitle", roomicon AS "roomIcon", 
             checkin AS "checkIn", checkout AS "checkOut", nights, guests, name, email, special, 
             price, subtotal, taxes, total, status, username, createdat AS "createdAt" 
             FROM reservations ORDER BY createdat DESC`
        );
        res.json({ reservations, total: reservations.length });
    } catch (err) {
        res.status(500).json({ error: 'Error listando reservaciones', details: err.message });
    }
});

app.get('/api/reservations/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const { rows: reservations } = await pool.query(
            `SELECT id, roomid AS "roomId", roomtitle AS "roomTitle", roomicon AS "roomIcon", 
             checkin AS "checkIn", checkout AS "checkOut", nights, guests, name, email, special, 
             price, subtotal, taxes, total, status, username, createdat AS "createdAt" 
             FROM reservations WHERE username = $1 ORDER BY createdat DESC`, 
            [username]
        );
        res.json({ reservations });
    } catch (err) {
        res.status(500).json({ error: 'Error buscando reservaciones de usuario', details: err.message });
    }
});

app.put('/api/reservations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, checkIn, checkOut, guests, special, status } = req.body;

        const { rows } = await pool.query('SELECT * FROM reservations WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Reservación no encontrada' });
        
        let resv = rows[0];

        // Validar propiedad (resv.username en Postgres se guarda en minúscula)
        if (username && resv.username !== username) {
            return res.status(403).json({ error: 'No tienes permiso para modificar esta reserva' });
        }

        // Fechas (Mapeamos campos con minúsculas del registro original de la DB)
        let newCheckIn = checkIn ? checkIn : resv.checkin;
        let newCheckOut = checkOut ? checkOut : resv.checkout;
        
        if (checkIn || checkOut) {
            const nights = Math.ceil((new Date(newCheckOut) - new Date(newCheckIn)) / (1000 * 60 * 60 * 24));
            if (nights <= 0) return res.status(400).json({ error: 'Las fechas son inválidas' });
            
            const p = parseFloat(resv.price);
            const sub = p * nights;
            const tax = Math.round(sub * 0.12);
            const tot = sub + tax;

            await pool.query(
                `UPDATE reservations SET checkin=$1, checkout=$2, nights=$3, subtotal=$4, taxes=$5, total=$6 WHERE id=$7`,
                [newCheckIn, newCheckOut, nights, sub, tax, tot, id]
            );
        }

        if (guests) await pool.query('UPDATE reservations SET guests=$1 WHERE id=$2', [guests, id]);
        if (special !== undefined) await pool.query('UPDATE reservations SET special=$1 WHERE id=$2', [special, id]);
        if (status) await pool.query('UPDATE reservations SET status=$1 WHERE id=$2', [status, id]);

        res.json({ message: 'Reservación actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando reservación', details: error.message });
    }
});

app.delete('/api/reservations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.body; 

        let query = 'SELECT username FROM reservations WHERE id = $1';
        let params = [id];
        
        if (username) {
            query += ' AND username = $2';
            params.push(username);
        }

        const { rows } = await pool.query(query, params);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Reservación no encontrada o no tienes permisos' });
        }

        await pool.query('UPDATE reservations SET status = \'cancelled\' WHERE id = $1', [id]);
        res.json({ message: 'Reservación cancelada' });
    } catch (err) {
        res.status(500).json({ error: 'Error cancelando reservación', details: err.message });
    }
});

// ── 404 ──────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── ARRANCAR SERVIDOR ─────────────────────────────────────
app.listen(PORT, () => {
    console.log('\x1b[33m%s\x1b[0m', '🏨 Hotel Elegance API con PostgreSQL/Supabase');
    console.log('\x1b[32m%s\x1b[0m', `✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log('\x1b[36m%s\x1b[0m', '\nEndpoints disponibles:');
    console.log('  GET    /api/health');
    console.log('  POST   /api/auth/login, /api/auth/register');
    console.log('  GET, POST, PUT, DELETE   /api/rooms, /api/reservations');
});
