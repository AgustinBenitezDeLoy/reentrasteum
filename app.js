// public/app.js (actualizado para usar 'tickets' en vez de 'listings')

const API = {
  events:   '/api/events/todos',
  register: '/api/register',
  login:    '/api/login',
  myTickets: '/api/tickets/mias',
  sell:     '/api/tickets/nuevo',
  delete:   id => `/api/tickets/eliminar/${id}`,
  listings: eventId => `/api/tickets/por-evento/${eventId}`,
};

let token = localStorage.getItem('token') || '';

window.addEventListener('DOMContentLoaded', () => {
  loadEvents();
  if (token) initSellerArea();
});

async function loadEvents() {
  try {
    const res = await fetch(API.events);
    const data = await res.json();
    const div = document.getElementById('events');
    div.innerHTML = '';
    data.events.forEach(e => {
      const el = document.createElement('div');
      el.className = 'event';
      el.innerHTML = `${e.name} (${new Date(e.date).toLocaleDateString()})`;
      const btn = document.createElement('button');
      btn.textContent = 'Ver reventas';
      btn.onclick = () => loadPublicListings(e.id, e.name);
      el.appendChild(btn);
      div.appendChild(el);
    });
    if (token) populateSellDropdown(data.events);
  } catch (err) {
    document.getElementById('events').textContent = 'Error cargando eventos.';
    console.error(err);
  }
}

function initSellerArea() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('sellerSection').style.display = 'block';
  loadMyTickets();
}

document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const data = new FormData(e.target);
  const res = await fetch(API.register, { method: 'POST', body: data });
  const json = await res.json();
  if (res.ok && json.success) {
    token = json.token;
    localStorage.setItem('token', token);
    initSellerArea();
  } else {
    alert(json.error || 'Error en registro');
  }
});

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const res = await fetch(API.login, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const json = await res.json();
  if (res.ok && json.success) {
    token = json.token;
    localStorage.setItem('token', token);
    initSellerArea();
  } else {
    alert(json.error || 'Credenciales inválidas');
  }
});

document.getElementById('sellForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!token) return alert('Inicia sesión primero');
  const formData = new FormData(e.target);
  const res = await fetch(API.sell, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: formData
  });
  const json = await res.json();
  if (res.ok && json.success) {
    alert('Entrada publicada con éxito');
    loadMyTickets();
  } else {
    alert(json.error || 'Error al publicar entrada');
  }
});

document.getElementById('loadMyListings').addEventListener('click', loadMyTickets);

async function loadMyTickets() {
  if (!token) return;
  try {
    const res = await fetch(API.myTickets, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    const div = document.getElementById('myListings');
    div.innerHTML = '';
    if (!data.success || data.tickets.length === 0) {
      div.textContent = 'No tienes entradas publicadas.';
      return;
    }
    data.tickets.forEach(ticket => {
      const el = document.createElement('div');
      el.className = 'listing';
      el.innerHTML = `
        <span>${ticket.evento} — $${ticket.precio}</span>
        <button>Eliminar</button>
      `;
      el.querySelector('button').onclick = async () => {
        const resDel = await fetch(API.delete(ticket.id), {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token }
        });
        const jsonDel = await resDel.json();
        if (resDel.ok && jsonDel.success) {
          el.remove();
        } else {
          alert(jsonDel.error || 'No se pudo eliminar');
        }
      };
      div.appendChild(el);
    });
  } catch (err) {
    alert('Error al cargar tus entradas');
    console.error(err);
  }
}

async function loadPublicListings(eventId, eventName) {
  const div = document.getElementById('listings');
  try {
    const res = await fetch(API.listings(eventId));
    const data = await res.json();
    div.innerHTML = `<h3>Entradas para "${eventName}"</h3>`;
    if (!data.success || data.tickets.length === 0) {
      div.innerHTML += '<p>No hay entradas.</p>';
      return;
    }
    data.tickets.forEach(t => {
      const el = document.createElement('div');
      el.className = 'listing';
      el.textContent = `Precio: $${t.precio} — Vendedor: ${t.vendedor}`;
      div.appendChild(el);
    });
  } catch (err) {
    div.textContent = 'Error al cargar reventas.';
    console.error(err);
  }
}

async function populateSellDropdown(events) {
  const select = document.getElementById('sellEvent');
  select.innerHTML = '<option value="">Selecciona evento</option>';
  events.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.textContent = e.name;
    select.appendChild(opt);
  });
}
