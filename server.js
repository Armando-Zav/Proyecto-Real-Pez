require('dotenv').config(); // Carga las variables de entorno desde el archivo .env
const express = require('express');
const mysql = require('mysql2');
const db = require('./conexion'); // Importamos la conexión a la base de datos
const path = require('path');
const app = express();

// CORRECCIÓN 1: Railway inyecta su propio puerto. Si no existe, usa 3000 localmente.
const PORT = process.env.PORT || 3000;

// Middleware para entender formatos JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir los archivos estáticos directamente desde la raíz
app.use(express.static(path.join(__dirname, './')));
const dbUrl = process.env.MYSQL_URL;

// Ruta de prueba de conexión
app.get('/probar-bd', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT NOW() as fecha_servidor');
        res.json({
            mensaje: "¡Conexión exitosa desde Node.js a Railway!",
            horaServidor: rows[0].fecha_servidor
        });
    } catch (error) {
        console.error("Error al conectar a la BD:", error);
        res.status(500).json({ error: "Error de conexión con la base de datos" });
    }
});

// Ruta principal: Carga tu index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// =========================================================================
// ENDPOINT 1: CREAR RESERVA (POST) -> Guarda directamente en MySQL
// CORRECCIÓN 2: Rutas POST unificadas con validaciones de seguridad
// =========================================================================
app.post('/api/reservas', async (req, res) => {
    try {
        const { fecha, hora, personas, tipoMesa, piso, mesa, cumpleanos, estado, cliente } = req.body;

        // Validaciones básicas de seguridad por si acaso
        if (!fecha || !hora || !personas || !cliente?.nombre || !cliente?.telefono) {
            return res.status(400).json({ ok: false, error: "Faltan campos obligatorios." });
        }

        const nombre = cliente.nombre;
        const telefono = cliente.telefono;
        const email = cliente.email || 'correo@temporal.com';

        // Regla de negocio: Si es Terraza, fuerza 16 personas y piso nulo
        const personasBD = tipoMesa === 'Terraza' ? 16 : personas;
        const pisoBD = tipoMesa === 'Terraza' ? null : (piso || 1);

        // Conversión a tipos de datos compatibles con MySQL
        const esCumpleanosBD = (cumpleanos === 'Sí' || cumpleanos === true) ? 1 : 0;
        const estadoBD = estado ? estado.toUpperCase() : 'PENDIENTE'; 

        const queryInsert = `
            INSERT INTO reservas 
            (nombre_cliente, telefono, correo, fecha_reserva, hora_reserva, num_comensales, tipo_zona, piso, numero_mesa, es_cumpleanos, estado_actual) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const numeroMesaBD = tipoMesa === 'Terraza' ? null : mesa;
        const [result] = await db.query(queryInsert, [
            nombre, telefono, email, fecha, hora, personasBD, tipoMesa, pisoBD, numeroMesaBD, esCumpleanosBD, estadoBD
        ]);

        // Generamos el código estético basado en el ID auto-incrementado insertado
        const codigoEstetico = `R-${String(result.insertId).padStart(3, '0')}`;

        console.log(`\n==================================================`);
        console.log(`🐟 ¡Nueva Reserva Registrada en MySQL!`);
        console.log(`ID Real: ${result.insertId} -> Código: ${codigoEstetico}`);
        console.log(`Cliente: ${nombre}`);
        console.log(`==================================================\n`);
        
        res.status(201).json({
            ok: true,
            mensaje: 'Reserva procesada correctamente.',
            reserva: { id: codigoEstetico }
        });

    } catch (error) {
        console.error('Error al insertar reserva en la BD:', error);
        res.status(500).json({ ok: false, error: 'Error interno del servidor al resguardar la reserva.' });
    }
});

// =========================================================================
// ENDPOINT 2: LISTAR RESERVAS (GET) -> Lee desde MySQL y formatea para el Dashboard
// CORRECCIÓN 3: Eliminada la ruta duplicada que crasheaba el servidor con "pool.query"
// =========================================================================
app.get('/api/reservas', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM reservas ORDER BY id DESC');

        // Mapeamos los registros de la BD al formato JSON exacto que tu frontend ya conoce
        const reservasMapeadas = rows.map(row => {
            // Formatear la hora de HH:MM:SS a HH:MM si viene como string largo
            const horaFormateada = row.hora_reserva ? String(row.hora_reserva).substring(0, 5) : "12:00";
            // Formatear la fecha a YYYY-MM-DD limpiando el huso horario
            const fechaFormateada = row.fecha_reserva ? new Date(row.fecha_reserva).toISOString().split('T')[0] : "";

            return {
                id: `R-${String(row.id).padStart(3, '0')}`,
                fecha: fechaFormateada,
                hora: horaFormateada,
                personas: row.num_comensales,
                tipoMesa: row.tipo_zona,
                piso: row.piso,
                mesa: row.numero_mesa,
                numero_mesa: row.numero_mesa,
                cumpleanos: row.es_cumpleanos ? 'Sí' : 'No',
                // PENDIENTE -> Pendiente, CONFIRMADA -> Confirmada
                estado: row.estado_actual.charAt(0) + row.estado_actual.slice(1).toLowerCase(),
                cliente: {
                    nombre: row.nombre_cliente,
                    telefono: row.telefono,
                    email: row.correo,
                    correo: row.correo
                }
            };
        });

        res.json(reservasMapeadas);
    } catch (error) {
        console.error("Error al consultar reservas en la BD:", error);
        res.status(500).json({ error: "Error al obtener las reservas." });
    }
});

// =========================================================================
// ENDPOINTS 3 Y 4: ACTUALIZAR ESTADO (PUT / PATCH)
// CORRECCIÓN 4: Se dejó una sola ruta PUT para evitar conflictos
// =========================================================================
app.put('/api/reservas/:id/estado', async (req, res) => {
    try {
        const { id } = req.params; // Viene como "R-005"
        const { estado } = req.body; // Viene como "Confirmada" o "Cancelada"

        // Convertimos el código estético "R-005" al ID entero de la BD (5)
        const idNumerico = parseInt(id.replace('R-', ''), 10);
        const estadoBD = estado.toUpperCase(); // Cambia a 'CONFIRMADA' o 'CANCELADA'

        const [result] = await db.query('UPDATE reservas SET estado_actual = ? WHERE id = ?', [estadoBD, idNumerico]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, mensaje: 'No se encontró la reserva.' });
        }

        console.log(`[Base de Datos] Reserva ${id} (ID: ${idNumerico}) modificada a: ${estadoBD}`);
        res.json({ success: true, mensaje: 'Estado actualizado correctamente en MySQL.' });
    } catch (error) {
        console.error("Error al actualizar estado (PUT):", error);
        res.status(500).json({ success: false, error: "Error interno." });
    }
});

app.patch('/api/reservas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevoEstado } = req.body;

        const idNumerico = parseInt(id.replace('R-', ''), 10);
        const estadoBD = nuevoEstado.toUpperCase();

        const [result] = await db.query('UPDATE reservas SET estado_actual = ? WHERE id = ?', [estadoBD, idNumerico]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Reserva no encontrada' });
        }

        console.log(`[Base de Datos] Reserva ${id} corregida vía PATCH a: ${estadoBD}`);
        res.json({ exito: true });
    } catch (error) {
        console.error("Error al actualizar estado (PATCH):", error);
        res.status(500).json({ exito: false, error: "Error interno." });
    }
});

// Iniciamos el servidor
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(` Surf activo en el puerto: ${PORT} 🐟🔥`);
    console.log(` SQL vinculando directamente a Railway de forma real.`);
    console.log(`==================================================\n`);
});