/* ===========================================
   RESERVACIÓN - JAVASCRIPT MODERNO
   =========================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar calendario
    inicializarCalendario();

    // Inicializar wizard
    inicializarWizard();

    // Inicializar selectores
    inicializarSelectores();
});

/* ===========================================
   CALENDARIO
   =========================================== */

function inicializarCalendario() {
    console.log('Inicializando calendario...');
    var calendarEl = document.getElementById('calendar');
    
    if (!calendarEl) {
        console.error('No se encontró el elemento #calendar');
        return;
    }

    var hoy = new Date();
    var unMesDespues = new Date();
    unMesDespues.setDate(hoy.getDate() + 30);

    var calendar = new FullCalendar.Calendar(calendarEl, {
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
            // Guardar fecha seleccionada
            window.fechaSeleccionada = info.dateStr;

            // Si querías aplicar estilos al hacer clic, debe ser aquí adentro:
            info.dayEl.style.backgroundColor = '#f0f0f0'; 

            // Avanzar al siguiente paso
            if (typeof cambiarPaso === "function") {
                cambiarPaso(2);
            }
        }
    });

    calendar.render();
}

/* ===========================================
   WIZARD LOGIC
   =========================================== */

let pasoActual = 1;
let datosReserva = {
    fecha: null,
    personas: 0,
    piso: 2,
    mesa: null
};

function inicializarWizard() {
    // Configurar navegación
    document.getElementById('btn-prev').addEventListener('click', () => cambiarPaso(pasoActual - 1));
    document.getElementById('btn-next').addEventListener('click', () => cambiarPaso(pasoActual + 1));

    // Mostrar primer paso
    mostrarPaso(1);
}

function cambiarPaso(nuevoPaso) {
    // Validar paso actual antes de avanzar
    if (!validarPasoActual()) return;

    // Actualizar estado
    pasoActual = nuevoPaso;

    // Actualizar UI
    actualizarWizardUI();
    mostrarPaso(nuevoPaso);
}

function validarPasoActual() {
    switch(pasoActual) {
        case 1:
            if (!window.fechaSeleccionada) {
                mostrarAlerta('Por favor selecciona una fecha en el calendario.');
                return false;
            }
            datosReserva.fecha = window.fechaSeleccionada;
            return true;

        case 2:
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

function mostrarPaso(paso) {
    // Ocultar todos los pasos
    document.querySelectorAll('.wizard-step-content').forEach(content => {
        content.classList.remove('active');
    });

    // Mostrar paso actual
    const pasoElement = document.getElementById(`step-${paso}`);
    if (pasoElement) {
        pasoElement.classList.add('active');
    }

    // Actualizar navegación
    actualizarNavegacion();
}

function actualizarWizardUI() {
    // Actualizar indicadores de progreso
    document.querySelectorAll('.wizard-step').forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.remove('active', 'completed');

        if (stepNumber === pasoActual) {
            step.classList.add('active');
        } else if (stepNumber < pasoActual) {
            step.classList.add('completed');
        }
    });

    // Actualizar resumen en paso 3
    if (pasoActual === 3) {
        actualizarResumen();
    }
}

function actualizarNavegacion() {
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');

    // Botón anterior
    if (pasoActual === 1) {
        btnPrev.style.display = 'none';
    } else {
        btnPrev.style.display = 'block';
    }

    // Botón siguiente
    if (pasoActual === 3) {
        btnNext.innerHTML = '<i class="bi bi-check-circle me-2"></i>Confirmar Reserva';
        btnNext.className = 'btn btn-success';
        btnNext.onclick = () => finalizarReserva();
    } else {
        btnNext.innerHTML = 'Siguiente<i class="bi bi-arrow-right ms-2"></i>';
        btnNext.className = 'btn btn-primary';
        btnNext.onclick = () => cambiarPaso(pasoActual + 1);
    }
}

/* ===========================================
   SELECTORES
   =========================================== */

function inicializarSelectores() {
    // Selector de personas
    document.querySelectorAll('.btn-persona').forEach(btn => {
        btn.addEventListener('click', function() {
            const personas = parseInt(this.getAttribute('data-cap'));

            // Actualizar UI
            document.querySelectorAll('.btn-persona').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Guardar selección
            datosReserva.personas = personas;

            // Filtrar mesas
            filtrarMesasPorCapacidad(personas);
        });
    });

    // Selector de piso
    document.querySelectorAll('.btn-piso').forEach(btn => {
        btn.addEventListener('click', function() {
            const piso = parseInt(this.id.replace('piso-', '')) || 2;

            // Actualizar UI
            document.querySelectorAll('.btn-piso').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Guardar selección
            datosReserva.piso = piso;

            // Cambiar mapa de piso
            cambiarPiso(piso);
        });
    });

    // Selector de mesas
    document.querySelectorAll('.mesa').forEach(mesa => {
        mesa.addEventListener('click', function() {
            if (this.classList.contains('mesa-bloqueada')) return;

            // Actualizar UI
            document.querySelectorAll('.mesa').forEach(m => m.classList.remove('selected'));
            this.classList.add('selected');

            // Guardar selección
            datosReserva.mesa = this.textContent.trim();
        });
    });
}

