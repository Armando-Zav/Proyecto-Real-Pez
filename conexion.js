const mysql = require('mysql2');
require('dotenv').config(); // Carga las variables del archivo .env

// Creamos el pool de conexiones usando las variables de entorno
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10, // Máximo de conexiones simultáneas
    queueLimit: 0
});

// Exportamos el pool configurado para usar Async/Await (Promesas)
module.exports = pool.promise();