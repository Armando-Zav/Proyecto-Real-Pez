/* ===========================================
   RESERVACIÓN - JAVASCRIPT MODERNO
   =========================================== */

document.addEventListener('DOMContentLoaded', function() {
    inicializarCalendario();
    inicializarWizard();
    inicializarSelectores();
    inicializarModalFecha();
});

/* ===========================================
   DATOS DE RESERVA
   =========================================== */
let pasoActual = 1;
let modalFecha; // Instancia global del modal
let datosReserva = {
    fecha: null,
    hora: null,
    tipoMesa: 'Normal',
    cumpleanos: false,
    personas: 0,
    terrazaConfirmada: false,
    piso: 1,
    mesa: null,
    cliente: {
        nombre: '',
        telefono: '',
        email: '',
        comentarios: ''
    }
};

/* ===========================================
   CONFIGURACIÓN DE MESAS POR PISO
   =========================================== */
const mesasDisponiblesPorPiso = {
    1: { // Piso 1
        1: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15],
        2: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15],
        4: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15],
        6: [7, 9, 11, 14, 13],
        8: [13],
        10: []
    },
    2: { // Piso 2 - Se rellenará cuando se defina
        1: [],
        2: [],
        4: [],
        6: [],
        8: [],
        10: []
    },
    3: { // Piso 3 - Se rellenará cuando se defina
        1: [],
        2: [],
        4: [],
        6: [],
        8: [],
        10: []
    }
};

/* ===========================================
   CALENDARIO
   =========================================== */
function inicializarCalendario() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) {
        console.error('No se encontró el elemento #calendar');
        return;
    }

    const hoy = new Date();
    const unMesDespues = new Date();
    unMesDespues.setDate(hoy.getDate() + 30);

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        selectable: true,
        headerToolbar: {
            left: 'prev',
            center: 'title',
            right: 'next'
        },
        validRange: {
            start: hoy,
            end: unMesDespues
        },
        dateClick: function(info) {
            window.fechaSeleccionada = info.dateStr;
            info.dayEl.style.backgroundColor = '#f0f0f0';
            abrirModalFecha();
        }
    });

    calendar.render();
}

function inicializarModalFecha() {
    const modalEl = document.getElementById('modalConfirmarFecha');
    if (!modalEl) return;
    modalFecha = new bootstrap.Modal(modalEl);

    modalEl.addEventListener('show.bs.modal', function() {
        const fechaInput = document.getElementById('fecha-seleccionada-display');
        if (fechaInput && window.fechaSeleccionada) {
            const fecha = new Date(window.fechaSeleccionada);
            fechaInput.value = fecha.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
        const horaInput = document.getElementById('input-hora');
        if (horaInput && !horaInput.value) {
            horaInput.value = '12:00';
        }
    });

    document.getElementById('form-confirmar-fecha').addEventListener('submit', function(event) {
        event.preventDefault();
        const hora = document.getElementById('input-hora').value;
        const tipoMesa = document.querySelector('input[name="tipoMesa"]:checked').value;
        const cumpleanos = document.getElementById('check-cumpleanos').checked;

        if (!window.fechaSeleccionada) {
            mostrarAlerta('Selecciona primero una fecha en el calendario.');
            return;
        }
        if (!hora) {
            mostrarAlerta('Selecciona una hora para tu reserva.');
            return;
        }

        datosReserva.fecha = window.fechaSeleccionada;
        datosReserva.hora = hora;
        datosReserva.tipoMesa = tipoMesa;
        datosReserva.cumpleanos = cumpleanos;
        modalFecha.hide();
        cambiarPaso(2);
    });
}

function abrirModalFecha() {
    if (!modalFecha) {
        mostrarAlerta('El modal de fecha no está inicializado.');
        return;
    }
    modalFecha.show();
}

/* ===========================================
   WIZARD LOGIC
   =========================================== */
function inicializarWizard() {
    document.getElementById('btn-prev').addEventListener('click', () => cambiarPaso(pasoActual - 1));
    const formConfirmarReserva = document.getElementById('form-confirmar-reserva');
    if (formConfirmarReserva) {
        formConfirmarReserva.addEventListener('submit', function(event) {
            event.preventDefault();
            finalizarReserva();
        });
    }
    mostrarPaso(1);
}

function cambiarPaso(nuevoPaso) {
    if (nuevoPaso === pasoActual) return;

    if (pasoActual !== 1 && !validarPasoActual()) return;
    if (pasoActual === 1 && nuevoPaso > 1 && !validarPasoActual()) return;

    pasoActual = nuevoPaso;
    actualizarWizardUI();
    mostrarPaso(nuevoPaso);
}

function validarPasoActual() {
    switch (pasoActual) {
        case 1:
            if (!datosReserva.fecha || !datosReserva.hora) {
                mostrarAlerta('Debes seleccionar fecha, hora y confirmar en el modal antes de continuar.');
                return false;
            }
            return true;
        case 2:
            if (datosReserva.tipoMesa === 'Terraza') {
                if (!datosReserva.terrazaConfirmada) {
                    mostrarAlerta('Debes confirmar las condiciones de la terraza antes de continuar.');
                    return false;
                }
                return true;
            }
            if (datosReserva.personas === 0) {
                mostrarAlerta('Por favor selecciona el número de personas.');
                return false;
            }
            if (!datosReserva.mesa) {
                mostrarAlerta('Por favor selecciona una mesa.');
                return false;
            }
            return true;
        case 3:
            return true;
        default:
            return true;
    }
}

function validarDatosCliente() {
    const nombre = document.getElementById('input-nombre')?.value.trim();
    const telefono = document.getElementById('input-telefono')?.value.trim();
    const email = document.getElementById('input-email')?.value.trim();
    if (!nombre) return 'Por favor ingresa tu nombre completo.';
    if (!telefono) return 'Por favor ingresa un teléfono de contacto.';
    if (!email) return 'Por favor ingresa un correo electrónico válido.';
    return '';
}

function mostrarMensajeConfirmacion(tipo, mensaje) {
    const alerta = document.getElementById('confirmacion-alerta');
    if (!alerta) return;
    alerta.className = `alert alert-${tipo}`;
    alerta.textContent = mensaje;
    alerta.classList.remove('d-none');
}

function mostrarPaso(paso) {
    document.querySelectorAll('.wizard-step-content').forEach(content => {
        content.classList.remove('active');
    });
    const pasoElement = document.getElementById(`step-${paso}`);
    if (pasoElement) pasoElement.classList.add('active');
    if (paso === 2) actualizarVistaStep2();
    actualizarNavegacion();
}

function actualizarWizardUI() {
    document.querySelectorAll('.wizard-step').forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.remove('active', 'completed');
        if (stepNumber === pasoActual) {
            step.classList.add('active');
        } else if (stepNumber < pasoActual) {
            step.classList.add('completed');
        }
    });
    if (pasoActual === 3) actualizarResumen();
}

