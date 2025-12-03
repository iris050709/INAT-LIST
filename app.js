// ---------------------------
// app.js - lógica completa
// ---------------------------

// ---------- Inicialización de datos (solo primera vez) ----------
if (!localStorage.getItem('users_init')) {
  // usuarios: admin y ejemplo
  const usuarios = [
    { id: 1, nombre: 'Admin', usuario: 'admin', password: '123456', rol: 'admin' },
    { id: 2, nombre: 'Alumno Ejemplo', usuario: 'alumno1', password: '123456', rol: 'alumno' }
  ];
  localStorage.setItem('usuarios', JSON.stringify(usuarios));

  // estructura alumnos/pagos/asistencias separadas (alumnos usados por admin)
  localStorage.setItem('alumnos', JSON.stringify([
    { id: 2, nombre: 'Alumno Ejemplo', usuario: 'alumno1', pass: '123456' }
  ]));
  localStorage.setItem('asistencias', JSON.stringify({})); // { alumnoId: [ '2025-11-04', ... ] }
  localStorage.setItem('pagos', JSON.stringify({})); // { alumnoId: [ {mes, monto, estado, fecha} ] }

  localStorage.setItem('users_init', '1');
}

// ---------- helpers ----------
function getUsuarios(){ return JSON.parse(localStorage.getItem('usuarios') || '[]'); }
function setUsuarios(u){ localStorage.setItem('usuarios', JSON.stringify(u)); }
function getAlumnos(){ return JSON.parse(localStorage.getItem('alumnos') || '[]'); }
function setAlumnos(a){ localStorage.setItem('alumnos', JSON.stringify(a)); }
function getAsist(){ return JSON.parse(localStorage.getItem('asistencias') || '{}'); }
function setAsist(a){ localStorage.setItem('asistencias', JSON.stringify(a)); }
function getPagos(){ return JSON.parse(localStorage.getItem('pagos') || '{}'); }
function setPagos(p){ localStorage.setItem('pagos', JSON.stringify(p)); }

