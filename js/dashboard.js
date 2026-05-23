document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('tableBody');

    // Eventos para activar los filtros en tiempo real
    document.getElementById('inputBuscar').addEventListener('input', renderTable);
    document.getElementById('inputFecha').addEventListener('change', renderTable);
    document.getElementById('selectEstado').addEventListener('change', renderTable);

    // Arreglo en memoria del frontend que sincronizaremos con el servidor
    let listaReservas = [];

    // 1. Función para consultar las reservas al servidor de Node.js
    function cargarReservasDesdeServidor() {
        fetch('/api/reservas')
            .then(response => response.json())
            .then(data => {
                listaReservas = data; // Guardamos las reservas reales
                renderTable();        // Pintamos la tabla
                actualizarTarjetasMetricas(); // Bonus: Actualiza los contadores de arriba automáticamente
            })
            .catch(err => console.error('Error al solicitar datos al backend:', err));
    }

    // 2. Función principal para renderizar la tabla con filtros en tiempo real
    function renderTable() {
        tableBody.innerHTML = '';

        // Capturamos los valores actuales de los filtros
        const textoBusqueda = document.getElementById('inputBuscar').value.toLowerCase();
        const fechaFiltro = document.getElementById('inputFecha').value;
        const estadoFiltro = document.getElementById('selectEstado').value;

        // Monitoreo de Filtros
        console.log("--- Monitoreo de Filtros ---");
        console.log("Texto que escribiste:", textoBusqueda);
        console.log("Fecha seleccionada en el input:", fechaFiltro);
        console.log("Estado seleccionado:", estadoFiltro);

        for (let i = 0; i < listaReservas.length; i++) {
            const reserva = listaReservas[i];

            // 1. Filtro de Texto (Buscador apunta directamente a .nombre)
            const coincideTexto = reserva.cliente.nombre.toLowerCase().includes(textoBusqueda) ||
                reserva.id.toLowerCase().includes(textoBusqueda);

            // 2. Filtro de Estado 
            const coincideEstado = (estadoFiltro === 'Todos los estados' || estadoFiltro === '') ||
                reserva.estado === estadoFiltro;

            // 3. Filtro de Fecha
            const coincideFecha = !fechaFiltro || reserva.fecha === fechaFiltro;

            // EVALUACIÓN FINAL: Solo si cumple las 3 condiciones entra a la tabla
            if (coincideTexto && coincideEstado && coincideFecha) {

                // Construcción de los botones de acción si está Pendiente
                let actionIconsHTML = '';
                if (reserva.estado === 'Pendiente') {
                    actionIconsHTML = `
                    <button class="action-btn icon-check" onclick="cambiarEstadoReserva('${reserva.id}', 'Confirmada')" title="Confirmar"><i class="bi bi-check2"></i></button>
                    <button class="action-btn icon-cancel" onclick="cambiarEstadoReserva('${reserva.id}', 'Cancelada')" title="Cancelar"><i class="bi bi-x"></i></button>`;
                }

                // HTML real de la fila estructurada
                const rowHTML = `
                <tr class="ps-3 pe-3">
                    <th scope="row" class="ps-3 small text-muted font-monospace">${reserva.id}</th>
                    <td class="small fw-semibold">
                        ${reserva.cliente.nombre}<br>
                        <span class="text-muted extra-small">${reserva.cliente.telefono}</span>
                    </td>
                    <td class="small">${formatearFecha(reserva.fecha)}</td>
                    <td class="small">${reserva.hora}</td>
                    <td class="small ps-4 fw-medium text-dark">${reserva.personas}</td>
                    <td>
                        ${getStatusBadgeHTML(reserva.estado)}
                    </td>
                    <td class="text-end pe-3 align-middle">
                        <div class="d-inline-flex align-items-center justify-content-end gap-2">
                            <button class="action-btn btn-ver" onclick="verDetallesReserva('${reserva.id}')" title="Ver detalles">
                                <i class="bi bi-eye"></i> Ver
                            </button>
                            ${actionIconsHTML}
                        </div>
                    </td>
                </tr>
                `;

                tableBody.insertAdjacentHTML('beforeend', rowHTML);
            }
        }
    }

    // 3. Helper para generar los badges tal cual tus estilos CSS
    function getStatusBadgeHTML(estado) {
        if (estado === 'Confirmada') {
            return `<span class="badge-status confirmed"><i class="bi bi-check-circle-fill extra-small"></i> ${estado}</span>`;
        } else if (estado === 'Pendiente') {
            return `<span class="badge-status pending"><i class="bi bi-clock-history extra-small"></i> ${estado}</span>`;
        } else if (estado === 'Cancelada') {
            return `<span class="badge-status cancelled"><i class="bi bi-x-circle-fill extra-small"></i> ${estado}</span>`;
        }
        return estado;
    }

    // 4. Sincronizar dinámicamente los contadores superiores del Dashboard
    function actualizarTarjetasMetricas() {
        const total = listaReservas.length;
        const pendientes = listaReservas.filter(r => r.estado === 'Pendiente').length;
        const confirmadas = listaReservas.filter(r => r.estado === 'Confirmada').length;

        // Sumamos el número de personas de las reservas que ya están CONFIRMADAS
        const comensales = listaReservas
            .filter(r => r.estado === 'Confirmada')
            .reduce((sum, r) => sum + r.personas, 0);

        // Buscamos los elementos en el HTML y les asignamos el valor real
        const elTotal = document.getElementById('txtTotalReservas');
        const elPendientes = document.getElementById('txtPendientes');
        const elConfirmadas = document.getElementById('txtConfirmadas');
        const elComensales = document.getElementById('txtComensales');

        if (elTotal) elTotal.innerText = total;
        if (elPendientes) elPendientes.innerText = pendientes;
        if (elConfirmadas) elConfirmadas.innerText = confirmadas;
        if (elComensales) elComensales.innerText = comensales;
    }

    // 5. Función global para actualizar estados mediante peticiones PATCH hacia Node.js
    window.cambiarEstadoReserva = async function (id, nuevoEstado) {
        try {
            // 1. Enviamos el nuevo estado al backend de Node.js
            const respuesta = await fetch(`/api/reservas/${id}/estado`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            // Si el servidor responde con un error, detenemos el proceso
            if (!respuesta.ok) {
                throw new Error('No se pudo actualizar el estado en el servidor.');
            }

            // 2. Si el servidor respondió OK, actualizamos nuestro arreglo local
            const reserva = listaReservas.find(r => r.id === id); //
            if (reserva) {
                reserva.estado = nuevoEstado;

                // 3. Volvemos a pintar la tabla y los contadores (KPIs) para reflejar el cambio
                renderTable(listaReservas); //
                if (typeof actualizarKPIs === 'function') {
                    actualizarKPIs();
                }
            }

            console.log(`Estado de la reserva ${id} cambiado a ${nuevoEstado} exitosamente.`);

        } catch (error) {
            console.error('Error al actualizar:', error);
            alert('Hubo un problema de conexión. El estado no se guardó.');
        }
    };

    // 6. Arrancar la primera carga de datos reales del backend
    cargarReservasDesdeServidor();

    window.verDetallesReserva = function (id) {
        // Ahora sí tiene acceso total a listaReservas porque están en la misma "habitación"
        const reserva = listaReservas.find(r => r.id === id);

        if (!reserva) {
            console.error("No se encontró la reserva con ID:", id);
            return;
        }

        // Inyectar los datos en el modal
        document.getElementById('modalDetalleId').innerText = reserva.id;
        document.getElementById('modalDetalleCliente').innerText = reserva.cliente?.nombre || reserva.nombre || '-';
        document.getElementById('modalDetalleTelefono').innerText = reserva.cliente?.telefono || reserva.telefono || '-';
        document.getElementById('modalDetalleFecha').innerText = reserva.fecha;
        document.getElementById('modalDetalleHora').innerText = reserva.hora;
        document.getElementById('modalDetallePersonas').innerText = reserva.personas;

        if (typeof getStatusBadgeHTML === 'function') {
            document.getElementById('modalDetalleEstado').innerHTML = getStatusBadgeHTML(reserva.estado);
        } else {
            document.getElementById('modalDetalleEstado').innerText = reserva.estado;
        }

        // Mostrar el modal de Bootstrap
        const elModal = document.getElementById('modalDetalleReserva');
        const miModal = new bootstrap.Modal(elModal);
        miModal.show();
    };
});

