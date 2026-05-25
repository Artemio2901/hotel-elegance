require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Cadena de conexión con la contraseña codificada URL (%23 para #)
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.ceqpszssnubpmnfxzjxl:%23Artemio123@aws-1-us-west-2.pooler.supabase.com:5432/postgres';

async function migrate() {
    console.log('🔄 Iniciando conexión a Supabase...');
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Conexión establecida con Supabase.');

        const sqlPath = path.join(__dirname, 'database_postgres.sql');
        console.log(`📖 Leyendo archivo SQL en: ${sqlPath}`);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('⚡ Ejecutando scripts SQL en Supabase...');
        await client.query(sql);
        console.log('🎉 ¡Migración exitosa! Las tablas fueron creadas y los datos demo fueron cargados en Supabase.');
    } catch (err) {
        console.error('❌ Error durante la migración:', err.message);
        if (err.message.includes('password authentication failed')) {
            console.error('👉 Tip: Asegúrate de que la contraseña sea la correcta en Supabase.');
        }
    } finally {
        await client.end();
        console.log('🔌 Conexión cerrada.');
    }
}

migrate();
