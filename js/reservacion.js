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

let reservasExistentes = [];
const MAX_RESERVAS_POR_DIA = 3;
const HORARIOS_PERMITIDOS = ['12:00', '13:00', '14:00'];

/* Configuración de mesas disponibles por piso */
const mesasDisponiblesPorPiso = {
    1: {
        1: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15],
        2: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15],
        4: [7, 9, 11, 14],
        6: [13],
        8: [13],
        10: []
    },
    2: {
        1: [19, 20, 21, 22, 23, 24, 25],
        2: [19, 20, 21, 22, 23, 24, 25],
        4: [19, 20, 21, 22, 23, 24, 25],
        6: [16, 18],
        8: [17],
        10: [17]
    },
    3: {
        1: [27, 28],
        2: [27, 28],
        4: [27, 28],
        6: [29, 31],
        8: [26, 29, 30, 31],
        10: [26, 30]
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

    // 2.5. Cargar reservas existentes para calcular disponibilidad por fecha y hora
    cargarReservasExistentes();

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

    // CONTROL DEL BOTÓN "ANTERIOR": Evitar que retroceda al pasado
    const btnPrev = document.getElementById('btn-prev-months');
    if (btnPrev) {
        const hoy = new Date();
        const anioActual = hoy.getFullYear();
        const mesActual = hoy.getMonth();

        // Si el calendario muestra el año/mes actual o uno anterior, ocultamos el botón
        if (year < anioActual || (year === anioActual && monthIndex1 <= mesActual)) {
            btnPrev.classList.add('d-none');
        } else {
            btnPrev.classList.remove('d-none');
        }
    }

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

    // 1. Obtener la fecha de hoy a medianoche (limpia de horas)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Inyectar celdas en blanco para los días desfasados del mes
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('day-cell', 'empty-cell');
        gridElement.appendChild(emptyCell);
    }

    // Dibujar los días del mes actual
    for (let day = 1; day <= totalDays; day++) {
        const dayCell = document.createElement('div');
        dayCell.innerText = day;

        // Estructurar la cadena en formato estándar YYYY-MM-DD
        const strMonth = String(monthIndex + 1).padStart(2, '0');
        const strDay = String(day).padStart(2, '0');
        const fullDateStr = `${year}-${strMonth}-${strDay}`;

        dayCell.setAttribute('data-date', fullDateStr);

        // 2. Crear objeto Date para el día de la celda actual
        const fechaCelda = new Date(year, monthIndex, day);

        // 3. CONTROL DE REGLA DE NEGOCIO: Bloquear hoy, fechas pasadas y fechas ya completas
        if (fechaCelda <= hoy) {
            // Si el día es menor o igual a hoy, se bloquea visualmente
            dayCell.classList.add('day-cell', 'disabled-day');
            // Al no tener addEventListener('click'), queda totalmente inerte
        } else if (fechaEstaCompleta(fullDateStr)) {
            dayCell.classList.add('day-cell', 'disabled-day', 'fully-booked-day');
            dayCell.title = 'Este día ya tiene las 3 reservas completas';
        } else {
            // Si es de mañana en adelante y no está completo, el día es válido
            dayCell.classList.add('day-cell');

            // Mantener pintado si coincide con la selección actual
            if (window.fechaSeleccionada === fullDateStr) {
                dayCell.classList.add('selected-day');
            }

            // Manejador de selección de celda (Solo activo para días permitidos)
            dayCell.addEventListener('click', function () {
                document.querySelectorAll('.day-cell.selected-day').forEach(el => el.classList.remove('selected-day'));
                this.classList.add('selected-day');

                window.fechaSeleccionada = this.getAttribute('data-date');

                // Abrir el modal de especificaciones directamente
                abrirModalFecha();
            });
        }

        gridElement.appendChild(dayCell);
    }
}

async function cargarReservasExistentes() {
    try {
        const respuesta = await fetch('/api/reservas');
        if (!respuesta.ok) throw new Error('Error al obtener reservas del servidor.');

        reservasExistentes = await respuesta.json();
        marcarFechasCompletas();
    } catch (error) {
        console.error('No se pudo cargar la disponibilidad de reservas:', error);
    }
}

function getReservasPorFecha(fecha) {
    return reservasExistentes.filter(reserva => reserva.fecha === fecha);
}

function getReservasPorFechaHora(fecha, hora) {
    return reservasExistentes.filter(reserva => reserva.fecha === fecha && reserva.hora === hora);
}

function fechaEstaCompleta(fecha) {
    return getReservasPorFecha(fecha).length >= MAX_RESERVAS_POR_DIA;
}