// 5.2 Función global para levantar el modal con la info completa de la reserva
window.verDetallesReserva = function (id) {
    // Buscamos la reserva seleccionada en nuestro arreglo en memoria
    const reserva = listaReservas.find(r => r.id === id);

    if (!reserva) {
        console.error("No se encontró la reserva con ID:", id);
        return;
    }

    // Inyectamos los datos reales en los contenedores del modal
    document.getElementById('modalDetalleId').innerText = reserva.id;
    document.getElementById('modalDetalleCliente').innerText = reserva.cliente.nombre;
    document.getElementById('modalDetalleTelefono').innerText = reserva.cliente.telefono;
    document.getElementById('modalDetalleFecha').innerText = formatearFecha(reserva.fecha);
    document.getElementById('modalDetalleHora').innerText = reserva.hora;
    document.getElementById('modalDetallePersonas').innerText = reserva.personas;

    // Reutilizamos tu helper de badges para mantener los colores de los estados
    document.getElementById('modalDetalleEstado').innerHTML = getStatusBadgeHTML(reserva.estado);

    // Inicializamos y mostramos el modal de Bootstrap de forma programática
    const elModal = document.getElementById('modalDetalleReserva');
    const miModal = new bootstrap.Modal(elModal);
    miModal.show();
};

function formatearFecha(fechaISO) {
    // fechaISO viene como "2026-05-15"
    const partes = fechaISO.split('-');
    if (partes.length !== 3) return fechaISO; // Por si viene un formato extraño

    const anio = partes[0];
    const mesNum = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);

    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
    const mesTexto = meses[mesNum] || '';

    return `${dia} ${mesTexto} ${anio}`;
}   