document.addEventListener('DOMContentLoaded', () => {

    const inputBusqueda = document.getElementById('inputBusqueda');
    const inputFecha = document.getElementById('inputFecha');
    const selectEstado = document.getElementById('selectEstado'); // 👈 Tu ID exacto

    // Asignamos los eventos de escucha
    if (inputBusqueda && inputFecha && selectEstado) {
        inputBusqueda.addEventListener('input', filtrarYRenderizar);
        inputFecha.addEventListener('change', filtrarYRenderizar);
        selectEstado.addEventListener('change', filtrarYRenderizar);
    }
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
    // 2. Función principal para renderizar la tabla con filtros en tiempo real
    function renderTable() {
        tableBody.innerHTML = '';

        // Capturamos los valores actuales de los filtros
        const textoBusqueda = document.getElementById('inputBuscar').value.toLowerCase();
        const fechaFiltro = document.getElementById('inputFecha').value;
        const estadoFiltro = document.getElementById('selectEstado').value; // Guardará "1", "2", "3" o "Todos los estados"

        // Monitoreo de Filtros en Consola
        console.log("--- Monitoreo de Filtros ---");
        console.log("Texto que escribiste:", textoBusqueda);
        console.log("Fecha seleccionada en el input:", fechaFiltro);
        console.log("Estado seleccionado (Value):", estadoFiltro);

        for (let i = 0; i < listaReservas.length; i++) {
            const reserva = listaReservas[i];

            // 1. Filtro de Texto (Apunta a nombre e ID de la reserva)
            const coincideTexto = reserva.cliente.nombre.toLowerCase().includes(textoBusqueda) ||
                reserva.id.toLowerCase().includes(textoBusqueda);

            // 2. 🌟 TRADUCCIÓN MÁGICA DE TUS VALUES (1, 2, 3)
            let coincideEstado = false;

            if (estadoFiltro === 'Todos los estados' || estadoFiltro === '') {
                coincideEstado = true; // Si elige el primero, pasan todos
            } else if (estadoFiltro === '1' && reserva.estado === 'Confirmada') {
                coincideEstado = true;
            } else if (estadoFiltro === '2' && reserva.estado === 'Pendiente') {
                coincideEstado = true;
            } else if (estadoFiltro === '3' && reserva.estado === 'Cancelada') {
                coincideEstado = true;
            }

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

                // HTML real de la fila estructurada tal como la tenías
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
        // Buscamos la reserva seleccionada en el arreglo local
        const reserva = listaReservas.find(r => r.id === id);
        if (!reserva) {
            console.error("No se encontró la reserva con ID:", id);
            return;
        }

        // 1. Rellenar los datos básicos que ya tenías
        document.getElementById('modalDetalleId').innerText = reserva.id;
        document.getElementById('modalDetalleCliente').innerText = reserva.cliente?.nombre || 'Sin nombre';
        document.getElementById('modalDetalleTelefono').innerText = reserva.cliente?.telefono || 'Sin teléfono';
        document.getElementById('modalDetalleFecha').innerText = typeof formatearFecha === 'function' ? formatearFecha(reserva.fecha) : reserva.fecha;
        document.getElementById('modalDetalleHora').innerText = reserva.hora;
        document.getElementById('modalDetallePersonas').innerText = reserva.personas;
        document.getElementById('modalDetalleEstado').innerHTML = typeof getStatusBadgeHTML === 'function' ? getStatusBadgeHTML(reserva.estado) : reserva.estado;

        // 2. LÓGICA CONDICIONAL: Tipo de Mesa (Zona) y Piso
        const tipo = reserva.tipoMesa || 'Normal';
        const txtTipoMesa = document.getElementById('modalDetalleTipoMesa');
        const filaPiso = document.getElementById('filaModalPiso');
        const txtPiso = document.getElementById('modalDetallePiso');

        if (tipo === 'Terraza') {
            txtTipoMesa.innerHTML = `<span class="badge bg-info text-dark"><i class="bi bi-tree-fill me-1"></i> Terraza</span>`;
            // Si es Terraza, ocultamos por completo la fila del piso
            filaPiso.classList.add('d-none');
        } else {
            txtTipoMesa.innerHTML = `<span class="badge bg-secondary text-white"><i class="bi bi-house-door-fill me-1"></i> Mesa Normal</span>`;
            // Si es Mesa Normal, aseguramos que la fila sea visible
            filaPiso.classList.remove('d-none');
            // Renderizamos el piso correspondiente
            txtPiso.innerText = reserva.piso ? `Piso ${reserva.piso}` : 'Piso 1';
        }

        // 3. NÚMERO DE MESA (Soporta número limpio o texto)
        const nroMesa = reserva.mesa || reserva.numeroMesa || 'N/A';
        const txtNumeroMesa = document.getElementById('modalDetalleNumeroMesa');

        if (!isNaN(nroMesa) && nroMesa !== 'N/A') {
            txtNumeroMesa.innerHTML = `<span class="text-primary fw-bold">#${nroMesa}</span>`;
        } else {
            txtNumeroMesa.innerHTML = `<span class="text-primary fw-bold">${nroMesa}</span>`;
        }

        // 4. DETECTAR CUMPLEAÑOS (Badge rojo destacado)
        const txtCumpleanos = document.getElementById('modalDetalleCumpleanos');
        const esCumple = (reserva.cumpleanos === 'Sí' || reserva.cumpleanos === true || reserva.esCumpleanos === true);

        if (esCumple) {
            txtCumpleanos.innerHTML = `<span class="badge bg-danger text-white"><i class="bi bi-cake2-fill me-1"></i> ¡Sí, es un Cumpleaños!</span>`;
        } else {
            txtCumpleanos.innerHTML = `<span class="badge bg-light text-muted border">No</span>`;
        }

        // 5. Mostrar limpiamente el modal de Bootstrap
        const modalElement = document.getElementById('modalDetalleReserva');
        const miModal = new bootstrap.Modal(modalElement);
        miModal.show();
    };

    /* Reserva manual desde el Admin */

    // 1. Mostrar/Ocultar el campo "Piso" condicionalmente en el formulario de registro
    const regTipoMesa = document.getElementById('regTipoMesa');
    const filaPisoMesa = document.getElementById('filaPisoMesa'); // 👈 Controla toda la fila (Piso y Mesa)
    const regMesa = document.getElementById('regMesa');           // 👈 Controla el input de mesa
    const regPersonas = document.getElementById('regPersonas');
    const personasHelp = document.getElementById('personasHelp');

    if (regTipoMesa && filaPisoMesa && regMesa && regPersonas) {
        regTipoMesa.addEventListener('change', () => {

            if (regTipoMesa.value === 'Terraza') {
                // 🌴 REGLAS PARA TERRAZA
                filaPisoMesa.classList.add('d-none');    // Oculta la fila de Piso y Mesa por completo
                regMesa.removeAttribute('required');     // 🔴 CRÍTICO: Quita el "obligatorio" para que deje guardar
                regMesa.value = 'Terraza Completa';      // Texto automático que se enviará a tu base de datos

                regPersonas.max = 22;                    // Límite de la terraza
                if (personasHelp) {
                    personasHelp.textContent = 'Máx. 22 personas para Terraza (Espacio Privado)';
                }

            } else {
                // 🪑 REGLAS PARA MESA NORMAL
                filaPisoMesa.classList.remove('d-none'); // Vuelve a mostrar Piso y Mesa
                regMesa.setAttribute('required', '');    // 🟢 Vuelve a exigir que digiten la mesa
                regMesa.value = '';                      // Limpia el campo para que el Admin escriba

                regPersonas.max = 10;                    // Límite de mesa normal
                if (personasHelp) {
                    personasHelp.textContent = 'Máx. 10 personas para Mesa Normal';
                }

                // Si excedía el límite de 10 al cambiar, lo reseteamos a 10
                if (parseInt(regPersonas.value) > 10) {
                    regPersonas.value = 10;
                }
            }
        });
    }

    // 2. Capturar el envío del Formulario Manual
    const formNuevaReserva = document.getElementById('formNuevaReserva');
    if (formNuevaReserva) {
        formNuevaReserva.addEventListener('submit', function (e) {
            e.preventDefault(); // Evita que la página se recargue

            // Armamos el objeto con la misma estructura exacta que espera tu servidor Node
            const nuevaReserva = {
                fecha: document.getElementById('regFecha').value,
                hora: document.getElementById('regHora').value,
                personas: parseInt(document.getElementById('regPersonas').value),
                tipoMesa: document.getElementById('regTipoMesa').value,
                piso: document.getElementById('regTipoMesa').value === 'Terraza' ? null : document.getElementById('regPiso').value,
                mesa: document.getElementById('regMesa').value,
                cumpleanos: document.getElementById('regCumpleanos').checked ? 'Sí' : 'No',
                estado: 'Confirmada', // Al ser manual por el Admin, entra directamente como Confirmada
                cliente: {
                    nombre: document.getElementById('regNombre').value,
                    telefono: document.getElementById('regTelefono').value
                }
            };

            // Enviamos los datos mediante un POST a tu API de Node.js
            fetch('/api/reservas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(nuevaReserva)
            })
                .then(response => {
                    if (!response.ok) throw new Error('Error en la inserción del servidor');
                    return response.json();
                })
                .then(data => {
                    console.log('Reserva manual guardada con éxito:', data);

                    // Alertas nativas de Bootstrap o recarga limpia del arreglo local
                    alert(`¡Reserva creada con éxito! Código: ${data.reserva?.id || 'OK'}`);

                    // Limpiamos los campos del formulario
                    formNuevaReserva.reset();

                    // Cerramos el modal usando la API de Bootstrap 5
                    const modalElement = document.getElementById('modalNuevaReserva');
                    const modalInstancia = bootstrap.Modal.getInstance(modalElement);
                    if (modalInstancia) modalInstancia.hide();

                    // Refrescamos tus datos volviendo a llamar a tu función cargadora principal
                    if (typeof cargarReservas === 'function') {
                        cargarReservas();
                    } else if (typeof obtenerReservas === 'function') {
                        obtenerReservas();
                    } else {
                        // Si trabajas con recarga directa:
                        location.reload();
                    }
                })
                .catch(error => {
                    console.error('Error al registrar la reserva manual:', error);
                    alert('No se pudo guardar la reserva. Verifica que el servidor de Node.js esté corriendo.');
                });
        });
    }
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

function filtrarYRenderizar() {
    // 1. Leer los valores actuales de la pantalla
    const texto = document.getElementById('inputBusqueda').value.toLowerCase().trim();
    const fechaSeleccionada = document.getElementById('inputFecha').value;
    const valorEstado = document.getElementById('selectEstado').value; // Guardará "1", "2", "3" o "Todos los estados"

    // 2. Filtrar el arreglo principal
    const reservasFiltradas = listaReservas.filter(reserva => {

        // Regla A: Buscador por texto
        const coincideTexto = !texto ||
            reserva.cliente?.nombre?.toLowerCase().includes(texto) ||
            reserva.id.toString().includes(texto);

        // Regla B: Filtro por fecha
        const coincideFecha = !fechaSeleccionada || reserva.fecha === fechaSeleccionada;

        // Regla C: Traducción de tus valores numéricos (1, 2, 3)
        let coincideEstado = true; // Por defecto pasan todas (si elige "Todos los estados")

        if (valorEstado === "1") {
            // Filtra si el estado es el texto 'Confirmada' o el número 1
            coincideEstado = (reserva.estado === "Confirmada" || reserva.estado === 1 || reserva.estado === "1");
        } else if (valorEstado === "2") {
            // Filtra si el estado es el texto 'Pendiente' o el número 2
            coincideEstado = (reserva.estado === "Pendiente" || reserva.estado === 2 || reserva.estado === "2");
        } else if (valorEstado === "3") {
            // Filtra si el estado es el texto 'Cancelada' o el número 3
            coincideEstado = (reserva.estado === "Cancelada" || reserva.estado === 3 || reserva.estado === "3");
        }

        // Retorna la reserva solo si cumple las 3 condiciones
        return coincideTexto && coincideFecha && coincideEstado;
    });

    // 3. Volver a pintar la tabla con los datos limpios
    renderizarTabla(reservasFiltradas);
}