function filtrarMesasPorCapacidad(cantidad) {
    document.querySelectorAll('.mesa').forEach(mesa => {
        const capacidad = parseInt(mesa.getAttribute('data-capacidad'));

        if (capacidad >= cantidad) {
            mesa.classList.remove('mesa-bloqueada');
            mesa.style.pointerEvents = 'auto';
            mesa.style.opacity = '1';
        } else {
            mesa.classList.add('mesa-bloqueada');
            mesa.classList.remove('selected');
            mesa.style.pointerEvents = 'none';
            mesa.style.opacity = '0.5';

            // Limpiar selección si la mesa ya no está disponible
            if (datosReserva.mesa === mesa.textContent.trim()) {
                datosReserva.mesa = null;
            }
        }
    });
}

function cambiarPiso(piso) {
    // Aquí puedes implementar la lógica para cambiar entre diferentes mapas de piso
    // Por ahora, mantenemos el mismo mapa pero podrías tener diferentes layouts
    console.log('Cambiando a piso:', piso);
}

/* ===========================================
   RESUMEN Y CONFIRMACIÓN
   =========================================== */

function actualizarResumen() {
    // Formatear fecha
    if (datosReserva.fecha) {
        const fecha = new Date(datosReserva.fecha);
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('resumen-fecha-hora').textContent =
            fecha.toLocaleDateString('es-ES', opciones) + ' a las --:--';
    }

    // Actualizar otros campos
    document.getElementById('resumen-piso').textContent = `Piso ${datosReserva.piso}`;
    document.getElementById('resumen-personas').textContent = `${datosReserva.personas} personas`;
    document.getElementById('resumen-mesa').textContent = datosReserva.mesa || 'Ninguna';
}

function finalizarReserva() {
    // Aquí puedes implementar la lógica para enviar la reserva al servidor
    // Por ahora, mostramos un mensaje de éxito

    // Crear mensaje de confirmación
    const mensaje = `
        ¡Reserva confirmada!

        📅 Fecha: ${datosReserva.fecha}
        👥 Personas: ${datosReserva.personas}
        🏢 Piso: ${datosReserva.piso}
        🍽️ Mesa: ${datosReserva.mesa}

        Te esperamos en El Gran Pez.
        Recibirás una llamada de confirmación pronto.
    `;

    alert(mensaje);

    // Resetear wizard
    resetearWizard();
}

function resetearWizard() {
    // Resetear datos
    datosReserva = {
        fecha: null,
        personas: 0,
        piso: 2,
        mesa: null
    };
    window.fechaSeleccionada = null;
    pasoActual = 1;

    // Resetear UI
    document.querySelectorAll('.btn-persona, .btn-piso').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.mesa').forEach(mesa => {
        mesa.classList.remove('selected', 'mesa-bloqueada');
        mesa.style.pointerEvents = 'auto';
        mesa.style.opacity = '1';
    });

    // Volver al primer paso
    actualizarWizardUI();
    mostrarPaso(1);
}

/* ===========================================
   UTILIDADES
   =========================================== */

