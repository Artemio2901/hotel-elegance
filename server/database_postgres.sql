-- --- ESQUEMA DE BASE DE DATOS PARA POSTGRESQL / SUPABASE ---

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    fullname VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    passwordHash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    icon VARCHAR(20),
    badge VARCHAR(50),
    description TEXT,
    available BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS room_features (
    id SERIAL PRIMARY KEY,
    room_id VARCHAR(50) REFERENCES rooms(id) ON DELETE CASCADE,
    feature VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS offers (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(100),
    badge VARCHAR(50),
    icon VARCHAR(20),
    description TEXT,
    oldPrice DECIMAL(10,2),
    newPrice DECIMAL(10,2),
    validity VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS offer_includes (
    id SERIAL PRIMARY KEY,
    offer_id VARCHAR(50) REFERENCES offers(id) ON DELETE CASCADE,
    include_text VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS reservations (
    id VARCHAR(50) PRIMARY KEY,
    roomId VARCHAR(50),
    roomTitle VARCHAR(100),
    roomIcon VARCHAR(20),
    checkIn DATE,
    checkOut DATE,
    nights INT,
    guests INT,
    name VARCHAR(100),
    email VARCHAR(100),
    special TEXT,
    price DECIMAL(10,2),
    subtotal DECIMAL(10,2),
    taxes DECIMAL(10,2),
    total DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'confirmed',
    username VARCHAR(50),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --- DATOS POR DEFECTO ---

-- Usuarios (Contraseñas hasheadas: admin = 'admin123', usuario = 'password')
INSERT INTO users (id, fullname, email, username, passwordHash, role, createdAt) VALUES 
('admin-1', 'Administrador', 'admin@hotelelegance.com', 'admin', '$2a$10$brQHDgYXgFNOSe6/i7KKm.gwi8G2t8ar9tqyraRRmtkDRw2xJTdBq', 'admin', NOW()),
('demo-user-1', 'Usuario Demo', 'demo@hotelelegance.com', 'usuario', '$2a$10$MgwudiGKUvyCJAYEmX/AveghbGQZzMwXo54HZTdqaBbl1vAyGbfBC', 'user', NOW())
ON CONFLICT (id) DO NOTHING;

-- Habitaciones
INSERT INTO rooms (id, title, price, icon, badge, description, available) VALUES 
('suite-lujo', 'Suite de Lujo', 350.00, '🛏️', 'Popular', 'Espaciosa suite con vista panorámica, jacuzzi privado y sala de estar elegante.', TRUE),
('deluxe', 'Habitación Deluxe', 200.00, '🛏️', NULL, 'Habitación moderna con todas las comodidades y diseño contemporáneo.', TRUE),
('estandar', 'Habitación Estándar', 120.00, '🛏️', 'Oferta', 'Confortable y acogedora, perfecta para estancias cortas con todo lo necesario.', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO room_features (room_id, feature) VALUES 
('suite-lujo', 'King Size'), ('suite-lujo', '2-3 Personas'), ('suite-lujo', '65 m²'), ('suite-lujo', 'Vista al Mar'),
('deluxe', 'Queen Size'), ('deluxe', '2 Personas'), ('deluxe', '40 m²'), ('deluxe', 'Vista Ciudad'),
('estandar', 'Full Size'), ('estandar', '1-2 Personas'), ('estandar', '30 m²'), ('estandar', 'Vista Jardín');

-- Ofertas
INSERT INTO offers (id, title, badge, icon, description, oldPrice, newPrice, validity) VALUES 
('romantica', 'Escapada Romántica', '-30%', '💑', 'La escapada perfecta para parejas que buscan una experiencia íntima e inolvidable.', 700.00, 490.00, 'Válido todos los fines de semana del año'),
('prolongada', 'Estadía Prolongada', '-20%', '📅', 'Aprovecha el mejor precio cuando te quedas 5 noches o más.', 1000.00, 800.00, 'Válido para reservas de 5 noches o más'),
('wellness', 'Experiencia Wellness', 'Nuevo', '🧘', 'Reconecta con tu bienestar en un retiro de lujo.', NULL, 650.00, 'Disponible de lunes a jueves')
ON CONFLICT (id) DO NOTHING;

INSERT INTO offer_includes (offer_id, include_text) VALUES 
('romantica', '2 noches en Suite de Lujo'), ('romantica', 'Cena romántica con vista al mar'), ('romantica', 'Spa para parejas (2 horas)'), ('romantica', 'Botella de champagne de bienvenida'), ('romantica', 'Arreglo floral en la habitación'),
('prolongada', '5 noches o más en habitación elegida'), ('prolongada', 'Desayuno buffet incluido diariamente'), ('prolongada', 'Lavandería gratuita (2 piezas/día)'), ('prolongada', 'Acceso al gimnasio y piscina'), ('prolongada', 'Transporte al aeropuerto (ida y vuelta)'),
('wellness', '3 noches en Habitación Deluxe'), ('wellness', 'Acceso ilimitado al spa'), ('wellness', 'Clases de yoga matutinas'), ('wellness', 'Menú saludable en restaurante'), ('wellness', 'Masaje relajante de 60 min (1 sesión)');
