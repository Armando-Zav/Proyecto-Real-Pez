document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar');
    
    // Configuramos el rango: Desde hoy hasta dentro de 30 días
    var hoy = new Date();
    var unMesDespues = new Date();
    unMesDespues.setDate(hoy.getDate() + 30); // Sumamos exactamente 30 días

    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        selectable: true,
        headerToolbar: {
            left: 'prev',
            center: 'title',
            right: 'next'
        },
        // ESTO BLOQUEA EL CALENDARIO AL RANGO QUE BUSCAS
        validRange: {
            start: hoy,
            end: unMesDespues
        },
        
        dateClick: function(info) {
            document.getElementById('fechaSeleccionada').innerText = info.dateStr;
            var modalElement = document.getElementById('modalReserva');
            var myModal = new bootstrap.Modal(modalElement);
            myModal.show();
        }
    });

    calendar.render();
});

// Ejemplo de cómo cambiar el sombreado visualmente al pasar al paso 2
function irAPasoDos() {
    const pasos = document.querySelectorAll('.wizard-step');
    
    // Quitamos 'current' al paso 1 y se lo damos al paso 2
    pasos[0].classList.remove('current');
    pasos[0].classList.add('pending');
    
    pasos[1].classList.add('current');
    pasos[1].classList.remove('pending');
}

/* Funciones para la seccion "Seleccionar" */

function irASeleccionar() {
    const hora = document.getElementById('hora-seleccionada').value;

    if (hora === "") {
        alert("Por favor, selecciona una hora para tu reserva.");
        return; // Detiene el cambio de sección
    }

    // Si hay hora, procedemos con el cambio de sección que ya tenías
    const modalElement = document.getElementById('modalReserva');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.hide();

    document.getElementById('seccion-cuando').style.display = 'none';
    document.getElementById('seccion-seleccionar').style.display = 'block';

    const pasos = document.querySelectorAll('.wizard-step');
    pasos[0].classList.replace('current', 'pending');
    pasos[1].classList.replace('pending', 'current');
}

/* Funcion para seleccionar la hora */

// Variable para guardar la selección
let horaElegida = "";

// Escuchar clics en los botones de hora
document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('btn-hora')) {
        // 1. Quitar la clase 'active' de todos los botones de hora
        document.querySelectorAll('.btn-hora').forEach(btn => {
            btn.classList.remove('btn-active-hora'); // Usaremos una clase personalizada
            btn.classList.add('btn-outline-dark');
        });

        // 2. Resaltar el botón clickeado
        e.target.classList.remove('btn-outline-dark');
        e.target.classList.add('btn-active-hora');
        
        // 3. Guardar el valor
        horaElegida = e.target.innerText;
        document.getElementById('hora-seleccionada').value = horaElegida;
        
        console.log("Hora seleccionada: " + horaElegida);
    }
});

/* Botones y seleccion de mesas */

// VARIABLES GLOBALES PARA LA RESERVA
let personasElegidas = 0;
let mesaFinal = null;

// 1. MANEJAR SELECCIÓN DE PERSONAS
document.querySelectorAll('.btn-persona').forEach(boton => {
    boton.addEventListener('click', function() {
        // Estética: Resaltar botón seleccionado
        document.querySelectorAll('.btn-persona').forEach(b => {
            b.classList.remove('btn-dark', 'text-white', 'active');
            b.classList.add('btn-outline-dark');
        });
        this.classList.remove('btn-outline-dark');
        this.classList.add('btn-dark', 'text-white', 'active');

        // GUARDAR CANTIDAD: Aquí está el truco, actualizamos la variable global
        personasElegidas = parseInt(this.getAttribute('data-cap'));
        
        // (Opcional) Si usas un input hidden, actualízalo también:
        const inputPersonas = document.getElementById('cantidad-personas-elegida');
        if(inputPersonas) inputPersonas.value = personasElegidas;

        // FILTRAR MESAS
        filtrarMesasPorCapacidad(personasElegidas);
    });
});

function filtrarMesasPorCapacidad(cantidad) {
    document.querySelectorAll('.mesa').forEach(mesa => {
        const capacidadMesa = parseInt(mesa.getAttribute('data-capacidad'));

        if (capacidadMesa >= cantidad) {
            mesa.classList.remove('mesa-bloqueada');
            mesa.classList.add('mesa-disponible');
            mesa.style.pointerEvents = "auto"; 
        } else {
            mesa.classList.add('mesa-bloqueada');
            mesa.classList.remove('mesa-disponible', 'mesa-seleccionada');
            mesa.style.pointerEvents = "none";
            // Si la mesa que estaba seleccionada ahora se bloquea, la limpiamos
            if(mesaFinal === mesa.innerText) mesaFinal = null;
        }
    });
}

// 2. SELECCIÓN DE MESA
document.querySelectorAll('.mesa').forEach(mesa => {
    mesa.addEventListener('click', function() {
        if (!this.classList.contains('mesa-bloqueada')) {
            document.querySelectorAll('.mesa').forEach(m => m.classList.remove('mesa-seleccionada'));
            this.classList.add('mesa-seleccionada');
            mesaFinal = this.innerText;
            console.log("Mesa seleccionada: " + mesaFinal);
        }
    });
});

// 3. BOTÓN SIGUIENTE (VALIDACIÓN)
function siguienteAConfirmar() {
    // Validamos usando la variable global 'personasElegidas'
    if (personasElegidas === 0) {
        alert("Por favor, selecciona cuántas personas vendrán.");
        return;
    }

    if (!mesaFinal) {
        alert("Por favor, selecciona una mesa en el mapa.");
        return;
    }

    // Si todo está bien, pasamos a la sección final
    irAConfirmacion();
}

function irAConfirmacion() {
    document.getElementById('seccion-seleccionar').style.display = 'none';
    document.getElementById('seccion-confirmar').style.display = 'block';

    // Actualizar wizard header (si tienes los pasos con clase wizard-step)
    const pasos = document.querySelectorAll('.wizard-step');
    if(pasos.length >= 3) {
        pasos[1].classList.replace('current', 'pending');
        pasos[2].classList.replace('pending', 'current');
    }

    // Mostrar resumen (Asegúrate que estos IDs existan en tu HTML de confirmación)
    if(document.getElementById('resumen-mesa')) {
        document.getElementById('resumen-mesa').innerText = mesaFinal;
    }
    if(document.getElementById('resumen-personas')) {
        document.getElementById('resumen-personas').innerText = personasElegidas;
    }
}

/* Ventana emergente para confirmar la reserva */

// Variable temporal para guardar la mesa antes de confirmar
let mesaPorConfirmar = null;

// Modifica tu evento de clic de las mesas:
document.querySelectorAll('.mesa').forEach(mesa => {
    mesa.addEventListener('click', function() {
        if (!this.classList.contains('mesa-bloqueada')) {
            // 1. Guardamos el número de la mesa que tocaron
            mesaPorConfirmar = this.innerText;

            // 2. Ponemos el número en el texto del modal
            document.getElementById('nro-mesa-modal').innerText = mesaPorConfirmar;

            // 3. Mostramos el modal de Bootstrap
            const myModal = new bootstrap.Modal(document.getElementById('modalConfirmarMesa'));
            myModal.show();
        }
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