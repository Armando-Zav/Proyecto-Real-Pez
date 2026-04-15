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
    // Cerrar modal
    const modalElement = document.getElementById('modalReserva');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.hide();

    // Cambiar vista
    document.getElementById('seccion-cuando').style.display = 'none';
    document.getElementById('seccion-seleccionar').style.display = 'block';

    // Actualizar barra superior (ajusta las clases según tu CSS)
    const pasos = document.querySelectorAll('.wizard-step');
    pasos[0].classList.replace('current', 'pending');
    pasos[1].classList.replace('pending', 'current');
}

function atrasACuando() {
    document.getElementById('seccion-cuando').style.display = 'block';
    document.getElementById('seccion-seleccionar').style.display = 'none';

    const pasos = document.querySelectorAll('.wizard-step');
    pasos[1].classList.replace('current', 'pending');
    pasos[0].classList.replace('pending', 'current');
}