const mysql = require('mysql2');
require('dotenv').config(); // Carga las variables del archivo .env

// Hacemos que configure la conexión de forma inteligente:
// Si existe MYSQL_URL (Railway), usa la URL directa. 
// Si no existe, usa el objeto con las variables sueltas (entorno local).
const poolConfig = process.env.MYSQL_URL || {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(poolConfig);

// Agregamos un log para saber de inmediato en la consola si funcionó
pool.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Error al conectar a la base de datos:", err.message);
    } else {
        console.log("✅ Conexión establecida correctamente con la base de datos.");
        connection.release(); // Devuelve la conexión al pool
    }
});

// Exportamos el pool configurado para usar Async/Await (Promesas)
module.exports = pool.promise();