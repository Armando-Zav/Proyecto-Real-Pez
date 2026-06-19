let listaReservas = [];
document.addEventListener('DOMContentLoaded', () => {

    // Elementos clave del DOM
    const tableBody = document.getElementById('tableBody');
    const inputBuscar = document.getElementById('inputBuscar');
    const inputFecha = document.getElementById('inputFecha');
    const selectEstado = document.getElementById('selectEstado');

    // Asignamos los eventos de escucha en tiempo real para los filtros
    if (inputBuscar && inputFecha && selectEstado) {
        inputBuscar.addEventListener('input', renderTable);
        inputFecha.addEventListener('change', renderTable);
        selectEstado.addEventListener('change', renderTable);
    }

    // 2. Renderizar la tabla aplicando los filtros en tiempo real
    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        const textoBusqueda = inputBuscar.value.toLowerCase().trim();
        const fechaFiltro = inputFecha.value;
        const estadoFiltro = document.getElementById('selectEstado').value;

        let contadorResultados = 0;
        let htmlAcumulado = '';

        for (let i = 0; i < listaReservas.length; i++) {
            const reserva = listaReservas[i];

            // Mapeo de datos del cliente
            const nombreCliente = reserva.cliente && reserva.cliente.nombre ? reserva.cliente.nombre : '';
            const telfCliente = reserva.cliente && reserva.cliente.telefono ? reserva.cliente.telefono : '';

            // Captura de los nuevos campos desde el objeto (deben venir de MySQL)
            // Captura de los campos y lógica para separar Terraza de Mesas normales
            // Atrapamos el dato sin importar cómo lo haya mandado el backend
            const tipoZona = reserva.tipo_zona || reserva.tipo_mesa || reserva.tipoMesa || reserva.zona || '';
            const esCumple = reserva.cumpleanos === 1 || reserva.cumpleanos === true || reserva.cumpleanos === 'Sí';

            // Construimos el bloque HTML de la mesa dependiendo de si es terraza o no
            // Construimos el bloque HTML de la mesa dependiendo de si es terraza o no
            let infoMesaHTML = '';

            // 1. PRIMERO verificamos directamente si el tipoMesa del JSON es Terraza
            if (reserva.tipoMesa === 'Terraza' || reserva.tipoMesa === 'terraza' || tipoZona.toLowerCase() === 'terraza') {
                infoMesaHTML = `
                    <div class="fw-bold text-dark"><i class="bi bi-clouds-fill me-1 small text-info"></i>Terraza</div>
                    <div class="small text-muted text-capitalize">Área completa</div>
                `;
            }
            // 2. Si NO es terraza, verificamos si tiene un número de mesa asignado
            else if (reserva.mesa || reserva.numero_mesa) {
                const numMesa = reserva.mesa || reserva.numero_mesa;
                const textoPiso = reserva.piso ? ` - Piso ${reserva.piso}` : '';
                const zonaAsignada = tipoZona ? tipoZona : 'Normal';

                infoMesaHTML = `
                    <div class="fw-bold text-dark"><i class="bi bi-grid-3x3-gap me-1 small text-secondary"></i>Mesa ${numMesa}</div>
                    <div class="small text-muted text-capitalize">${zonaAsignada}${textoPiso}</div>
                `;
            }
            // 3. Si no es terraza y tampoco tiene mesa asignada (N/A real)
            else {
                infoMesaHTML = `
                    <div class="fw-bold text-dark"><i class="bi bi-grid-3x3-gap me-1 small text-secondary"></i>Mesa N/A</div>
                    <div class="small text-muted text-capitalize">(No asignada)</div>
                `;
            }

            // Filtros
            const coincideTexto = textoBusqueda === '' ||
                reserva.id.toLowerCase().includes(textoBusqueda) ||
                nombreCliente.toLowerCase().includes(textoBusqueda);
            const coincideEstadoFiltro = coincideEstado(reserva, estadoFiltro);
            const coincideFecha = fechaFiltro === '' || reserva.fecha === fechaFiltro;

            if (coincideTexto && coincideEstadoFiltro && coincideFecha) {
                contadorResultados++;

                // 🎂 Badge o Distintivo de Cumpleaños junto al nombre
                let cumpleBadgeHTML = '';
                if (esCumple) {
                    cumpleBadgeHTML = `<span class="badge bg-info text-dark ms-2" title="¡Celebra Cumpleaños!"><i class="bi bi-cake2-fill me-1"></i>Cumpleaños</span>`;
                }

                // Iconos de acción (Agregamos el botón de OJO para ver el resumen)
                let actionIconsHTML = `
                <button class="action-btn text-primary me-1" onclick="verResumenReserva('${reserva.id}')" title="Ver Resumen Completo">
                    <i class="bi bi-eye-fill"></i>
                </button>
            `;

                if (reserva.estado === 'Pendiente') {
                    actionIconsHTML += `
                    <button class="action-btn icon-check me-1" onclick="cambiarEstadoReserva('${reserva.id}', 'Confirmada')" title="Confirmar"><i class="bi bi-check2"></i></button>
                    <button class="action-btn icon-cancel" onclick="cambiarEstadoReserva('${reserva.id}', 'Cancelada')" title="Cancelar"><i class="bi bi-x"></i></button>
                `;
                }

                let badgeClass = 'bg-secondary';
                if (reserva.estado === 'Confirmada') badgeClass = 'bg-success';
                if (reserva.estado === 'Pendiente') badgeClass = 'bg-warning text-dark';
                if (reserva.estado === 'Cancelada') badgeClass = 'bg-danger';

                // Construcción de la fila única compacta
                htmlAcumulado += `
                <tr class="align-middle">
                    <th scope="row" class="ps-3 small text-muted font-monospace">${reserva.id}</th>
                    <td>
                        <div class="d-flex align-items-center fw-bold">
                            ${nombreCliente} ${cumpleBadgeHTML}
                        </div>
                        <div class="small text-muted">${telfCliente}</div>
                    </td>
                    <td class="text-nowrap fw-bold text-dark">${reserva.fecha}</td>
                    <td class="text-nowrap small text-muted">${reserva.hora}</td>
                    <td class="text-center font-monospace fw-bold">${reserva.personas}</td>
                    <td>
                        ${infoMesaHTML}
                    </td>
                    <td><span class="badge ${badgeClass}">${reserva.estado}</span></td>
                    <td class="text-end pe-3">${actionIconsHTML}</td>
                </tr>
            `;
            }
        }

        tableBody.innerHTML = htmlAcumulado;
        const txtResultados = document.querySelector('.result-count');
        if (txtResultados) txtResultados.textContent = `${contadorResultados} resultados`;
    }

    // Función auxiliar para filtrar las reservas en la barra de búsqueda
    function coincideTexto(reserva, terminoBusqueda) {
        if (!terminoBusqueda) return true; // Si no hay nada escrito, pasa el filtro

        const termino = terminoBusqueda.toLowerCase();
        const id = reserva.id ? reserva.id.toLowerCase() : '';
        const nombre = reserva.cliente?.nombre ? reserva.cliente.nombre.toLowerCase() : '';
        const telefono = reserva.cliente?.telefono ? reserva.cliente.telefono : '';

        // Retorna verdadero si coincide con el ID, el nombre o el teléfono
        return id.includes(termino) || nombre.includes(termino) || telefono.includes(termino);
    }

    // Función auxiliar para filtrar las reservas por su estado actual
    function coincideEstado(reserva, estadoSeleccionado) {
        if (!estadoSeleccionado) return true;

        // Convertimos a minúsculas y limpiamos espacios vacíos
        const seleccion = estadoSeleccionado.toLowerCase().trim();

        // Si el selector dice "todos", "todos lo...", o está vacío, pasa limpio sin filtrar
        if (seleccion === '' || seleccion === 'todos' || seleccion.includes('todo') || seleccion === 'all') {
            return true;
        }

        if (!reserva || !reserva.estado) return false;

        // Comparamos ambos en minúsculas para evitar fallos por formato
        return reserva.estado.toLowerCase().trim() === seleccion;
    }

    // 3. Helper para los estilos visuales de los estados
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

    // 4. Sincronizar las Tarjetas de Métricas (KPIs)
    function actualizarTarjetasMetricas() {
        const total = listaReservas.length;
        const pendientes = listaReservas.filter(r => r.estado === 'Pendiente').length;
        const confirmadas = listaReservas.filter(r => r.estado === 'Confirmada').length;
        const comensales = listaReservas.filter(r => r.estado === 'Confirmada').reduce((sum, r) => sum + r.personas, 0);
        const elTotal = document.getElementById('txtTotalReservas');
        const elPendientes = document.getElementById('txtPendientes');
        const elConfirmadas = document.getElementById('txtConfirmadas');
        const elComensales = document.getElementById('txtComensales');

        if (elTotal) elTotal.innerText = total;
        if (elPendientes) elPendientes.innerText = pendientes;
        if (elConfirmadas) elConfirmadas.innerText = confirmadas;
        if (elComensales) elComensales.innerText = comensales;
    }

    // 5. Función GLOBAL para cambiar estados (Aprobar / Cancelar)
    window.cambiarEstadoReserva = async function (id, nuevoEstado) {
        try {
            const respuesta = await fetch(`/api/reservas/${id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            if (!respuesta.ok) throw new Error('No se pudo actualizar en el servidor.');

            // Actualización optimista local
            const reserva = listaReservas.find(r => r.id === id);
            if (reserva) {
                reserva.estado = nuevoEstado;
                renderTable();
                actualizarTarjetasMetricas();
            }
            console.log(`Reserva ${id} cambiada a ${nuevoEstado}.`);
        } catch (error) {
            console.error('Error al actualizar:', error);
            alert('Hubo un problema de conexión. El estado no se guardó.');
        }
    };

    // 7. Lógica del Formulario de Registro Manual
    const regTipoMesa = document.getElementById('regTipoMesa');
    const filaPisoMesa = document.getElementById('filaPisoMesa');
    const regMesa = document.getElementById('regMesa');
    const regPersonas = document.getElementById('regPersonas');
    const personasHelp = document.getElementById('personasHelp');

    if (regTipoMesa && filaPisoMesa && regMesa && regPersonas) {
        regTipoMesa.addEventListener('change', () => {
            if (regTipoMesa.value === 'Terraza') {
                filaPisoMesa.classList.add('d-none');
                regMesa.removeAttribute('required');
                regMesa.value = 'Terraza Completa';
                regPersonas.max = 22;
                if (personasHelp) personasHelp.textContent = 'Máx. 22 personas para Terraza (Espacio Privado)';
            } else {
                filaPisoMesa.classList.remove('d-none');
                regMesa.setAttribute('required', '');
                regMesa.value = '';
                regPersonas.max = 10;
                if (personasHelp) personasHelp.textContent = 'Máx. 10 personas para Mesa Normal';
                if (parseInt(regPersonas.value) > 10) regPersonas.value = 10;
            }
        });
    }

    // 8. Capturar el envío del Formulario Manual (POST)
    const formNuevaReserva = document.getElementById('formNuevaReserva');
    if (formNuevaReserva) {
        formNuevaReserva.addEventListener('submit', function (e) {
            e.preventDefault();

            const nuevaReserva = {
                fecha: document.getElementById('regFecha').value,
                hora: document.getElementById('regHora').value,
                personas: parseInt(document.getElementById('regPersonas').value),
                tipoMesa: document.getElementById('regTipoMesa').value,
                piso: document.getElementById('regTipoMesa').value === 'Terraza' ? null : document.getElementById('regPiso').value,
                mesa: document.getElementById('regMesa').value,
                cumpleanos: document.getElementById('regCumpleanos').checked ? 'Sí' : 'No',
                estado: 'Confirmada',
                cliente: {
                    nombre: document.getElementById('regNombre').value,
                    telefono: document.getElementById('regTelefono').value
                }
            };

            fetch('/api/reservas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevaReserva)
            })
                .then(response => {
                    if (!response.ok) throw new Error('Error en la inserción');
                    return response.json();
                })
                .then(data => {
                    alert(`¡Reserva creada con éxito! Código: ${data.reserva?.id || 'OK'}`);
                    formNuevaReserva.reset();

                    // Cerrar modal de Bootstrap de forma limpia
                    const modalElement = document.getElementById('modalNuevaReserva');
                    const modalInstancia = bootstrap.Modal.getInstance(modalElement);
                    if (modalInstancia) modalInstancia.hide();

                    // REFRESCADO EN TIEMPO REAL SIN RECARGAR PÁGINA 🚀
                    cargarReservasDesdeServidor();
                })
                .catch(error => {
                    console.error('Error al registrar:', error);
                    alert('No se pudo guardar la reserva.');
                });
        });
    }

    // Formateador de Fechas interno (Ej: "2026-05-19" -> "19 may 2026")
    function formatearFecha(fechaISO) {
        if (!fechaISO) return '-';
        const partes = fechaISO.split('-');
        if (partes.length !== 3) return fechaISO;
        const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
        return `${parseInt(partes[2], 10)} ${meses[parseInt(partes[1], 10) - 1]} ${partes[0]}`;
    }

    async function cargarReservasDesdeServidor() {
        try {
            const respuesta = await fetch('/api/reservas');
            if (!respuesta.ok) throw new Error('Error al obtener datos del servidor');

            const datosBackend = await respuesta.json();
            console.log("👉 [BACKEND] Datos recibidos de MySQL:", datosBackend);

            // Llenamos la variable global (SIN usar const ni let aquí adentro)
            listaReservas = datosBackend;

            console.log("📊 [FRONTEND] Dibujando tabla con listaReservas...");

            // Ejecutamos tus funciones para pintar la interfaz
            renderTable();

            // Verificamos cuál de tus dos funciones de contadores tienes activa:
            if (typeof actualizarContadores === 'function') {
                actualizarContadores(listaReservas);
            } else if (typeof actualizarTarjetasMetricas === 'function') {
                actualizarTarjetasMetricas();
            }

        } catch (error) {
            console.error("❌ Error al cargar reservas en el dashboard:", error);
        }
    }

    // Función global para mostrar el resumen detallado en el Modal
    window.verResumenReserva = function (idReserva) {
        const reserva = listaReservas.find(r => r.id === idReserva);
        if (!reserva) return;

        const nombre = reserva.cliente?.nombre || 'No registrado';
        const telefono = reserva.cliente?.telefono || 'No registrado';
        const correo = reserva.cliente?.correo || 'No registrado';
        const esCumple = (reserva.cumpleanos === 1 || reserva.cumpleanos === true || reserva.cumpleanos === 'Sí') ? 'Sí 🎉' : 'No';

        // Lógica para determinar la Ubicación y Mesa (consistente con la tabla)
        const esTerraza = reserva.tipoMesa === 'Terraza' || reserva.tipoMesa === 'terraza' || (reserva.tipo_zona && reserva.tipo_zona.toLowerCase() === 'terraza');

        let infoMesaTexto = '';
        let infoUbicacionTexto = '';

        if (esTerraza) {
            infoMesaTexto = '<span class="text-success fw-bold">Terraza (Área completa)</span>';
            infoUbicacionTexto = 'Terraza';
        } else {
            const numMesa = reserva.numero_mesa || reserva.mesa || 'N/A';
            const piso = reserva.piso ? ` - Piso ${reserva.piso}` : '';
            infoMesaTexto = `<span class="fw-bold text-dark">Mesa ${numMesa}</span>`;
            infoUbicacionTexto = `${reserva.tipo_zona || 'Mesa Normal'}${piso}`;
        }

        const modalBody = document.getElementById('modalResumenBody');

        modalBody.innerHTML = `
        <div class="p-2">
            <div class="text-center mb-4">
                <span class="fs-3 fw-bold text-primary">Reserva #${reserva.id}</span>
                <p class="text-muted mb-0">Estado actual: <strong>${reserva.estado}</strong></p>
            </div>
            
            <h6 class="text-secondary border-bottom pb-1 mb-3"><i class="bi bi-person-fill me-2"></i>Datos del Cliente</h6>
            <div class="row mb-3 g-2">
                <div class="col-4 text-muted">Nombre:</div><div class="col-8 fw-bold">${nombre}</div>
                <div class="col-4 text-muted">Teléfono:</div><div class="col-8">${telefono}</div>
            </div>

            <h6 class="text-secondary border-bottom pb-1 mb-3"><i class="bi bi-calendar-check-fill me-2"></i>Detalles</h6>
            <div class="row g-2">
                <div class="col-4 text-muted">Fecha:</div><div class="col-8 fw-bold">${reserva.fecha}</div>
                <div class="col-4 text-muted">Hora:</div><div class="col-8 fw-bold">${reserva.hora}</div>
                <div class="col-4 text-muted">Personas:</div><div class="col-8">${reserva.personas}</div>
                <div class="col-4 text-muted">Mesa:</div><div class="col-8">${infoMesaTexto}</div>
                <div class="col-4 text-muted">Zona:</div><div class="col-8 text-capitalize">${infoUbicacionTexto}</div>
                <div class="col-4 text-muted">Cumpleaños:</div><div class="col-8">${esCumple}</div>
            </div>
        </div>
    `;

        const miModal = new bootstrap.Modal(document.getElementById('modalResumen'));
        miModal.show();
    };

    // Ejecución inicial automática de la carga de datos
    cargarReservasDesdeServidor();
});

// FUNCIÓN EN DASHBOARD.JS PARA CAMBIAR EL ESTADO (CONFIRMADA / CANCELADA)
async function actualizarEstadoReserva(idReserva, nuevoEstado) {
    try {
        // Hacemos la petición al backend. Ej: /api/reservas/R-001/estado
        const respuesta = await fetch(`/api/reservas/${idReserva}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado: nuevoEstado }) // Enviamos "Confirmada" o "Cancelada"
        });

        const resultado = await respuesta.json();

        if (resultado.ok) {
            alert(`¡Reserva ${idReserva} actualizada a ${nuevoEstado} con éxito!`);
            // Volvemos a cargar la tabla para que se refresque con la data real de MySQL
            cargarReservasDesdeServidor();
        } else {
            alert(`Error: ${resultado.error}`);
        }
    } catch (error) {
        console.error("Error al conectar con el servidor:", error);
    }
}