// 1. Función para mostrar alertas (está perfecta)
function mostrarAlerta(mensaje) {
    const alerta = document.createElement('div');
    alerta.className = 'alert alert-warning alert-dismissible fade show position-fixed';
    alerta.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alerta.innerHTML = `
        <i class="bi bi-exclamation-triangle me-2"></i>
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alerta);

    setTimeout(() => {
        if (alerta.parentNode) {
            alerta.remove();
        }
    }, 5000);
}

// 2. Lógica para manejar el clic en las mesas
// Esperamos a que el DOM cargue para que encuentre los botones
document.addEventListener('DOMContentLoaded', function() {
    
    // Suponiendo que tus mesas tienen la clase '.mesa-btn'
    const botonesMesas = document.querySelectorAll('.mesa-btn');

    botonesMesas.forEach(boton => {
        boton.addEventListener('click', function() {
            // Guardamos el número de la mesa que tocaron
            const mesaPorConfirmar = this.innerText;

            // Ponemos el número en el texto del modal
            const nroMesaEl = document.getElementById('nro-mesa-modal');
            if (nroMesaEl) {
                nroMesaEl.innerText = mesaPorConfirmar;
            }

            // Mostramos el modal de Bootstrap
            const modalEl = document.getElementById('modalConfirmarMesa');
            if (modalEl) {
                const myModal = new bootstrap.Modal(modalEl);
                myModal.show();
            } else {
                mostrarAlerta('Error: No se encontró el modal en el HTML');
            }
        });
    });
});

// Evento para el botón "SÍ, ESTOY SEGURO" dentro del modal
document.getElementById('btn-aceptar-mesa').addEventListener('click', function() {
    // 1. Ahora sí, guardamos la mesa como la definitiva
    mesaFinal = mesaPorConfirmar;

    // 2. Pintamos la mesa en el mapa para que el usuario vea que se guardó
    document.querySelectorAll('.mesa').forEach(m => m.classList.remove('mesa-seleccionada'));
    
    // Buscamos la mesa que coincide con el texto para ponerle el color negro
    document.querySelectorAll('.mesa').forEach(m => {
        if(m.innerText === mesaFinal) {
            m.classList.add('mesa-seleccionada');
        }
    });

    // 3. Cerramos el modal
    const modalElement = document.getElementById('modalConfirmarMesa');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    modalInstance.hide();

    console.log("Mesa confirmada por el usuario: " + mesaFinal);
});

/* Confirmacion para la reservacion */

function irAConfirmacion() {
    // 1. Mostrar/Ocultar secciones
    document.getElementById('seccion-seleccionar').style.display = 'none';
    document.getElementById('seccion-confirmar').style.display = 'block';

    // 2. Llenar los datos del resumen
    // Asumiendo que guardaste la fecha y hora en variables anteriormente
    document.getElementById('resumen-fecha-hora').innerText = `${fechaSeleccionada} a las ${horaSeleccionada}`;
    document.getElementById('resumen-piso').innerText = "Piso " + pisoActual;
    document.getElementById('resumen-personas').innerText = personasElegidas;
    document.getElementById('resumen-mesa').innerText = "Mesa " + mesaFinal;

    // 3. Actualizar el Wizard Header
    actualizarPasosWizard(3);
}

function finalizarReserva() {
    // Aquí es donde harías el envío a tu base de datos (fetch o AJAX)
    alert("¡Reserva confirmada con éxito! Te esperamos.");
    // Redirigir a una página de agradecimiento o inicio
    window.location.href = "inicio.html";
}

function irAConfirmacion() {
    // 1. Ocultar la selección de mesas y mostrar la confirmación
    document.getElementById('seccion-seleccionar').style.display = 'none';
    document.getElementById('seccion-confirmar').style.display = 'block';

    // 2. CORRECCIÓN DEL HEADER (Sombrear "Confirmar")
    // Buscamos los contenedores de los pasos por su ID o posición
    const pasos = document.querySelectorAll('.wizard-step'); 
    
    // Paso 1: Cuando (Ya pasó)
    pasos[0].classList.remove('current');
    pasos[0].classList.add('pending');

    // Paso 2: Seleccionar (Ya pasó, le quitamos el sombreado negro)
    pasos[1].classList.remove('current');
    pasos[1].classList.add('pending');

    // Paso 3: Confirmar (ESTAMOS AQUÍ - Sombrear en negro)
    pasos[2].classList.add('current');
    pasos[2].classList.remove('pending');

    // 3. Llenar los datos finales en el cuadro de resumen
    document.getElementById('resumen-mesa').innerText = "Mesa " + mesaFinal;
    document.getElementById('resumen-personas').innerText = personasElegidas;
}

function atrasASeleccionar() {
    document.getElementById('seccion-confirmar').style.display = 'none';
    document.getElementById('seccion-seleccionar').style.display = 'block';

    const pasos = document.querySelectorAll('.wizard-step');
    // Volvemos a poner en negro "Seleccionar"
    pasos[1].classList.add('current');
    pasos[2].classList.remove('current');
}

function irAConfirmacion() {
    // 1. Mostrar la sección
    document.getElementById('seccion-seleccionar').style.display = 'none';
    document.getElementById('seccion-confirmar').style.display = 'block';

    // 2. Actualizar el Wizard (Sombreado Negro en 'Confirmar')
    const pasos = document.querySelectorAll('.wizard-step');
    if (pasos.length >= 3) {
        // Quitamos el negro de 'Seleccionar'
        pasos[1].classList.remove('current');
        pasos[1].classList.add('pending');
        
        // Ponemos negro en 'Confirmar'
        pasos[2].classList.add('current');
        pasos[2].classList.remove('pending');
    }

    // 3. Pasar los datos finales
    document.getElementById('resumen-mesa').innerText = "Mesa " + mesaFinal;
    document.getElementById('resumen-personas').innerText = personasElegidas;
    // Agrega aquí los de fecha y piso si ya los tienes guardados
}