function actualizarVistaStep2() {
    const contenedorMesas = document.getElementById('mesas-disponibles-container');
    const contenedorTerraza = document.getElementById('terraza-politicas');
    const blockPersonas = document.getElementById('personas-selector-block');
    const blockPiso = document.getElementById('piso-selector-block');

    if (datosReserva.tipoMesa === 'Terraza') {
        if (contenedorMesas) contenedorMesas.classList.add('d-none');
        if (contenedorTerraza) contenedorTerraza.classList.remove('d-none');
        if (blockPersonas) blockPersonas.classList.add('d-none');
        if (blockPiso) blockPiso.classList.add('d-none');
        document.querySelectorAll('.mesa.selected').forEach(mesa => mesa.classList.remove('selected'));
        datosReserva.mesa = null;
    } else {
        if (contenedorMesas) contenedorMesas.classList.remove('d-none');
        if (contenedorTerraza) contenedorTerraza.classList.add('d-none');
        if (blockPersonas) blockPersonas.classList.remove('d-none');
        if (blockPiso) blockPiso.classList.remove('d-none');
    }
}

function actualizarNavegacion() {
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');

    if (pasoActual === 1) {
        btnPrev.style.display = 'none';
        btnNext.style.display = 'none';
        return;
    }

    btnPrev.style.display = pasoActual === 1 ? 'none' : 'block';

    if (pasoActual === 3) {
        // En el paso 3, la confirmación se hace dentro del formulario, no con el botón del wizard
        btnNext.style.display = 'none';
    } else {
        btnNext.style.display = 'inline-block';
        btnNext.innerHTML = 'Siguiente<i class="bi bi-arrow-right ms-2"></i>';
        btnNext.className = 'btn btn-primary';
        btnNext.onclick = () => cambiarPaso(pasoActual + 1);
    }
}

/* ===========================================
   SELECTORES
   =========================================== */
function inicializarSelectores() {
    document.querySelectorAll('.btn-persona').forEach(btn => {
        btn.addEventListener('click', function() {
            const personas = parseInt(this.getAttribute('data-cap'));
            document.querySelectorAll('.btn-persona').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            datosReserva.personas = personas;
            filtrarMesasPorCapacidad(personas);
        });
    });

    document.querySelectorAll('.btn-piso').forEach(btn => {
        btn.addEventListener('click', function() {
            const piso = parseInt(this.getAttribute('data-piso')) || 2;
            document.querySelectorAll('.btn-piso').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            datosReserva.piso = piso;
            cambiarPiso(piso);
        });
    });

    document.querySelectorAll('.mesa').forEach(mesa => {
        mesa.addEventListener('click', function() {
            if (this.classList.contains('mesa-bloqueada')) return;
            document.querySelectorAll('.mesa').forEach(m => m.classList.remove('selected'));
            this.classList.add('selected');
            datosReserva.mesa = this.textContent.trim();
        });
    });

    const checkboxConfirmarTerraza = document.getElementById('checkbox-confirmar-terrace');
    if (checkboxConfirmarTerraza) {
        checkboxConfirmarTerraza.addEventListener('change', function() {
            if (this.checked) {
                datosReserva.terrazaConfirmada = true;
                datosReserva.mesa = 'Terraza';
                mostrarAlerta('Has confirmado las condiciones de la terraza. Ahora puedes continuar a confirmar.');
                cambiarPaso(3);
            } else {
                datosReserva.terrazaConfirmada = false;
                datosReserva.mesa = null;
            }
        });
    }
}