function horasOcupadasEnFecha(fecha) {
    return getReservasPorFecha(fecha).map(reserva => reserva.hora);
}

function getMesasOcupadasEnFechaHora(fecha, hora) {
    return getReservasPorFechaHora(fecha, hora)
        .map(reserva => parseInt(reserva.mesa, 10))
        .filter(Number.isFinite);
}

function marcarFechasCompletas() {
    document.querySelectorAll('.day-cell[data-date]').forEach(cell => {
        const fecha = cell.getAttribute('data-date');
        if (fechaEstaCompleta(fecha)) {
            cell.classList.add('disabled-day', 'fully-booked-day');
            cell.title = 'Este día ya tiene las 3 reservas completas';
        } else if (cell.classList.contains('fully-booked-day')) {
            cell.classList.remove('disabled-day', 'fully-booked-day');
            cell.title = '';
        }
    });
}

function actualizarOpcionesHora(fecha) {
    const horaSelect = document.getElementById('input-hora');
    if (!horaSelect || !fecha) return;

    const horasOcupadas = horasOcupadasEnFecha(fecha);
    const opciones = horaSelect.querySelectorAll('option');

    opciones.forEach(option => {
        option.disabled = horasOcupadas.includes(option.value);
    });

    if (horasOcupadas.includes(horaSelect.value)) {
        const primeraHoraLibre = Array.from(opciones).find(option => !option.disabled);
        horaSelect.value = primeraHoraLibre ? primeraHoraLibre.value : '';
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
        if (!window.fechaSeleccionada) {
            mostrarAlerta('Selecciona primero una fecha en el calendario.');
            return;
        }

        const fechaInput = document.getElementById('fecha-seleccionada-display');
        if (fechaInput && window.fechaSeleccionada) {
            // Formatear visualmente para el usuario (Ej: 26/05/2026)
            const [anio, mes, dia] = window.fechaSeleccionada.split('-');
            fechaInput.value = `${dia}/${mes}/${anio}`;
        }

        actualizarOpcionesHora(window.fechaSeleccionada);

        const horaInput = document.getElementById('input-hora');
        if (horaInput && !horaInput.value) {
            horaInput.value = HORARIOS_PERMITIDOS.find(hora => !horasOcupadasEnFecha(window.fechaSeleccionada).includes(hora)) || '';
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
            if (fechaEstaCompleta(window.fechaSeleccionada)) {
                mostrarAlerta('Esa fecha ya tiene las 3 reservas completas. Elige otra fecha.');
                return;
            }
            if (!hora) {
                mostrarAlerta('Selecciona una hora para tu reserva.');
                return;
            }
            if (horasOcupadasEnFecha(window.fechaSeleccionada).includes(hora)) {
                mostrarAlerta('Esa hora ya está reservada para esta fecha. Elige otro horario.');
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
    if (!window.fechaSeleccionada) {
        mostrarAlerta('Selecciona primero una fecha en el calendario.');
        return;
    }
    if (fechaEstaCompleta(window.fechaSeleccionada)) {
        mostrarAlerta('Esa fecha ya tiene las 3 reservas completas. Elige otra fecha.');
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
    // 1. Cambiar cantidad de personas
    document.querySelectorAll('.btn-persona').forEach(btn => {
        btn.addEventListener('click', function () {
            const personas = parseInt(this.getAttribute('data-cap'), 10);
            document.querySelectorAll('.btn-persona').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            datosReserva.personas = personas;

            // Ejecuta tu función con la nueva cantidad
            filtrarMesasPorCapacidad(personas);
        });
    });

    // 2. Cambiar de Piso
    document.querySelectorAll('.btn-piso').forEach(boton => {
        boton.addEventListener('click', function () {
            document.querySelectorAll('.btn-piso').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Asegúrate de tener las tres líneas para ocultar todos los pisos
            document.getElementById('mapa-piso-1').classList.add('d-none');
            document.getElementById('mapa-piso-2').classList.add('d-none');
            document.getElementById('mapa-piso-3').classList.add('d-none'); // ← Agregar/Descomentar esta línea

            // Mostrar el piso seleccionado
            const pisoSeleccionado = parseInt(this.getAttribute('data-piso'), 10);
            datosReserva.piso = pisoSeleccionado;

            document.getElementById(`mapa-piso-${pisoSeleccionado}`).classList.remove('d-none');

            // Volver a filtrar
            filtrarMesasPorCapacidad(datosReserva.personas);
        });
    });

    // 3. Click en una mesa (Tu lógica original con parseo numérico seguro)
    document.querySelectorAll('.mesa').forEach(mesa => {
        mesa.addEventListener('click', function () {
            if (this.classList.contains('mesa-bloqueada') || this.disabled) return;

            // Quita la selección de TODAS las mesas para que solo haya una activa
            document.querySelectorAll('.mesa').forEach(m => m.classList.remove('selected'));
            this.classList.add('selected');

            // Guardamos el número de la mesa como un número entero
            datosReserva.mesa = parseInt(this.textContent.trim(), 10);
        });
    });

    // 4. Tu lógica de la terraza se queda exactamente igual...
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

    const pisoActual = datosReserva.piso;
    const mesasDisponibles = mesasDisponiblesPorPiso[pisoActual]?.[cantidad] || [];

    // CRÍTICO: Buscamos solo dentro del contenedor del piso activo
    const contenedorPiso = document.getElementById(`mapa-piso-${pisoActual}`);
    if (!contenedorPiso) return;

    const mesasReservadas = getMesasOcupadasEnFechaHora(datosReserva.fecha, datosReserva.hora);

    // Seleccionamos solo las mesas de ESTE piso
    contenedorPiso.querySelectorAll('.mesa').forEach(mesa => {
        const numeroMesa = parseInt(mesa.textContent.trim(), 10);
        const mesaDisponible = mesasDisponibles.includes(numeroMesa) && !mesasReservadas.includes(numeroMesa);

        if (mesaDisponible) {
            // Habilitar mesa
            mesa.classList.remove('mesa-bloqueada');
            mesa.style.pointerEvents = 'auto';
            mesa.style.opacity = '1';
            mesa.disabled = false; // Añadido por seguridad nativa del navegador
        } else {
            // Bloquear mesa
            mesa.classList.add('mesa-bloqueada');
            mesa.classList.remove('selected');
            mesa.style.pointerEvents = 'none';
            mesa.style.opacity = '0.5';
            mesa.disabled = true;

            // Si la mesa que se bloqueó era la que estaba seleccionada, la limpiamos de forma numérica
            if (datosReserva.mesa === numeroMesa) {
                datosReserva.mesa = null;
            }
        }
    });

    // Tu alerta original intacta
    if (cantidad > 0 && mesasDisponibles.length === 0) {
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

    // 👇 ¡AQUÍ ESTÁ LA CORRECCIÓN! 👇
    // Forzamos a 16 personas si la reserva es para la Terraza
    if (datosReserva.tipoMesa === 'Terraza' || datosReserva.mesa === 'Terraza') {
        datosReserva.personas = 16;
    }
    // 👆 FIN DE LA CORRECCIÓN 👆

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

function actualizarDisponibilidadMesas() {
    const piso = datosReserva.piso;
    const personas = datosReserva.personas;

    // 1. Si el usuario aún no selecciona la cantidad de personas, dejamos las mesas bloqueadas
    if (personas === 0) {
        deshabilitarTodasLasMesas(piso);
        return;
    }

    // 2. Obtener el arreglo de mesas permitidas para este piso y cantidad de personas
    const mesasPermitidas = mesasDisponiblesPorPiso[piso]?.[personas] || [];

    // 3. Buscar el contenedor del piso actual
    const contenedorPiso = document.getElementById(`mapa-piso-${piso}`);
    if (!contenedorPiso) return;

    // 4. Recorrer cada botón de mesa dentro de este piso
    const botonesMesas = contenedorPiso.querySelectorAll('.mesa');

    botonesMesas.forEach(boton => {
        // Convertimos el número visual del botón a un entero (ej: "16" -> 16)
        const numeroMesa = parseInt(boton.textContent.trim(), 10);

        // 5. Si el número está en la lista de permitidas, se habilita; si no, se bloquea
        if (mesasPermitidas.includes(numeroMesa)) {
            boton.disabled = false;
            boton.classList.remove('mesa-bloqueada'); // Por si manejas esta clase en CSS
        } else {
            boton.disabled = true;
            boton.classList.add('mesa-bloqueada');

            // Si la mesa que estaba seleccionada se acaba de bloquear, la deseleccionamos
            if (datosReserva.mesa === numeroMesa) {
                boton.classList.remove('selected'); // O la clase de selección que uses
                datosReserva.mesa = null;
            }
        }
    });
}

// Función auxiliar para bloquear todo por defecto si no han elegido personas
function deshabilitarTodasLasMesas(piso) {
    const contenedorPiso = document.getElementById(`mapa-piso-${piso}`);
    if (contenedorPiso) {
        contenedorPiso.querySelectorAll('.mesa').forEach(boton => {
            boton.disabled = true;
            boton.classList.add('mesa-bloqueada');
        });
    }
}