require('dotenv').config(); // Carga las variables de entorno desde el archivo .env
const express = require('express');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');
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

// Configurar transportador de correo usando variables de entorno
function createTransporter() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587; // 587 por defecto si falla
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        console.warn('⚠️ SMTP no configurado completamente. Los emails no serán enviados. Revisa .env o Railway Variables.');
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // Solo true si es explícitamente 465
        auth: {
            user,
            pass
        },
        tls: {
            // Esto evita que el envío falle si hay discrepancias con los certificados del servidor virtual
            rejectUnauthorized: false
        }
    });
}

const transporter = createTransporter();

async function sendReservaEmail({ to, nombre, telefono, fecha, hora, personas, mesa, tipoMesa, codigo }) {
    if (!transporter) return;

    const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const asunto = `Confirmación de reserva ${codigo} - El Gran Pez`;
    const html = `
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Gracias por reservar en <strong>El Gran Pez</strong>. Aquí tienes el resumen de tu reserva:</p>
        <ul>
            <li><strong>Código de reserva:</strong> ${codigo}</li>
            <li><strong>Fecha:</strong> ${fecha}</li>
            <li><strong>Hora:</strong> ${hora}</li>
            <li><strong>Personas:</strong> ${personas}</li>
            <li><strong>Mesa:</strong> ${mesa || 'N/A'}</li>
            <li><strong>Tipo de mesa:</strong> ${tipoMesa}</li>
            <li><strong>Teléfono:</strong> ${telefono}</li>
        </ul>
        <p><strong>Importante:</strong> Debes pagar anticipadamente para completar la reserva.</p>
        <p><em>Nota:</em> Esta reserva es una <strong>prueba</strong> y no corresponde a una reserva real.</p>
        <p>Si tienes alguna duda, responde a este correo o contáctanos vía WhatsApp.</p>
        <p>Saludos,<br>El Gran Pez</p>
    `;

    try {
        await transporter.sendMail({ from, to, subject: asunto, html });
        console.log(`Correo de confirmación enviado a ${to}`);
    } catch (err) {
        console.error('Error enviando email de confirmación:', err);
    }
}

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
        // Enviar correo de confirmación en segundo plano (no bloquea la respuesta)
        sendReservaEmail({
            to: email,
            nombre,
            telefono,
            fecha,
            hora,
            personas: personasBD,
            mesa: numeroMesaBD,
            tipoMesa,
            codigo: codigoEstetico
        }).catch(err => console.error('Error en envío de correo (no crítico):', err));

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