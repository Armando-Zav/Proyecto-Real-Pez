const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// 1. Inicializamos tu servidor con tus 10 registros reales de la captura
let baseDatosTemporalReservas = [
    { id: 'R-001', fecha: '2026-05-15', hora: '13:00', personas: 4, estado: 'Confirmada', tipoMesa: 'Normal', piso: 1, mesa: '4', cliente: { nombre: 'Mariela Torres', telefono: '+51 987 654 321' } },
    { id: 'R-002', fecha: '2026-05-15', hora: '14:30', personas: 2, estado: 'Pendiente', tipoMesa: 'Normal', piso: 1, mesa: '2', cliente: { nombre: 'Carlos Quispe', telefono: '+51 976 543 210' } },
    { id: 'R-003', fecha: '2026-05-16', hora: '12:00', personas: 6, estado: 'Pendiente', tipoMesa: 'Normal', piso: 1, mesa: '9', cliente: { nombre: 'Lucía Mendoza', telefono: '+51 965 432 109' } },
    { id: 'R-004', fecha: '2026-05-16', hora: '13:30', personas: 3, estado: 'Confirmada', tipoMesa: 'Normal', piso: 1, mesa: '3', cliente: { nombre: 'Rodrigo Salinas', telefono: '+51 954 321 098' } },
    { id: 'R-005', fecha: '2026-05-17', hora: '19:00', personas: 2, estado: 'Cancelada', tipoMesa: 'Normal', piso: 1, mesa: '1', cliente: { nombre: 'Ana Velásquez', telefono: '+51 943 210 987' } },
    { id: 'R-006', fecha: '2026-05-17', hora: '20:00', personas: 5, estado: 'Pendiente', tipoMesa: 'Normal', piso: 1, mesa: '5', cliente: { nombre: 'Jorge Paredes', telefono: '+51 932 109 876' } },
    { id: 'R-007', fecha: '2026-05-18', hora: '13:00', personas: 4, estado: 'Confirmada', tipoMesa: 'Normal', piso: 1, mesa: '8', cliente: { nombre: 'Sofía Cárdenas', telefono: '+51 921 098 765' } },
    { id: 'R-008', fecha: '2026-05-18', hora: '14:00', personas: 8, estado: 'Pendiente', tipoMesa: 'Normal', piso: 1, mesa: '13', cliente: { nombre: 'Miguel Flores', telefono: '+51 910 987 654' } },
    { id: 'R-009', fecha: '2026-05-19', hora: '12:30', personas: 2, estado: 'Confirmada', tipoMesa: 'Normal', piso: 1, mesa: '2', cliente: { nombre: 'Patricia Huanca', telefono: '+51 999 888 777' } },
    { id: 'R-010', fecha: '2026-05-19', hora: '19:30', personas: 3, estado: 'Cancelada', tipoMesa: 'Normal', piso: 1, mesa: '3', cliente: { nombre: 'Daniel Chávez', telefono: '+51 888 777 666' } }
];

// Middleware para entender formatos JSON
app.use(express.json());

// Servir los archivos estáticos (tu HTML, CSS y JS actuales) directamente desde la raíz
app.use(express.static(path.join(__dirname, './')));

// Ruta principal: Cuando entren a http://localhost:3000 cargará tu index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciamos el servidor
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(` Surf activo en: http://localhost:${PORT} 🐟🔥`);
    console.log(`==================================================\n`);
});

// ENDPOINT: Recibir y procesar la reserva de la cebichería
app.post('/api/reservas', (req, res) => {
    try {
        const cuerpo = req.body;

        // Estructuramos el nuevo registro usando los datos del frontend
        const nuevaReserva = {
            id: `R-00${baseDatosTemporalReservas.length + 1}`, // ID Auto-generado dinámico
            fecha: cuerpo.fecha,
            hora: cuerpo.hora,
            tipoMesa: cuerpo.tipoMesa,
            cumpleanos: cuerpo.cumpleanos,
            personas: cuerpo.tipoMesa === 'Terraza' ? 16 : cuerpo.personas,
            piso: cuerpo.piso,
            mesa: cuerpo.mesa,
            estado: 'Pendiente', // Por defecto entra para revisión del administrador
            cliente: {
                nombre: cuerpo.cliente.nombre,
                telefono: cuerpo.cliente.telefono,
                email: cuerpo.cliente.email,
                comentarios: cuerpo.cliente.comentarios
            }
        };

        // Guardamos el registro en nuestro arreglo local
        baseDatosTemporalReservas.push(nuevaReserva);

        // Log en la consola de Node para verificar en tiempo real que los datos ingresaron
        console.log(`\n==================================================`);
        console.log(`🐟 ¡Nueva Reserva Recibida Exitosamente!`);
        console.log(`Cliente: ${nuevaReserva.cliente.nombre}`);
        console.log(`Mesa/Zona: ${nuevaReserva.mesa} (${nuevaReserva.tipoMesa})`);
        console.log(`==================================================\n`);

        // Respondemos con estatus HTTP 201 (Creado) enviando el objeto de confirmación
        res.status(201).json({
            mensaje: 'Reserva procesada correctamente.',
            reserva: nuevaReserva
        });

    } catch (error) {
        console.error('Error al procesar reserva:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al resguardar la reserva.' });
    }
});

// ENDPOINT SECUNDARIO: Para que el Dashboard pueda consultar la lista actualizada
app.get('/api/reservas', (req, res) => {
    res.json(baseDatosTemporalReservas);
});

app.put('/api/reservas/:id/estado', (req, res) => {
    const { id } = req.params;          // Capturamos el ID de la URL (ej: R-001)
    const { estado } = req.body;      // Capturamos el nuevo estado enviado en el cuerpo

    // Buscamos la reserva dentro de tu arreglo temporal
    const reserva = baseDatosTemporalReservas.find(r => r.id === id); //

    if (!reserva) {
        return res.status(404).json({
            success: false,
            mensaje: `No se encontró ninguna reserva con el ID: ${id}`
        });
    }

    // Modificamos el estado en el servidor
    reserva.estado = estado;

    console.log(`[Servidor] Reserva ${id} modificada a estado: ${estado}`);

    // Respondemos con éxito
    res.json({
        success: true,
        mensaje: 'Estado actualizado correctamente en el servidor.',
        reserva
    });
});

app.patch('/api/reservas/:id', (req, res) => {
    const { id } = req.params;
    const { nuevoEstado } = req.body; // Recibe 'Confirmada' o 'Cancelada'

    const reserva = baseDatosTemporalReservas.find(r => r.id === id);

    if (reserva) {
        reserva.estado = nuevoEstado;
        console.log(`[Actualización] Reserva ${id} cambió a: ${nuevoEstado}`);
        res.json({ exito: true, reserva });
    } else {
        res.status(404).json({ exito: false, mensaje: 'Reserva no encontrada' });
    }
});