require('dotenv').config(); // Carga las variables de entorno desde el archivo .env
const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const db = require('./conexion'); // Importamos la conexión a la base de datos
const path = require('path');
const PDFDocument = require('pdfkit'); // 1. IMPORTAMOS PDFKIT
const app = express();

// Railway inyecta su propio puerto. Si no existe, usa 3000 localmente.
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
// ENDPOINT 1: CREAR RESERVA (POST) -> Guarda en MySQL y Auto-Descarga PDF
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
        console.log(`==================================================\n`);

        // =========================================================================
        // GENERACIÓN DEL PDF CON PDFKIT DIRECTO AL FLUJO DE RESPUESTA HTTP (res)
        // =========================================================================
        
        // 2. Modificamos las cabeceras HTTP de respuesta para forzar la descarga de un PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Boleta_Reserva_${codigoEstetico}.pdf"`);

        // 3. Inicializamos el documento PDF con tamaño adecuado para un ticket/boleta pequeña (A6)
        const doc = new PDFDocument({ size: 'A6', margin: 15 });
        
        // Tubería del documento directo al stream de la respuesta express
        doc.pipe(res);

        // Borde exterior para la boleta
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const pageHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
        doc.lineWidth(0.8).strokeColor('#cfd8e3').rect(8, 8, pageWidth - 4, pageHeight - 4).stroke();

        // Cabecera profesional con logo
        const logoPath = path.join(__dirname, 'assets', 'img', 'Logo_Pr.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 18, 18, { fit: [48, 48] });
        }
        doc.fillColor('#0b5394').font('Helvetica-Bold').fontSize(14).text('EL GRAN PEZ', 75, 22, { continued: false });
        doc.font('Helvetica').fontSize(8).fillColor('#555555').text('Cevichería y Marisquería', 75, 38);
        doc.font('Helvetica').fontSize(7).fillColor('#555555').text('Lima, Perú • +51 999 888 777', 75, 50);

        const fechaEmision = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        doc.fillColor('#0b5394').font('Helvetica-Bold').fontSize(10).text('BOLETA DE RESERVA', 18, 76);
        doc.fillColor('#0b5394').font('Helvetica').fontSize(7).text(`Emisión: ${fechaEmision}`, 18, 88);
        doc.fillColor('#0b5394').font('Helvetica').fontSize(7).text(`Estado: PENDIENTE`, 120, 88);

        doc.fillColor('#0b5394').lineWidth(1).moveTo(18, 100).lineTo(278, 100).stroke();

        // Datos de la reserva
        let currentY = 108;
        const boxWidth = 260;
        doc.roundedRect(18, currentY, boxWidth, 60, 8).fill('#ffffff').stroke('#b9d4f2').lineWidth(0.8);
        doc.fillColor('#0b5394').font('Helvetica-Bold').fontSize(8).text('Información del cliente', 26, currentY + 6);
        doc.fillColor('#333333').font('Helvetica').fontSize(8).text(`Código: ${codigoEstetico}`, 26, currentY + 18);
        doc.text(`Cliente: ${nombre}`, 26, currentY + 26);
        doc.text(`Tel: ${telefono}`, 26, currentY + 34);
        doc.text(`Email: ${email}`, 26, currentY + 42);

        currentY += 72;
        doc.roundedRect(18, currentY, boxWidth, 60, 8).fill('#f7fbff').stroke('#b9d4f2').lineWidth(0.8);
        doc.fillColor('#0b5394').font('Helvetica-Bold').fontSize(8).text('Detalles de la reserva', 26, currentY + 6);
        doc.fillColor('#333333').font('Helvetica').fontSize(8).text(`Fecha: ${fecha}`, 26, currentY + 18);
        doc.text(`Hora: ${hora}`, 26, currentY + 26);
        if (tipoMesa === 'Terraza') {
            doc.text(`Zona: Terraza Exclusiva`, 26, currentY + 34);
            doc.text(`Comensales: 16 personas`, 26, currentY + 42);
        } else {
            doc.text(`Zona: Salón - Piso ${pisoBD}`, 26, currentY + 34);
            doc.text(`Mesa: N° ${numeroMesaBD}`, 26, currentY + 42);
        }
        doc.text(`Cumpleaños: ${esCumpleanosBD === 1 ? 'Sí 🎉' : 'No'}`, 26, currentY + 50);

        currentY += 72;
        const paymentHeight = 145;
        doc.roundedRect(18, currentY, boxWidth, paymentHeight, 10).fill('#e8f4ff').stroke('#b9d4f2').lineWidth(0.8);
        doc.fillColor('#0b5394').font('Helvetica-Bold').fontSize(8).text('Información de pago', 26, currentY + 8);
        doc.fillColor('#000000').font('Helvetica').fontSize(7).text('Escanea el QR o paga por Yape / Plin al nombre:', 26, currentY + 20, { width: 130, lineGap: 1 });
        doc.font('Helvetica-Bold').text('El Gran Pez', 26, currentY + 38, { width: 130 });
        doc.font('Helvetica').text('Número: +51 999 888 777', 26, currentY + 46, { width: 130 });
        doc.text('Transferencia bancaria:', 26, currentY + 56, { width: 130 });
        doc.font('Helvetica-Bold').text('BCP: 123456789', 26, currentY + 66, { width: 130 });
        doc.font('Helvetica-Bold').text('Interbank: 987654321', 26, currentY + 74, { width: 130 });
        doc.font('Helvetica-Bold').text('Plin: 999 888 777', 26, currentY + 82, { width: 130 });
        doc.font('Helvetica').fontSize(7).text('Verifica el nombre de cuenta antes de confirmar el pago.', 26, currentY + 92, { width: 130 });

        const qrImagePath = path.join(__dirname, 'assets', 'img', 'qr-yape.PNG');
        if (fs.existsSync(qrImagePath)) {
            doc.image(qrImagePath, 165, currentY + 20, { fit: [75, 75] });
        }
        doc.end();

    } catch (error) {
        console.error('Error al insertar reserva en la BD u obtener PDF:', error);
        // Si hay un error previo a enviar las cabeceras, respondemos en JSON
        if (!res.headersSent) {
            res.status(500).json({ ok: false, error: 'Error interno del servidor al resguardar la reserva.' });
        }
    }
});

// =========================================================================
// ENDPOINT 2: LISTAR RESERVAS (GET)
// =========================================================================
app.get('/api/reservas', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM reservas ORDER BY id DESC');

        const reservasMapeadas = rows.map(row => {
            const horaFormateada = row.hora_reserva ? String(row.hora_reserva).substring(0, 5) : "12:00";
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
// ENDPOINTS 3 Y 4: ACTUALIZAR ESTADO (PUT)
// =========================================================================
app.put('/api/reservas/:id/estado', async (req, res) => {
    try {
        const { id } = req.params; 
        const { estado } = req.body; 

        const idNumerico = parseInt(id.replace('R-', ''), 10);
        const estadoBD = estado.toUpperCase(); 

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