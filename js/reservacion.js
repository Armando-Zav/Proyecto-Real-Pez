/* ==========================================================================
   VARIABLES GLOBALES Y CONFIGURACIÓN
   ========================================================================== */
let pasoActual = 1;
let modalFecha; // Instancia global del modal de Bootstrap
let currentDatePointer = new Date(); // Controla la navegación de meses

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

/* Configuración de mesas disponibles por piso */
const mesasDisponiblesPorPiso = {
    1: {
        1: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15],
        2: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15],
        4: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15],
        6: [7, 9, 11, 14, 13],
        8: [13],
        10: []
    },
    2: {
        1: [], 2: [], 4: [], 6: [], 8: [], 10: []
    },
    3: {
        1: [], 2: [], 4: [], 6: [], 8: [], 10: []
    }
};

/* ==========================================================================
   LANZADOR PRINCIPAL (DOM READY UNIFICADO)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', function () {
    // 1. Inicializar componentes del Wizard y selectores
    inicializarWizard();
    inicializarSelectores();
    inicializarModalFecha();

    // 2. Renderizar el nuevo calendario propio desde cero
    renderCustomCalendar();

    // 3. Controladores de eventos para la navegación del calendario nativo
    const btnPrev = document.getElementById('btn-prev-months');
    const btnNext = document.getElementById('btn-next-months');

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            currentDatePointer.setMonth(currentDatePointer.getMonth() - 1);
            renderCustomCalendar();
        });
    }
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            currentDatePointer.setMonth(currentDatePointer.getMonth() + 1);
            renderCustomCalendar();
        });
    }
});

/* ==========================================================================
   LÓGICA DEL CALENDARIO PROPIO (DOS MESES)
   ========================================================================== */
function renderCustomCalendar() {
    const year = currentDatePointer.getFullYear();
    const monthIndex1 = currentDatePointer.getMonth();

    // El segundo recuadro siempre muestra el mes siguiente consecutivo
    const monthIndex2 = (monthIndex1 + 1) % 12;
    const year2 = monthIndex1 === 11 ? year + 1 : year;

    // Actualizar dinámicamente el título del año actual
    const titleEl = document.getElementById('calendar-year-title');
    if (titleEl) titleEl.innerText = `Reservas ${year}`;

    // Construir la cuadrícula para ambos bloques de meses
    buildMonthGrid(year, monthIndex1, 'month-title-1', 'days-grid-1');
    buildMonthGrid(year2, monthIndex2, 'month-title-2', 'days-grid-2');
}

function buildMonthGrid(year, monthIndex, titleId, gridId) {
    const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

    const titleElement = document.getElementById(titleId);
    if (titleElement) titleElement.innerText = monthNames[monthIndex];

    const gridElement = document.getElementById(gridId);
    if (!gridElement) return;
    gridElement.innerHTML = ''; // Vaciar contenido viejo antes de redibujar

    // Calcular el desfase del primer día (0 = Dom, 1 = Lun...) y días totales
    const firstDayIndex = new Date(year, monthIndex, 1).getDay();
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();

    // Inyectar celdas en blanco para los días desfasados del mes
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('day-cell', 'empty-cell');
        gridElement.appendChild(emptyCell);
    }

    // Dibujar los días del mes actual
    for (let day = 1; day <= totalDays; day++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('day-cell');
        dayCell.innerText = day;

        // Estructurar la cadena en formato estándar YYYY-MM-DD
        const strMonth = String(monthIndex + 1).padStart(2, '0');
        const strDay = String(day).padStart(2, '0');
        const fullDateStr = `${year}-${strMonth}-${strDay}`;

        dayCell.setAttribute('data-date', fullDateStr);

        // Mantener pintado si coincide con la selección actual
        if (window.fechaSeleccionada === fullDateStr) {
            dayCell.classList.add('selected-day');
        }

        // Manejador de selección de celda
        dayCell.addEventListener('click', function () {
            document.querySelectorAll('.day-cell.selected-day').forEach(el => el.classList.remove('selected-day'));
            this.classList.add('selected-day');

            window.fechaSeleccionada = this.getAttribute('data-date');

            // Abrir el modal de especificaciones directamente
            abrirModalFecha();
        });

        gridElement.appendChild(dayCell);
    }
}

/* ==========================================================================
   CONEXIÓN FORMULARIO MODAL -> WIZARD
   ========================================================================== */