function filtrarMesasPorCapacidad(cantidad) {
    if (datosReserva.tipoMesa === 'Terraza') {
        return;
    }

    const mesasDisponibles = mesasDisponiblesPorPiso[datosReserva.piso]?.[cantidad] || [];
    
    document.querySelectorAll('.mesa').forEach(mesa => {
        const numeroMesa = parseInt(mesa.textContent.trim());
        
        if (mesasDisponibles.includes(numeroMesa)) {
            mesa.classList.remove('mesa-bloqueada');
            mesa.style.pointerEvents = 'auto';
            mesa.style.opacity = '1';
        } else {
            mesa.classList.add('mesa-bloqueada');
            mesa.classList.remove('selected');
            mesa.style.pointerEvents = 'none';
            mesa.style.opacity = '0.5';
            if (datosReserva.mesa === mesa.textContent.trim()) datosReserva.mesa = null;
        }
    });

    // Mostrar mensaje solo si no hay mesas disponibles
    if (mesasDisponibles.length === 0) {
        mostrarAlerta(`No hay mesas disponibles para ${cantidad} personas en este piso. Intenta con otro piso.`);
    }
}

function cambiarPiso(piso) {
    datosReserva.piso = piso;
    datosReserva.mesa = null; // Limpiar selección anterior
    document.querySelectorAll('.mesa').forEach(m => m.classList.remove('selected'));
    
    // Reaplicar filtrado de mesas para la cantidad de personas seleccionada
    if (datosReserva.personas > 0) {
        filtrarMesasPorCapacidad(datosReserva.personas);
    }
}

/* ===========================================
   RESUMEN Y CONFIRMACIÓN
   =========================================== */
function actualizarResumen() {
    if (datosReserva.fecha) {
        const fecha = new Date(datosReserva.fecha);
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const fechaFormateada = fecha.toLocaleDateString('es-ES', opciones);
        document.getElementById('resumen-fecha-hora').textContent = `${fechaFormateada} a las ${datosReserva.hora || '--:--'}`;
    }
    if (datosReserva.tipoMesa === 'Terraza') {
        document.getElementById('resumen-piso').textContent = 'Terraza';
        document.getElementById('resumen-personas').textContent = '16 personas';
        document.getElementById('resumen-mesa').textContent = 'Has reservado la terraza';
        document.getElementById('resumen-tipo-mesa').textContent = 'Terraza';
    } else {
        document.getElementById('resumen-piso').textContent = `Piso ${datosReserva.piso}`;
        document.getElementById('resumen-personas').textContent = `${datosReserva.personas} personas`;
        document.getElementById('resumen-mesa').textContent = datosReserva.mesa || 'Ninguna';
        document.getElementById('resumen-tipo-mesa').textContent = datosReserva.tipoMesa || 'Normal';
    }
    document.getElementById('resumen-cumpleanos').textContent = datosReserva.cumpleanos ? 'Sí' : 'No';
}

function finalizarReserva() {
    if (pasoActual !== 3) return;

    const error = validarDatosCliente();
    if (error) {
        mostrarMensajeConfirmacion('danger', error);
        return;
    }

    datosReserva.cliente.nombre = document.getElementById('input-nombre').value.trim();
    datosReserva.cliente.telefono = document.getElementById('input-telefono').value.trim();
    datosReserva.cliente.email = document.getElementById('input-email').value.trim();
    datosReserva.cliente.comentarios = document.getElementById('input-comentarios').value.trim();

    mostrarMensajeConfirmacion('success', `¡Reserva registrada con éxito, ${datosReserva.cliente.nombre}! Nos contactaremos pronto al ${datosReserva.cliente.telefono}.`);
}

function mostrarAlerta(mensaje) {
    // Remover alertas previas para evitar acumulación
    document.querySelectorAll('.alert.alert-warning').forEach(alerta => alerta.remove());

    const alerta = document.createElement('div');
    alerta.className = 'alert alert-warning alert-dismissible fade show';
    alerta.style.cssText = 'position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 9999; min-width: 300px;';
    alerta.innerHTML = `\n        <i class="bi bi-exclamation-triangle me-2"></i>\n        ${mensaje}\n        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>\n    `;
    document.body.appendChild(alerta);
    setTimeout(() => { if (alerta.parentNode) alerta.remove(); }, 5000);
}
