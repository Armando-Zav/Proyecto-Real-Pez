document.addEventListener('DOMContentLoaded', () => {

    // Elementos clave del DOM
    const tableBody = document.getElementById('tableBody');
    const inputBuscar = document.getElementById('inputBuscar');
    const inputFecha = document.getElementById('inputFecha');
    const selectEstado = document.getElementById('selectEstado');

    // Arreglo en memoria para las reservas sincronizadas del servidor
    let listaReservas = [];

    // Asignamos los eventos de escucha en tiempo real para los filtros
    if (inputBuscar && inputFecha && selectEstado) {
        inputBuscar.addEventListener('input', renderTable);
        inputFecha.addEventListener('change', renderTable);
        selectEstado.addEventListener('change', renderTable);
    }

    // 1. Consultar las reservas al servidor de Node.js
    function cargarReservasDesdeServidor() {
        fetch('/api/reservas')
            .then(response => {
                if (!response.ok) throw new Error('Error en la respuesta del servidor');
                return response.json();
            })
            .then(data => {
                listaReservas = data; // Guardamos las reservas reales mapeadas desde MySQL
                renderTable();        // Pintamos la tabla
                actualizarTarjetasMetricas(); // Actualiza los contadores superiores
            })
            .catch(err => console.error('Error al solicitar datos al backend:', err));
        if (typeof listaReservas !== 'undefined') {
            listaReservas = datosBackend;
        }
    }

    // 2. Renderizar la tabla aplicando los filtros en tiempo real
    // 2. Renderizar la tabla aplicando los filtros en tiempo real
    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        const textoBusqueda = inputBuscar.value.toLowerCase().trim();
        const fechaFiltro = inputFecha.value;
        const estadoFiltro = selectEstado.value;

        let contadorResultados = 0;
        let htmlAcumulado = '';

        for (let i = 0; i < listaReservas.length; i++) {
            const reserva = listaReservas[i];

            // 🔍 VALIDACIÓN DE FILTROS ADAPTADA AL NUEVO BACKEND
            // 1. Filtro de Texto (Busca en ID, Nombre del cliente o Teléfono)
            const nombreCliente = reserva.cliente && reserva.cliente.nombre ? reserva.cliente.nombre : '';
            const telfCliente = reserva.cliente && reserva.cliente.telefono ? reserva.cliente.telefono : '';

            const coincideTexto = textoBusqueda === '' ||
                reserva.id.toLowerCase().includes(textoBusqueda) ||
                nombreCliente.toLowerCase().includes(textoBusqueda) ||
                telfCliente.toLowerCase().includes(textoBusqueda);

            // 2. Filtro de Estado (Usa la función auxiliar blindada que creamos antes)
            const coincideEstadoFiltro = coincideEstado(reserva, estadoFiltro);

            // 3. Filtro de Fecha
            const coincideFecha = fechaFiltro === '' || reserva.fecha === fechaFiltro;

            // Si pasa todos los filtros, construimos la fila 🚀
            if (coincideTexto && coincideEstadoFiltro && coincideFecha) {
                contadorResultados++;

                // Administramos los iconos de acción según el estado
                let actionIconsHTML = '';
                if (reserva.estado === 'Pendiente') {
                    actionIconsHTML = `
                    <button class="action-btn icon-check" onclick="cambiarEstadoReserva('${reserva.id}', 'Confirmada')" title="Confirmar"><i class="bi bi-check2"></i></button>
                    <button class="action-btn icon-cancel" onclick="cambiarEstadoReserva('${reserva.id}', 'Cancelada')" title="Cancelar"><i class="bi bi-x"></i></button>
                `;
                }

                // Definimos el color del badge dinámicamente según el estado
                let badgeClass = 'bg-secondary';
                if (reserva.estado === 'Confirmada') badgeClass = 'bg-success';
                if (reserva.estado === 'Pendiente') badgeClass = 'bg-warning text-dark';
                if (reserva.estado === 'Cancelada') badgeClass = 'bg-danger';

                // Sumamos al string acumulado inyectando las propiedades correctas de MySQL
                htmlAcumulado += `
                <tr class="align-middle">
                    <th scope="row" class="ps-3 small text-muted font-monospace">${reserva.id}</th>
                    <td>
                        <div class="fw-bold">${nombreCliente}</div>
                        <div class="small text-muted">${telfCliente}</div>
                    </td>
                    <td>${reserva.fecha}</td>
                    <td>${reserva.hora}</td>
                    <td class="text-center">${reserva.personas}</td>
                    <td><span class="badge ${badgeClass}">${reserva.estado}</span></td>
                    <td class="text-end pe-3">${actionIconsHTML}</td>
                </tr>
            `;
            }
        }

        // Inyección única al DOM
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

    // 6. Función GLOBAL para levantar el modal detallado
    window.verDetallesReserva = function (id) {
        const reserva = listaReservas.find(r => r.id === id);
        if (!reserva) return;

        document.getElementById('modalDetalleId').innerText = reserva.id;
        document.getElementById('modalDetalleCliente').innerText = reserva.cliente?.nombre || 'Sin nombre';
        document.getElementById('modalDetalleTelefono').innerText = reserva.cliente?.telefono || 'Sin teléfono';
        document.getElementById('modalDetalleFecha').innerText = formatearFecha(reserva.fecha);
        document.getElementById('modalDetalleHora').innerText = reserva.hora;
        document.getElementById('modalDetallePersonas').innerText = reserva.personas;
        document.getElementById('modalDetalleEstado').innerHTML = getStatusBadgeHTML(reserva.estado);

        // Lógica condicional Zona / Piso
        const tipo = reserva.tipoMesa || 'Mesa Normal';
        const txtTipoMesa = document.getElementById('modalDetalleTipoMesa');
        const filaPiso = document.getElementById('filaModalPiso');
        const txtPiso = document.getElementById('modalDetallePiso');

        if (tipo === 'Terraza') {
            txtTipoMesa.innerHTML = `<span class="badge bg-info text-dark"><i class="bi bi-tree-fill me-1"></i> Terraza</span>`;
            if (filaPiso) filaPiso.classList.add('d-none');
        } else {
            txtTipoMesa.innerHTML = `<span class="badge bg-secondary text-white"><i class="bi bi-house-door-fill me-1"></i> Mesa Normal</span>`;
            if (filaPiso) {
                filaPiso.classList.remove('d-none');
                txtPiso.innerText = reserva.piso ? `Piso ${reserva.piso}` : 'Piso 1';
            }
        }

        // Número de Mesa
        const nroMesa = reserva.mesa || 'N/A';
        const txtNumeroMesa = document.getElementById('modalDetalleNumeroMesa');
        if (txtNumeroMesa) txtNumeroMesa.innerHTML = `<span class="text-primary fw-bold">${nroMesa}</span>`;

        // Cumpleaños
        const txtCumpleanos = document.getElementById('modalDetalleCumpleanos');
        if (txtCumpleanos) {
            if (reserva.cumpleanos === 'Sí' || reserva.cumpleanos === true) {
                txtCumpleanos.innerHTML = `<span class="badge bg-danger text-white"><i class="bi bi-cake2-fill me-1"></i> ¡Sí, es un Cumpleaños!</span>`;
            } else {
                txtCumpleanos.innerHTML = `<span class="badge bg-light text-muted border">No</span>`;
            }
        }

        const modalElement = document.getElementById('modalDetalleReserva');
        const miModal = new bootstrap.Modal(modalElement);
        miModal.show();
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

            // 🎯 AQUÍ ESTABA EL TRUCO: Llenamos la variable exacta que usa tu renderTable
            listaReservas = datosBackend;

            console.log("📊 [FRONTEND] Dibujando tabla con listaReservas...");

            // Ejecutamos tus funciones globales
            renderTable();

            if (typeof actualizarContadores === 'function') {
                actualizarContadores(listaReservas);
            }
        } catch (error) {
            console.error("❌ Error al cargar reservas en el dashboard:", error);
        }
    }
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

// FUNCIÓN EN DASHBOARD.JS PARA ENVIAR LA NUEVA RESERVA AL SERVIDOR
async function enviarNuevaReserva(datosFormulario) {
    try {
        const respuesta = await fetch('/api/reservas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosFormulario) // Enviamos el objeto con fecha, hora, cliente, etc.
        });

        const resultado = await respuesta.json();

        if (resultado.ok) {
            alert(`¡Reserva creada con éxito! Código asignado: ${resultado.reserva.id}`);

            // Cerramos el modal de tu interfaz (si tienes uno abierto)
            // Ej: bootstrap.Modal.getInstance(document.getElementById('modalNuevaReserva')).hide();

            // Limpiamos el formulario y refrescamos el dashboard
            document.getElementById('formNuevaReserva')?.reset();
            cargarReservasDesdeServidor();
        } else {
            alert(`No se pudo registrar: ${resultado.error}`);
        }
    } catch (error) {
        console.error("Error al enviar la reserva:", error);
    }
}