function inicializarModalFecha() {
    const modalEl = document.getElementById('modalConfirmarFecha');
    if (!modalEl) return;

    // Instanciar el modal globalmente
    modalFecha = bootstrap.Modal.getOrCreateInstance(modalEl);

    // Evento previo a que se muestre el modal en pantalla
    modalEl.addEventListener('show.bs.modal', function () {
        const fechaInput = document.getElementById('fecha-seleccionada-display');
        if (fechaInput && window.fechaSeleccionada) {
            // Formatear visualmente para el usuario (Ej: 26/05/2026)
            const [anio, mes, dia] = window.fechaSeleccionada.split('-');
            fechaInput.value = `${dia}/${mes}/${anio}`;
        }

        const horaInput = document.getElementById('input-hora');
        if (horaInput && !horaInput.value) {
            horaInput.value = '12:00';
        }
    });

    // PROCESAR MODAL: Unificado en un único Listener libre de conflictos
    const formConfirmarFecha = document.getElementById('form-confirmar-fecha');
    if (formConfirmarFecha) {
        formConfirmarFecha.addEventListener('submit', function (event) {
            event.preventDefault(); // Detener recarga de página

            const hora = document.getElementById('input-hora')?.value;
            const radioTipoMesa = document.querySelector('input[name="tipoMesa"]:checked');
            const tipoMesa = radioTipoMesa ? radioTipoMesa.value : 'Normal';
            const cumpleanos = document.getElementById('check-cumpleanos')?.checked || false;

            // Validaciones de seguridad
            if (!window.fechaSeleccionada) {
                mostrarAlerta('Selecciona primero una fecha en el calendario.');
                return;
            }
            if (!hora) {
                mostrarAlerta('Selecciona una hora para tu reserva.');
                return;
            }

            // Guardar datos recolectados de forma segura en la estructura del Wizard
            datosReserva.fecha = window.fechaSeleccionada;
            datosReserva.hora = hora;
            datosReserva.tipoMesa = tipoMesa;
            datosReserva.cumpleanos = cumpleanos;

            // Cerrar el modal limpiamente
            modalFecha.hide();

            // Avanzar automáticamente al paso 2 usando la API nativa de tu Wizard
            cambiarPaso(2);

            // Efecto UX: sube el scroll suavemente para ver el paso 2
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

function abrirModalFecha() {
    if (!modalFecha) {
        mostrarAlerta('El modal de fecha no está inicializado.');
        return;
    }
    modalFecha.show();
}

/* ==========================================================================
   ARQUITECTURA WIZARD (PASOS)
   ========================================================================== */
function inicializarWizard() {
    const btnPrev = document.getElementById('btn-prev');
    if (btnPrev) {
        btnPrev.addEventListener('click', () => cambiarPaso(pasoActual - 1));
    }

    const formConfirmarReserva = document.getElementById('form-confirmar-reserva');
    if (formConfirmarReserva) {
        formConfirmarReserva.addEventListener('submit', function (event) {
            event.preventDefault();
            finalizarReserva();
        });
    }
    mostrarPaso(1);
}

function cambiarPaso(nuevoPaso) {
    if (nuevoPaso === pasoActual) return;

    // Ejecutar validaciones solo si intentamos avanzar
    if (nuevoPaso > pasoActual && !validarPasoActual()) return;

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
        default:
            return true;
    }
}

function mostrarPaso(paso) {
    // 1. Ocultar TODOS los contenedores usando d-none de Bootstrap
    document.querySelectorAll('.wizard-step-content').forEach(content => {
        content.classList.remove('active');
        content.classList.add('d-none'); // <-- Esto garantiza que desaparezca de la pantalla
    });

    // 2. Mostrar únicamente el contenedor del paso actual quitando el d-none
    const pasoElement = document.getElementById(`step-${paso}`);
    if (pasoElement) {
        pasoElement.classList.add('active');
        pasoElement.classList.remove('d-none'); // <-- Esto lo vuelve a hacer visible
    }

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

    if (!btnPrev || !btnNext) return;

    // En el paso 1 el calendario controla la salida, ocultamos navegación del wizard
    if (pasoActual === 1) {
        btnPrev.style.display = 'none';
        btnNext.style.display = 'none';
        return;
    }

    btnPrev.style.display = 'block';

    if (pasoActual === 3) {
        btnNext.style.display = 'none';
    } else {
        btnNext.style.display = 'inline-block';
        btnNext.innerHTML = 'Siguiente<i class="bi bi-arrow-right ms-2"></i>';
        btnNext.className = 'btn btn-primary';
        btnNext.onclick = () => cambiarPaso(pasoActual + 1);
    }
}

/* ==========================================================================
   CONTROLADORES DE SELECCIÓN (PISOS, MESAS Y CAPACIDADES)
   ========================================================================== */
function inicializarSelectores() {
    document.querySelectorAll('.btn-persona').forEach(btn => {
        btn.addEventListener('click', function () {
            const personas = parseInt(this.getAttribute('data-cap'));
            document.querySelectorAll('.btn-persona').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            datosReserva.personas = personas;
            filtrarMesasPorCapacidad(personas);
        });
    });

    document.querySelectorAll('.btn-piso').forEach(btn => {
        btn.addEventListener('click', function () {
            const piso = parseInt(this.getAttribute('data-piso')) || 1;
            document.querySelectorAll('.btn-piso').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            cambiarFiltroPiso(piso);
        });
    });

    document.querySelectorAll('.mesa').forEach(mesa => {
        mesa.addEventListener('click', function () {
            if (this.classList.contains('mesa-bloqueada')) return;
            document.querySelectorAll('.mesa').forEach(m => m.classList.remove('selected'));
            this.classList.add('selected');
            datosReserva.mesa = this.textContent.trim();
        });
    });

    const checkboxConfirmarTerraza = document.getElementById('checkbox-confirmar-terrace');
    if (checkboxConfirmarTerraza) {
        checkboxConfirmarTerraza.addEventListener('change', function () {
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
    if (datosReserva.tipoMesa === 'Terraza') return;

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

    if (mesasDisponibles.length === 0) {
        mostrarAlerta(`No hay mesas disponibles para ${cantidad} personas en este piso. Intenta con otro piso.`);
    }
}

function cambiarFiltroPiso(piso) {
    datosReserva.piso = piso;
    datosReserva.mesa = null;
    document.querySelectorAll('.mesa').forEach(m => m.classList.remove('selected'));

    if (datosReserva.personas > 0) {
        filtrarMesasPorCapacidad(datosReserva.personas);
    }
}

/* ==========================================================================
   RESUMEN FINAL Y ENVÍO AL SERVIDOR (FETCH)
   ========================================================================== */
function actualizarResumen() {
    if (datosReserva.fecha) {
        const fecha = new Date(datosReserva.fecha + 'T00:00:00'); // Evita desfase horario local
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

function validarDatosCliente() {
    const nombre = document.getElementById('input-nombre')?.value.trim();
    const telefono = document.getElementById('input-telefono')?.value.trim();
    const email = document.getElementById('input-email')?.value.trim();
    if (!nombre) return 'Por favor ingresa tu nombre completo.';
    if (!telefono) return 'Por favor ingresa un teléfono de contacto.';
    if (!email) return 'Por favor ingresa un correo electrónico válido.';
    return '';
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

    const btnConfirmar = document.querySelector('#form-confirmar-reserva button[type="submit"]');
    const textoOriginalBtn = btnConfirmar ? btnConfirmar.innerHTML : 'Confirmar Reserva';

    if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Procesando...`;
    }

    fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosReserva)
    })
        .then(response => {
            if (!response.ok) throw new Error('Error en el servidor.');
            return response.json();
        })
        .then(data => {
            mostrarMensajeConfirmacion('success', `¡Reserva registrada con éxito! Código: ${data.reserva.id}.`);
            setTimeout(() => { window.location.href = 'index.html'; }, 4000);
        })
        .catch(err => {
            console.error(err);
            mostrarMensajeConfirmacion('danger', 'Hubo un problema de conexión. Inténtalo de nuevo.');
            if (btnConfirmar) {
                btnConfirmar.disabled = false;
                btnConfirmar.innerHTML = textoOriginalBtn;
            }
        });
}

function mostrarMensajeConfirmacion(tipo, mensaje) {
    const alerta = document.getElementById('confirmacion-alerta');
    if (!alerta) return;
    alerta.className = `alert alert-${tipo}`;
    alerta.textContent = mensaje;
    alerta.classList.remove('d-none');
}

function mostrarAlerta(mensaje) {
    document.querySelectorAll('.alert.alert-warning').forEach(alerta => alerta.remove());
    const alerta = document.createElement('div');
    alerta.className = 'alert alert-warning alert-dismissible fade show';
    alerta.style.cssText = 'position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 9999; min-width: 300px;';
    alerta.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i>${mensaje}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    document.body.appendChild(alerta);
    setTimeout(() => { if (alerta.parentNode) alerta.remove(); }, 5000);
}