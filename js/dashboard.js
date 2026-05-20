document.addEventListener('DOMContentLoaded', () => {
    // 1. Datos simulados (el arreglo simple de objetos como solicitaste)
    // He replicado los nombres, teléfonos, fechas y estados de tu captura
    const reservationsData = [
        { id: 'R-001', name: 'Mariela Torres', phone: '+51 987 654 321', date: '15 may 2026', time: '13:00', people: 4, status: 'Confirmada' },
        { id: 'R-002', name: 'Carlos Quispe', phone: '+51 976 543 210', date: '15 may 2026', time: '14:30', people: 2, status: 'Pendiente' },
        { id: 'R-003', name: 'Lucía Mendoza', phone: '+51 965 432 109', date: '16 may 2026', time: '12:00', people: 6, status: 'Pendiente' },
        { id: 'R-004', name: 'Rodrigo Salinas', phone: '+51 954 321 098', date: '16 may 2026', time: '13:30', people: 3, status: 'Confirmada' },
        { id: 'R-005', name: 'Ana Velásquez', phone: '+51 943 210 987', date: '17 may 2026', time: '19:00', people: 2, status: 'Cancelada' },
        { id: 'R-006', name: 'Jorge Paredes', phone: '+51 932 109 876', date: '17 may 2026', time: '20:00', people: 5, status: 'Pendiente' },
        { id: 'R-007', name: 'Sofía Cárdenas', phone: '+51 921 098 765', date: '18 may 2026', time: '13:00', people: 4, status: 'Confirmada' },
        { id: 'R-008', name: 'Miguel Flores', phone: '+51 910 987 654', date: '18 may 2026', time: '14:00', people: 8, status: 'Pendiente' },
        { id: 'R-009', name: 'Patricia Huanca', phone: '+51 999 888 777', date: '19 may 2026', time: '12:30', people: 2, status: 'Confirmada' },
        { id: 'R-010', name: 'Daniel Chávez', phone: '+51 888 777 666', date: '19 may 2026', time: '19:30', people: 3, status: 'Cancelada' }
    ];

    const tableBody = document.getElementById('tableBody');

    // 2. Función simple para renderizar la tabla
    function renderTable() {
        // Limpiamos la tabla por si acaso
        tableBody.innerHTML = ''; 

        // Ciclo simple (sin arraylist complejo)
        for (let i = 0; i < reservationsData.length; i++) {
            const reserva = reservationsData[i];
            
            // Determinamos los iconos de acción según el estado
            let actionIconsHTML = '';
            if (reserva.status === 'Pendiente') {
                actionIconsHTML = `
                    <button class="action-btn icon-check" title="Confirmar"><i class="bi bi-check2"></i></button>
                    <button class="action-btn icon-cancel" title="Cancelar"><i class="bi bi-x"></i></button>
                `;
            }

            // Generamos el HTML de la fila (respetando los estilos de la captura)
            const rowHTML = `
                <tr class="ps-3 pe-3">
                    <th scope="row" class="ps-3 small text-muted font-monospace">${reserva.id}</th>
                    <td class="small fw-semibold">
                        ${reserva.name}<br>
                        <span class="text-muted extra-small">${reserva.phone}</span>
                    </td>
                    <td class="small">${reserva.date}</td>
                    <td class="small">${reserva.time}</td>
                    <td class="small ps-4 fw-medium text-dark">${reserva.people}</td>
                    <td>
                        ${getStatusBadgeHTML(reserva.status)}
                    </td>
                    <td class="text-end pe-3 d-flex align-items-center justify-content-end gap-1">
                        <button class="action-btn" title="Ver detalles"><i class="bi bi-eye"></i> Ver</button>
                        ${actionIconsHTML}
                    </td>
                </tr>
            `;

            // Insertamos la fila al final del body
            tableBody.insertAdjacentHTML('beforeend', rowHTML);
        }
    }

    // 3. Función helper simple para generar el badge de estado
    function getStatusBadgeHTML(status) {
        if (status === 'Confirmada') {
            return `<span class="badge-status confirmed"><i class="bi bi-check-circle-fill extra-small"></i> ${status}</span>`;
        } else if (status === 'Pendiente') {
            return `<span class="badge-status pending"><i class="bi bi-clock-history extra-small"></i> ${status}</span>`;
        } else if (status === 'Cancelada') {
            return `<span class="badge-status cancelled"><i class="bi bi-x-circle-fill extra-small"></i> ${status}</span>`;
        }
        return status; // Por si acaso
    }

    // 4. Ejecutamos la función para llenar la tabla al cargar
    renderTable();

});