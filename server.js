require('dotenv').config(); // Carga las variables de entorno desde el archivo .env
const express = require('express');
const mysql = require('mysql2');
const db = require('./conexion'); // Importamos la conexión a la base de datos
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware para entender formatos JSON (¡Esencial para leer req.body!)
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
// =========================================================================
app.post('/api/reservas', async (req, res) => {
    try {
        const cuerpo = req.body;

        // Extraemos y adaptamos los campos requeridos por la base de datos
        const nombre = cuerpo.cliente?.nombre || 'Sin nombre';
        const telefono = cuerpo.cliente?.telefono || '';
        const email = cuerpo.cliente?.email || 'correo@temporal.com';

        const fecha = cuerpo.fecha;
        const hora = cuerpo.hora;
        const tipoMesa = cuerpo.tipoMesa;
        const mesa = cuerpo.mesa;

        // Regla de negocio: Si es Terraza, fuerza 16 personas y piso nulo
        const personas = tipoMesa === 'Terraza' ? 16 : (cuerpo.personas || 2);
        const pisoBD = tipoMesa === 'Terraza' ? null : (cuerpo.piso || 1);

        // Conversión a tipos de datos compatibles con MySQL
        const esCumpleanosBD = (cuerpo.cumpleanos === 'Sí' || cuerpo.cumpleanos === true) ? 1 : 0;
        const estadoBD = 'PENDIENTE'; // Entra para revisión por defecto

        const queryInsert = `
            INSERT INTO reservas 
            (nombre_cliente, telefono, correo, fecha_reserva, hora_reserva, num_comensales, tipo_zona, piso, numero_mesa, es_cumpleanos, estado_actual) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.query(queryInsert, [
            nombre, telefono, email, fecha, hora, personas, tipoMesa, pisoBD, mesa, esCumpleanosBD, estadoBD
        ]);

        // Generamos el código estético basado en el ID auto-incrementado insertado
        const codigoEstetico = `R-${String(result.insertId).padStart(3, '0')}`;

        console.log(`\n==================================================`);
        console.log(`🐟 ¡Nueva Reserva Registrada en MySQL!`);
        console.log(`ID Real: ${result.insertId} -> Código: ${codigoEstetico}`);
        console.log(`Cliente: ${nombre}`);
        console.log(`==================================================\n`);
        res.status(201).json({
            mensaje: 'Reserva procesada correctamente.',
            reserva: { id: codigoEstetico }
        });

    } catch (error) {
        console.error('Error al insertar reserva en la BD:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al resguardar la reserva.' });
    }
});

// =========================================================================
// ENDPOINT 2: LISTAR RESERVAS (GET) -> Lee desde MySQL y formatea para el Dashboard
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
                cumpleanos: row.es_cumpleanos ? 'Sí' : 'No',
                // PENDIENTE -> Pendiente, CONFIRMADA -> Confirmada
                estado: row.estado_actual.charAt(0) + row.estado_actual.slice(1).toLowerCase(),
                cliente: {
                    nombre: row.nombre_cliente,
                    telefono: row.telefono,
                    email: row.correo
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
// ENDPOINTS 3 Y 4: ACTUALIZAR ESTADO (PUT / PATCH) -> Modifican la BD usando el ID numérico
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

// Ruta para obtener todas las reservas adaptada exactamente a tu BD
app.get('/api/reservas', async (req, res) => {
    try {
        // 1. 🔍 Hacemos la consulta directa a tu tabla única
        const [rows] = await pool.query(`
            SELECT 
                id, 
                nombre_cliente, 
                telefono, 
                correo, 
                fecha_reserva, 
                hora_reserva, 
                num_comensales, 
                tipo_zona, 
                piso, 
                numero_mesa, 
                es_cumpleanos, 
                estado_actual
            FROM reservas
            ORDER BY fecha_reserva ASC, hora_reserva ASC
        `);

        // 2. 📦 Mapeamos las columnas de tu BD para que calcen perfecto con tu frontend (dashboard.js)
        const respuestaMapeada = rows.map(row => ({
            id: row.id.toString(), // Convertimos a String por seguridad
            fecha: row.fecha_reserva, 
            hora: row.hora_reserva,
            personas: row.num_comensales,
            estado: row.estado_actual,
            numero_mesa: row.numero_mesa,
            zona: row.tipo_zona,
            piso: row.piso,
            cumpleanos: row.es_cumpleanos, 
            
            // Agrupamos los datos del cliente en el objeto interno que espera tu JS
            cliente: {
                nombre: row.nombre_cliente,
                telefono: row.telefono,
                correo: row.correo
            }
        }));

        // 3. Enviamos la data limpia al frontend
        res.json(respuestaMapeada);

    } catch (error) {
        console.error("❌ Error en GET /api/reservas:", error);
        res.status(500).json({ error: "Error interno del servidor al obtener reservas" });
    }
});

// Endpoint para actualizar el estado desde las acciones del Admin
app.put('/api/reservas/:id/estado', async (req, res) => {
    const { id } = req.params; // Viene como "R-001"
    const { estado } = req.body; // Viene como "Confirmada" o "Cancelada"

    try {
        // Extraemos solo el número del ID (Ej: "R-001" -> 1)
        const idNumerico = parseInt(id.replace('R-', ''), 10);

        // Convertimos el estado a mayúsculas para que calce con el ENUM de MySQL
        const estadoBD = estado.toUpperCase(); // "CONFIRMADA" o "CANCELADA"

        const query = 'UPDATE reservas SET estado_actual = ? WHERE id = ?';
        await db.query(query, [estadoBD, idNumerico]);

        res.json({ ok: true, mensaje: "Estado actualizado correctamente" });
    } catch (error) {
        console.error("Error al actualizar estado:", error);
        res.status(500).json({ ok: false, error: "No se pudo actualizar el estado" });
    }
});

// ENDPOINT PARA CREAR UNA NUEVA RESERVA
app.post('/api/reservas', async (req, res) => {
    try {
        // 1. Desestructuramos el objeto que viene desde el frontend
        const { fecha, hora, personas, tipoMesa, piso, mesa, cumpleanos, estado, cliente } = req.body;

        // Validaciones básicas de seguridad por si acaso
        if (!fecha || !hora || !personas || !cliente?.nombre || !cliente?.telefono) {
            return res.status(400).json({ ok: false, error: "Faltan campos obligatorios." });
        }

        // 2. Adaptar los datos al formato de tu Base de Datos
        // Convertimos 'Confirmada' -> 'CONFIRMADA' para el ENUM de MySQL
        const estadoBD = estado ? estado.toUpperCase() : 'CONFIRMADA';

        // Convertimos 'Sí'/'No' a 1 o 0 para la columna es_cumpleanos (TINYINT/BOOLEAN)
        const esCumpleanosBD = (cumpleanos === 'Sí' || cumpleanos === true) ? 1 : 0;

        // Si es terraza, el piso va como null, sino agarra el piso enviado o por defecto 1
        const pisoBD = tipoMesa === 'Terraza' ? null : (piso || 1);

        // 3. Consulta SQL usando los mismos nombres de columna que vimos en tu GET
        const query = `
            INSERT INTO reservas 
            (fecha_reserva, hora_reserva, num_comensales, tipo_zona, piso, numero_mesa, es_cumpleanos, estado_actual, nombre_cliente, telefono) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Ejecutamos la inserción pasando el arreglo de valores en orden
        const [result] = await db.query(query, [
            fecha,
            hora,
            personas,
            tipoMesa,
            pisoBD,
            mesa,
            esCumpleanosBD,
            estadoBD,
            cliente.nombre,
            cliente.telefono
        ]);

        // 4. Formateamos el ID generado (Ej: si se insertó el id 4, devolvemos "R-004")
        // Esto es vital para que tu "alert" del frontend no se rompa al leer data.reserva?.id
        const codigoEstetico = `R-${String(result.insertId).padStart(3, '0')}`;

        // Respondemos con éxito al cliente
        res.status(201).json({
            ok: true,
            mensaje: "Reserva registrada con éxito en MySQL",
            reserva: { id: codigoEstetico }
        });

    } catch (error) {
        console.error("Error crítico al insertar la reserva:", error);
        res.status(500).json({ ok: false, error: "Error interno al guardar la reserva en la base de datos" });
    }
});

// Iniciamos el servidor
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(` Surf activo en: http://localhost:${PORT} 🐟🔥`);
    console.log(` SQL vinculando directamente a Railway de forma real.`);
    console.log(`==================================================\n`);
});