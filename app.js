// public/app.js

const API = {
    events:   '/api/events',
    register: '/api/register',
    login:    '/api/login',
    myList:   '/api/my-listings',
    sell:     '/api/sell',
    delete:   id => `/api/delete-listing/${id}`,
    listings: eventId => `/api/listings/${eventId}`,
  };
  
  let token = localStorage.getItem('token') || '';
  
  // Al cargar la página
  window.addEventListener('DOMContentLoaded', () => {
    loadEvents();
    if (token) initSellerArea();
  });
  
  // Carga eventos públicos
  async function loadEvents() {
    try {
      const res = await fetch(API.events);
      const events = await res.json();
      const div = document.getElementById('events');
      div.innerHTML = '';
      events.forEach(e => {
        const el = document.createElement('div');
        el.className = 'event';
        el.textContent = `${e.name} (${new Date(e.date).toLocaleDateString()})`;
        const btn = document.createElement('button');
        btn.textContent = 'Ver reventas';
        btn.onclick = () => loadPublicListings(e.id, e.name);
        el.appendChild(btn);
        div.appendChild(el);
      });
      if (token) populateSellDropdown(events);
    } catch (err) {
      document.getElementById('events').textContent = 'Error cargando eventos.';
      console.error(err);
    }
  }
  
  // Muestra panel de vendedor
  function initSellerArea() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('sellerSection').style.display = 'block';
    populateSellDropdown();
    loadMyListings();
  }
  
  // Registro de vendedor
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
  
  // Login de vendedor
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
  
  // Publicar reventa
  document.getElementById('sellForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!token) return alert('Inicia sesión primero');
    const eventId = +document.getElementById('sellEvent').value;
    const price = +document.getElementById('sellPrice').value;
    const sellerName = document.getElementById('sellName').value;
    const res = await fetch(API.sell, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ eventId, price, sellerName })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      alert('Reventa publicada');
      loadMyListings();
    } else {
      alert(json.error || 'Error al publicar');
    }
  });
  
  // Cargar mis reventas
  document.getElementById('loadMyListings').addEventListener('click', loadMyListings);
  async function loadMyListings() {
    if (!token) return alert('Inicia sesión primero');
    try {
      const res = await fetch(API.myList, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const list = await res.json();
      const div = document.getElementById('myListings');
      div.innerHTML = '';
      if (!list.length) {
        div.textContent = 'No tienes reventas activas.';
        return;
      }
      list.forEach(item => {
        const el = document.createElement('div');
        el.className = 'listing';
        el.innerHTML = `
          <span>${item.event_name} — $${item.price}</span>
          <button>Eliminar</button>
        `;
        el.querySelector('button').onclick = async () => {
          const resDel = await fetch(API.delete(item.id), {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
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
      alert('Error al cargar tus reventas');
      console.error(err);
    }
  }
  
  // Mostrar reventas públicas
  async function loadPublicListings(eventId, eventName) {
    const div = document.getElementById('listings');
    try {
      const res = await fetch(API.listings(eventId));
      const list = await res.json();
      div.innerHTML = `<h3>Reventas de "${eventName}"</h3>`;
      if (!list.length) {
        div.innerHTML += '<p>No hay reventas.</p>';
        return;
      }
      list.forEach(l => {
        const el = document.createElement('div');
        el.className = 'listing';
        el.textContent = `Precio: $${l.price} — ${l.seller_name}`;
        div.appendChild(el);
      });
    } catch (err) {
      div.textContent = 'Error cargando reventas públicas.';
      console.error(err);
    }
  }
  
  // Populate dropdown con eventos con eventos
  async function populateSellDropdown(events) {
    const select = document.getElementById('sellEvent');
    if (events) {
      select.innerHTML = '<option value="">Selecciona evento</option>';
      events.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.name;
        select.appendChild(opt);
      });
    } else {
      const res = await fetch(API.events);
      const ev = await res.json();
      populateSellDropdown(ev);
    }
  }