function formatISO(d){ // YYYY-MM-DD
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function prettyDate(iso){ const d=new Date(iso); return d.toLocaleDateString(); }

// ---------- Sesión / Login ----------
function doLogin(){
  const u = document.getElementById('loginUsuario').value.trim();
  const p = document.getElementById('loginPassword').value.trim();
  const users = getUsuarios();
  const found = users.find(x=> x.usuario === u && x.password === p);
  if(!found){ document.getElementById('loginError').textContent = 'Credenciales incorrectas'; return; }
  localStorage.setItem('sesion', JSON.stringify(found));
  if(found.rol === 'admin') window.location = 'admin.html'; else window.location = 'alumno.html';
}
function logout(){ localStorage.removeItem('sesion'); window.location = 'index.html' || 'index.html'; }

// ---------- Admin: Tabla alumnos (render) ----------
function renderAlumnos(){
  if(!document.getElementById('tablaAlumnos')) return;
  const alumnos = getAlumnos();
  let html='';
  alumnos.forEach(a=>{
    html += `<tr>
      <td>${a.id}</td>
      <td>${a.nombre}</td>
      <td>${a.usuario}</td>
      <td>
        <button class="btn btn-sm btn-outline-light me-1" onclick="openEditAlumno(${a.id})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="deleteAlumno(${a.id})">Eliminar</button>
      </td>
    </tr>`;
  });
  document.getElementById('tablaAlumnos').innerHTML = html;

  // llenar selects para pagos/asistencias/registro
  const selA = document.getElementById('selectAsistencia');
  const selP = document.getElementById('selectPagos');
  const payAlumno = document.getElementById('payAlumno');
  const registroAlumno = document.getElementById('registroAlumno');
  if(selA) selA.innerHTML = alumnos.map(a=> `<option value="${a.id}">${a.nombre}</option>`).join('');
  if(selP) selP.innerHTML = alumnos.map(a=> `<option value="${a.id}">${a.nombre}</option>`).join('');
  if(payAlumno) payAlumno.innerHTML = alumnos.map(a=> `<option value="${a.id}">${a.nombre}</option>`).join('');
  if(registroAlumno) registroAlumno.innerHTML = '<option value="">-- seleccionar --</option>' + alumnos.map(a=> `<option value="${a.id}">${a.nombre}</option>`).join('');
}

// ---------- Admin: Add / Edit alumno ----------
let modalAlumno; // bootstrap modal instance
document.addEventListener('DOMContentLoaded', ()=>{ if(document.getElementById('modalAlumno')) modalAlumno = new bootstrap.Modal(document.getElementById('modalAlumno')); renderAlumnos(); initAttendanceMatrix(); renderPaymentsTable(); });

function openAddAlumno(){
  document.getElementById('modalAlumnoTitle').textContent = 'Nuevo Alumno';
  document.getElementById('mdlId').value = '';
  document.getElementById('mdlNombre').value = '';
  document.getElementById('mdlUsuario').value = '';
  document.getElementById('mdlPass').value = '';
  modalAlumno.show();
}

function openEditAlumno(id){
  const a = getAlumnos().find(x=>x.id==id);
  if(!a) return alert('Alumno no existe');
  document.getElementById('modalAlumnoTitle').textContent = 'Editar Alumno';
  document.getElementById('mdlId').value = a.id;
  document.getElementById('mdlNombre').value = a.nombre;
  document.getElementById('mdlUsuario').value = a.usuario;
  document.getElementById('mdlPass').value = a.pass;
  modalAlumno.show();
}

function togglePass(id, btn){
  const a = getAlumnos().find(x=>x.id==id);
  if(!a) return;
  if(btn.dataset.show === '1'){
    btn.textContent = 'Ver Pass';
    btn.dataset.show = '0';
    return alert(`Contraseña: ${a.pass}`);
  } else {
    btn.textContent = 'Ocultar Pass';
    btn.dataset.show = '1';
    return alert(`Contraseña: ${a.pass}`);
  }
}

function saveAlumno(){
  const id = document.getElementById('mdlId').value;
  const nombre = document.getElementById('mdlNombre').value.trim();
  const usuario = document.getElementById('mdlUsuario').value.trim();
  const pass = document.getElementById('mdlPass').value.trim();
  if(!nombre||!usuario||!pass) return alert('Rellena todos los campos');

  let alumnos = getAlumnos();
  if(id){
    // editar
    alumnos = alumnos.map(a => a.id==id ? { ...a, nombre, usuario, pass } : a);
    setAlumnos(alumnos);
    // también actualizar usuarios list (login)
    let usuarios = getUsuarios();
    usuarios = usuarios.map(u => u.id==Number(id) ? { ...u, nombre, usuario, password: pass } : u);
    setUsuarios(usuarios);
  } else {
    // nuevo
    const nid = Date.now();
    alumnos.push({ id: nid, nombre, usuario, pass });
    setAlumnos(alumnos);
    // agregar a usuarios para login (rol alumno)
    const usuarios = getUsuarios();
    usuarios.push({ id: nid, nombre, usuario, password: pass, rol: 'alumno' });
    setUsuarios(usuarios);
  }
  modalAlumno.hide();
  renderAlumnos();
  initAttendanceMatrix(); renderPaymentsTable();
}

function deleteAlumno(id){
  if(!confirm('Eliminar alumno?')) return;
  let alumnos = getAlumnos().filter(a=>a.id!=id);
  setAlumnos(alumnos);
  // quitar de usuarios
  let usuarios = getUsuarios().filter(u=>u.id!=id);
  setUsuarios(usuarios);
  // borrar asist/pagos
  const a = getAsist(); delete a[id]; setAsist(a);
  const p = getPagos(); delete p[id]; setPagos(p);
  renderAlumnos(); initAttendanceMatrix(); renderPaymentsTable();
}

// ---------- Toggle mostrar contraseña (modal button helper) ----------
function togglePass(){ const inp = document.getElementById('mdlPass'); if(inp.type==='password') inp.type='text'; else inp.type='password'; }

// ---------- Attendance: fechas martes/jueves próximas ----------
function nextTueThuDates(count=8){
  const out=[]; let d=new Date();
  // start from today
  while(out.length < count){
    d.setDate(d.getDate()+1);
    const day = d.getDay(); // 0 dom,1 lun,2 mar,3 mie,4 jue,5 vie,6 sab
    if(day===3 || day===5){
      out.push(new Date(d));
    }
  }
  return out;
}

let attendanceDates = []; // array of ISO dates
function initAttendanceMatrix(){
  attendanceDates = nextTueThuDates(8).map(d => formatISO(d));
  renderAttendanceTable();
}

function refreshAttendanceMatrix(){ initAttendanceMatrix(); alert('Fechas actualizadas'); }

// ---------- render attendance table (admin) ----------
function renderAttendanceTable(){
  if(!document.getElementById('theadAttendance')) return;
  const th = document.getElementById('theadAttendance');
  const tb = document.getElementById('tbodyAttendance');
  const alumnos = getAlumnos();
  const asist = getAsist();

  // header
  let header = '<tr><th>Alumno</th>';
  attendanceDates.forEach(dt => header += `<th class="text-center small">${prettyDate(dt)}</th>`);
  header += '</tr>';
  th.innerHTML = header;

  // body
  let body = '';
  alumnos.forEach(a=>{
    body += `<tr><td>${a.nombre}</td>`;
    attendanceDates.forEach(dt=>{
      const present = (asist[a.id] || []).includes(dt);
      body += `<td class="text-center align-middle"><button class="btn btn-sm ${present? 'btn-success' : 'btn-outline-light'}" onclick="toggleAttendance(${a.id}, '${dt}', this)">${present? 'Presente' : 'Ausente'}</button></td>`;
    });
    body += '</tr>';
  });
  tb.innerHTML = body;
}

function toggleAttendance(alumnoId, isoDate, btn){
  const asist = getAsist();
  if(!asist[alumnoId]) asist[alumnoId] = [];
  const idx = asist[alumnoId].indexOf(isoDate);
  if(idx === -1){
    asist[alumnoId].push(isoDate);
  } else {
    asist[alumnoId].splice(idx,1);
  }
  setAsist(asist);
  renderAttendanceTable();
}

// ---------- Payments ----------
function renderPaymentsTable(){
  if(!document.getElementById('paymentsTable')) return;
  const pagos = getPagos(); const alumnos = getAlumnos();
  let html = `<table class="table table-dark table-striped"><thead class="text-warning"><tr><th>Alumno</th><th>Mes</th><th>Monto</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>`;
  Object.keys(pagos).forEach(id=>{
    pagos[id].forEach((p, idx)=>{
      const a = alumnos.find(x=>x.id==id) || {nombre:'--'};
      html += `<tr>
        <td>${a.nombre}</td>
        <td>${p.mes}</td>
        <td>$${p.monto}</td>
        <td>${p.estado}</td>
        <td>${p.fecha || '-'}</td>
        <td>
          <button class="btn btn-sm btn-outline-light me-1" onclick="editPayment(${id}, ${idx})">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deletePayment(${id}, ${idx})">Eliminar</button>
        </td>
      </tr>`;
    });
  });
  html += '</tbody></table>';
  document.getElementById('paymentsTable').innerHTML = html;
  // fill selects if present
  const sel = document.getElementById('payAlumno'); if(sel) sel.innerHTML = getAlumnos().map(a=>`<option value="${a.id}">${a.nombre}</option>`).join('');
}

function addPayment(){
  const id = document.getElementById('payAlumno').value;
  const mes = document.getElementById('payMes').value.trim();
  const monto = document.getElementById('payMonto').value;
  const estado = document.getElementById('payEstado').value;
  if(!id || !mes || !monto) return alert('Completa alumno / mes / monto');
  const pagos = getPagos();
  if(!pagos[id]) pagos[id]=[];
  pagos[id].push({ mes, monto: Number(monto), estado, fecha: new Date().toLocaleDateString() });
  setPagos(pagos);
  renderPaymentsTable();
  document.getElementById('payMes').value=''; document.getElementById('payMonto').value='';
}

// ---- EDITAR MENSUALIDAD CON MODAL (DISEÑO BONITO) ----
let editAlumnoId = null;
let editPaymentIndex = null;

function editPayment(alumnoId, idx){
  editAlumnoId = alumnoId;
  editPaymentIndex = idx;

  const pagos = getPagos();
  const p = pagos[alumnoId][idx];
  const alumno = getAlumnos().find(a => a.id == alumnoId);

  // Rellenar datos del modal
  document.getElementById('payEditAlumno').value = alumno.nombre + " (Usuario: " + alumno.usuario + ")";
  document.getElementById('payEditMes').value = p.mes;
  document.getElementById('payEditMonto').value = p.monto;
  document.getElementById('payEditEstado').value = p.estado;
  document.getElementById('payEditFecha').value = p.fecha || "";

  // Abrir modal
  const modal = new bootstrap.Modal(document.getElementById('modalPago'));
  modal.show();

  // Guardar referencia para cerrar luego
  window._modalPagoRef = modal;
}

function saveEditedPayment(){
  const pagos = getPagos();

  pagos[editAlumnoId][editPaymentIndex] = {
    mes: document.getElementById('payEditMes').value,
    monto: Number(document.getElementById('payEditMonto').value),
    estado: document.getElementById('payEditEstado').value,
    fecha: document.getElementById('payEditFecha').value
  };

  setPagos(pagos);
  renderPaymentsTable();

  // Cerrar modal con referencia guardada
  if (window._modalPagoRef) window._modalPagoRef.hide();
}


function deletePayment(alumnoId, idx){
  if(!confirm('Eliminar pago?')) return;
  const pagos = getPagos(); pagos[alumnoId].splice(idx,1); setPagos(pagos); renderPaymentsTable();
}

// ---------- Registro individual del alumno (admin view) ----------
function renderAlumnoRegistro(){
  const id = document.getElementById('registroAlumno').value;
  if(!id){ document.getElementById('registroContent').innerHTML=''; return; }
  const alumnos = getAlumnos(); const a = alumnos.find(x=>x.id==id);
  if(!a) return;
  const asist = getAsist()[id] || [];
  const pagos = getPagos()[id] || [];

  let html = `<div class="card bg-dark p-3">
    <h5 class="text-warning">${a.nombre}</h5>
    <p>Usuario: ${a.usuario} • ID: ${a.id}</p>
    <hr style="border-color:#333">
    <h6 class="text-warning">Asistencias (mar/jue):</h6>
    <ul>${(asist.length?asist.map(d=>`<li>${prettyDate(d)}</li>`).join('') : '<li>No hay asistencias</li>')}</ul>
    <h6 class="text-warning mt-3">Mensualidades:</h6>
    <ul>${(pagos.length?pagos.map(p=>`<li>${p.mes} — $${p.monto} — ${p.estado} — ${p.fecha||'-'}</li>`).join('') : '<li>No hay pagos</li>')}</ul>
  </div>`;
  document.getElementById('registroContent').innerHTML = html;
}

// ---------- ALUMNO: render su perfil ----------
function renderAlumnoPage(){
  if(!document.getElementById('perfilAlumno')) return;
  const ses = JSON.parse(localStorage.getItem('sesion') || 'null');
  if(!ses) { window.location = 'index.html'; return; }
  const id = ses.id;
  const alumnos = getAlumnos();
  const a = alumnos.find(x=>x.id==id);
  const asist = getAsist()[id] || [];
  const pagos = getPagos()[id] || [];

  document.getElementById('perfilAlumno').innerHTML = `<div class="card bg-dark p-3 mb-3">
    <h4 class="text-warning">${a?.nombre || ses.nombre}</h4>
    <p style="color:white;">Usuario: ${a?.usuario || ses.usuario}</p>
  </div>`;

  // attendance small table
  const dates = attendanceDates.length? attendanceDates : nextTueThuDates(8).map(d=>formatISO(d));
  let atthtml = '<table class="table table-dark"><thead><tr><th>Fecha</th><th>Estado</th></tr></thead><tbody>';
  dates.forEach(d=>{
    const pres = (asist || []).includes(d);
    atthtml += `<tr><td>${prettyDate(d)}</td><td>${pres?'<span class="badge bg-success">Presente</span>':'<span class="badge bg-secondary">Ausente</span>'}</td></tr>`;
  });
  atthtml += '</tbody></table>';
  document.getElementById('alumnoAttendance').innerHTML = atthtml;

  // pagos
  let payHtml = '<table class="table table-dark"><thead class="text-warning"><tr><th>Mes</th><th>Monto</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>';
  (pagos||[]).forEach(p=>{
    payHtml += `<tr><td>${p.mes}</td><td>$${p.monto}</td><td>${p.estado}</td><td>${p.fecha||'-'}</td></tr>`;
  });
  payHtml += '</tbody></table>';
  document.getElementById('alumnoPayments').innerHTML = payHtml;
}

// ---------- util: format ISO ----------
function formatISO(d){
  if(typeof d === 'string') return d;
  const yy = d.getFullYear(); const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0');
  return `${yy}-${mm}-${dd}`;
}

// ---------- export data ----------
function downloadData(){
  const data = {
    usuarios: getUsuarios(), alumnos: getAlumnos(), asistencias: getAsist(), pagos: getPagos()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'inat-data.json'; a.click(); URL.revokeObjectURL(url);
}

// If admin page loaded
if(document.getElementById('tablaAlumnos')) {
  renderAlumnos();
  initAttendanceMatrix();
  renderPaymentsTable();
}

// If alumno page loaded
if(document.getElementById('perfilAlumno')) {
  // ensure session valid
  const ses = JSON.parse(localStorage.getItem('sesion') || 'null');
  if(!ses){ window.location='index.html'; }
  renderAlumnoPage();
}

function exportMensualidadesExcel() {
    const pagosObj = JSON.parse(localStorage.getItem("pagos")) || {};

    // Convertir objeto → arreglo plano
    let rows = [];

    Object.keys(pagosObj).forEach(id => {
        pagosObj[id].forEach(pago => {
            rows.push({
                alumnoId: id,
                mes: pago.mes,
                monto: pago.monto,
                estado: pago.estado,
                fecha: pago.fecha
            });
        });
    });

    if (rows.length === 0) {
        alert("No hay datos de mensualidades para exportar.");
        return;
    }

    // Convertir a hoja Excel
    const ws = XLSX.utils.json_to_sheet(rows);

    // Crear libro Excel
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mensualidades");

    // Descargar archivo
    XLSX.writeFile(wb, "mensualidades_inat.xlsx");
}

function exportAsistenciasExcel() {
    let asistObj = JSON.parse(localStorage.getItem("asistencias")) || {};

    let lista = [];

    Object.keys(asistObj).forEach(id => {
        asistObj[id].forEach(fecha => {

            // Convertir a Date sin que se convierta a UTC
            let d = new Date(fecha + "T00:00:00");

            // RESTAR 1 DÍA
            d.setDate(d.getDate() - 1);

            // Reconstruir fecha corregida en formato YYYY-MM-DD
            let corregida =
                d.getFullYear() + "-" +
                String(d.getMonth() + 1).padStart(2, "0") + "-" +
                String(d.getDate()).padStart(2, "0");

            lista.push({
                alumnoId: id,
                fecha: corregida
            });
        });
    });

    if (lista.length === 0) {
        alert("No hay asistencias para exportar.");
        return;
    }

    const ws = XLSX.utils.json_to_sheet(lista);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencias");

    XLSX.writeFile(wb, "asistencias_inat.xlsx");
}
