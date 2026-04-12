// =============================================
// CONFIGURACIÓN - Reemplaza con tu webhook de Discord
// =============================================
const DISCORD_WEBHOOK_PRIVATE = "https://discord.com/api/webhooks/1492929582507102239/1g7BH42M1K-7LTFZBbF0Rjpa91EjbPKKxHVvcEJhCyEPU_o1GnwwIi-4bXVIQYEj_EKZ";
const DISCORD_WEBHOOK_PUBLIC  = "https://discord.com/api/webhooks/1492929252851454152/3WbkxmXZg787MHf-tugRAUV_7zvriTv2gW6IE9OMUZu7XJh1ZgqVjEwBZFtl0I8RzuaU";
const MAX_TEAMS = 12;
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzzIv7TMLKZLATTq2FWqSNpFLB6_hgBl1OrEz22ymw5h5hajc2Ti8WDyUh7PDEUsYwZZA/exec";

// =============================================
// Pantalla de entrada con polvo
// =============================================
(function initIntro() {
  const intro   = document.getElementById("intro-screen");
  const canvas  = document.getElementById("dust-canvas");
  const ctx     = canvas.getContext("2d");
  const main    = document.getElementById("main-content");

  let particles = [];
  let animating = false;
  let rafId;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  // Partícula de polvo
  function createParticle(x, y) {
    const angle  = Math.random() * Math.PI * 2;
    const speed  = 2 + Math.random() * 6;
    const colors = ["180,80,255", "140,40,220", "200,120,255", "255,200,80", "255,255,255"];
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - Math.random() * 3,
      size: 1.5 + Math.random() * 3.5,
      alpha: 0.9 + Math.random() * 0.1,
      decay: 0.012 + Math.random() * 0.018,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.08 + Math.random() * 0.06,
    };
  }

  function burst(x, y, count) {
    for (let i = 0; i < count; i++) particles.push(createParticle(x, y));
  }

  function animateDust() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles = particles.filter(p => p.alpha > 0.01);

    particles.forEach(p => {
      p.x     += p.vx;
      p.y     += p.vy;
      p.vy    += p.gravity;
      p.vx    *= 0.98;
      p.alpha -= p.decay;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${Math.max(0, p.alpha)})`;
      ctx.fill();
    });

    if (particles.length > 0) {
      rafId = requestAnimationFrame(animateDust);
    } else {
      cancelAnimationFrame(rafId);
    }
  }

  // Click en la pantalla de entrada
  intro.addEventListener("click", (e) => {
    if (animating) return;
    animating = true;

    // Explosión de polvo desde el centro del click
    const cx = e.clientX || canvas.width / 2;
    const cy = e.clientY || canvas.height / 2;

    // Múltiples oleadas desde distintos puntos
    burst(cx, cy, 120);
    setTimeout(() => burst(cx - 80, cy + 40, 60), 80);
    setTimeout(() => burst(cx + 80, cy - 40, 60), 120);
    setTimeout(() => burst(canvas.width * 0.2, canvas.height * 0.5, 50), 200);
    setTimeout(() => burst(canvas.width * 0.8, canvas.height * 0.5, 50), 200);

    animateDust();

    // Fade out de la intro y reveal del contenido
    setTimeout(() => {
      intro.classList.add("fade-out");
      main.classList.add("revealed");
    }, 350);
  });
})();

// =============================================
// Estado (sincronizado con Google Sheets)
// =============================================
let teams = [];

// =============================================
// Inicialización
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  populateCountries();
  loadTeamsFromSheets();

  document.getElementById("register-form").addEventListener("submit", handleSubmit);
  document.getElementById("add-player").addEventListener("click", addPlayerField);
  document.getElementById("register-another").addEventListener("click", showForm);

  // Preview comprobante
  const fileInput = document.getElementById("payment-proof");
  const uploadArea = document.getElementById("file-upload-area");
  const previewWrap = document.getElementById("image-preview-wrap");
  const previewImg = document.getElementById("image-preview");
  const fileNameText = document.getElementById("file-name-text");

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    fileNameText.textContent = file.name;
    uploadArea.classList.add("has-file");
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewWrap.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("remove-img-btn").addEventListener("click", () => {
    fileInput.value = "";
    previewImg.src = "";
    previewWrap.classList.add("hidden");
    uploadArea.classList.remove("has-file");
    fileNameText.textContent = "Toca para subir la captura";
  });

  // Preview logo del equipo
  const logoInput    = document.getElementById("team-logo");
  const logoArea     = document.getElementById("logo-upload-area");
  const logoPreview  = document.getElementById("logo-preview");
  const logoWrap     = document.getElementById("logo-preview-wrap");
  const logoNameText = document.getElementById("logo-name-text");

  logoInput.addEventListener("change", () => {
    const file = logoInput.files[0];
    if (!file) return;
    logoNameText.textContent = file.name;
    logoArea.classList.add("has-file");
    const reader = new FileReader();
    reader.onload = (e) => {
      logoPreview.src = e.target.result;
      logoWrap.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("remove-logo-btn").addEventListener("click", () => {
    logoInput.value = "";
    logoPreview.src = "";
    logoWrap.classList.add("hidden");
    logoArea.classList.remove("has-file");
    logoNameText.textContent = "Toca para subir tu logo";
  });

  // Animación botón reglamento — ahora abre modal
  const rulesBtn = document.querySelector(".btn-rules");
  if (rulesBtn) rulesBtn.addEventListener("click", openRulesModal);
});

// =============================================
// Agregar campo de jugador suplente
// =============================================
function addPlayerField() {
  const list = document.getElementById("players-list");
  const count = list.querySelectorAll(".player-input").length + 1;

  if (count > 7) {
    showError("Máximo 7 jugadores por equipo.");
    return;
  }

  const input = document.createElement("input");
  input.type = "text";
  input.className = "player-input";
  input.placeholder = `Jugador ${count} (suplente)`;
  input.maxLength = 30;
  list.appendChild(input);
}

// =============================================
// Envío del formulario
// =============================================
async function handleSubmit(e) {
  e.preventDefault();

  if (teams.length >= MAX_TEAMS) {
    showError("El torneo ya está lleno. No hay más cupos disponibles.");
    return;
  }

  const teamName = document.getElementById("team-name").value.trim();
  const captain = document.getElementById("captain").value.trim();
  const discordUser = document.getElementById("discord-user").value.trim();
  const region = document.getElementById("region").value;

  if (!region) {
    showError("Por favor selecciona tu país de la lista.");
    return;
  }

  const notes = document.getElementById("notes").value.trim();
  const transactionId = document.getElementById("transaction-id").value.trim();
  const proofFile = document.getElementById("payment-proof").files[0];
  const logoFile = document.getElementById("team-logo").files[0] || null;

  if (!transactionId) {
    showError("Debes ingresar el ID de transacción de PayPal.");
    return;
  }

  if (!proofFile) {
    showError("Debes subir una captura del comprobante de pago.");
    return;
  }

  if (!logoFile) {
    showError("Debes subir el logotipo de tu equipo.");
    return;
  }

  const playerInputs = document.querySelectorAll(".player-input");
  const players = Array.from(playerInputs)
    .map(i => i.value.trim())
    .filter(v => v !== "");

  if (players.length < 5) {
    showError("Debes ingresar al menos 5 jugadores.");
    return;
  }

  // Verificar nombre duplicado
  if (teams.some(t => t.teamName.toLowerCase() === teamName.toLowerCase())) {
    showError(`Ya existe un equipo con el nombre "${teamName}". Elige otro nombre.`);
    return;
  }

  const team = {
    id: Date.now(),
    number: teams.length + 1,
    teamName,
    captain,
    discordUser,
    region,
    players,
    notes,
    transactionId,
    registeredAt: new Date().toLocaleString("es-ES")
  };

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";

  try {
    await sendToDiscord(team, proofFile, logoFile);
    await saveToSheets(team);
    teams.push(team);
    renderTeams();
    updateStats();
    showSuccess(team);
  } catch (err) {
    showError("Error al conectar con Discord. Verifica el webhook e intenta de nuevo.");
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "⚔️ Inscribir Equipo";
  }
}

// =============================================
// Google Sheets — cargar y guardar equipos
// =============================================
async function loadTeamsFromSheets() {
  try {
    document.getElementById("team-count").textContent = "...";
    const res = await fetch(SHEETS_URL);
    const data = await res.json();
    teams = Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn("No se pudieron cargar equipos desde Sheets:", e);
    teams = [];
  }
  renderTeams();
  updateStats();
}

async function saveToSheets(team) {
  try {
    await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(team)
    });
  } catch(e) {
    console.warn("Sheets save error:", e);
  }
}

// =============================================
// Enviar a Discord via Webhook
// =============================================
async function sendToDiscord(team, proofFile, logoFile) {
  const playersText = team.players.map((p, i) => `> ${i + 1}. ${p}`).join("\n");

  // ── Embed privado (moderadores) ──────────────────────────
  const privateEmbed = {
    title: `⚔️ Nuevo Equipo Inscrito — #${team.number}`,
    color: 0xffb800,
    fields: [
      { name: "🏷️ Equipo",               value: team.teamName,     inline: true },
      { name: "👑 Capitán",               value: team.captain,      inline: true },
      { name: "💬 Discord",               value: team.discordUser,  inline: true },
      { name: "🌎 País",                  value: team.region,       inline: true },
      { name: "💳 ID Transacción PayPal", value: team.transactionId,inline: true },
      { name: "👥 Jugadores",             value: playersText,       inline: false },
    ],
    footer: { text: `Inscripción #${team.number} • ${team.registeredAt}` }
  };
  if (team.notes) privateEmbed.fields.push({ name: "📝 Notas", value: team.notes, inline: false });

  const privatePayload = {
    username: "HoK Tournament Bot — PRIVADO",
    embeds: [privateEmbed]
  };

  const privateForm = new FormData();
  privateForm.append("payload_json", JSON.stringify(privatePayload));
  if (proofFile) privateForm.append("files[0]", proofFile, proofFile.name);
  if (logoFile)  privateForm.append("files[1]", logoFile,  logoFile.name);

  // ── Embed público (solo nombre + logo) ───────────────────
  const publicEmbed = {
    title: `🛡️ ¡Nuevo equipo confirmado!`,
    description: `## ${team.teamName}\nEquipo #${team.number}`,
    color: 0xb450ff,
    footer: { text: `Liga de los Pilares • ${team.registeredAt}` }
  };

  const publicPayload = {
    username: "HoK Tournament Bot",
    embeds: [publicEmbed]
  };

  const publicForm = new FormData();
  publicForm.append("payload_json", JSON.stringify(publicPayload));
  if (logoFile) publicForm.append("files[0]", logoFile, logoFile.name);

  // ── Enviar ambos en paralelo ──────────────────────────────
  const [r1, r2] = await Promise.all([
    fetch(DISCORD_WEBHOOK_PRIVATE, { method: "POST", body: privateForm }),
    fetch(DISCORD_WEBHOOK_PUBLIC,  { method: "POST", body: publicForm  })
  ]);

  if (!r1.ok) throw new Error(`Webhook privado: ${r1.status}`);
  if (!r2.ok) throw new Error(`Webhook público: ${r2.status}`);
}

// =============================================
// Renderizar tarjetas de equipos
// =============================================
function renderTeams() {
  const grid = document.getElementById("teams-grid");
  const emptyMsg = document.getElementById("empty-msg");

  grid.innerHTML = "";

  if (teams.length === 0) {
    grid.appendChild(emptyMsg);
    emptyMsg.classList.remove("hidden");
    return;
  }

  teams.forEach(team => {
    const card = document.createElement("div");
    card.className = "team-card";
    card.innerHTML = `
      <div class="team-number">Equipo #${team.number}</div>
      <div class="team-title">${escapeHtml(team.teamName)}</div>
      <div class="team-captain">👑 ${escapeHtml(team.captain)}</div>
      <div class="team-region">🌎 ${escapeHtml(team.region)}</div>
    `;
    grid.appendChild(card);
  });
}

// =============================================
// Actualizar estadísticas
// =============================================
function updateStats() {
  document.getElementById("team-count").textContent = teams.length;
  document.getElementById("slots-left").textContent = Math.max(0, MAX_TEAMS - teams.length);
}

// =============================================
// UI helpers
// =============================================
function showSuccess(team) {
  document.getElementById("form-section").classList.add("hidden");
  const card = document.getElementById("success-card");
  card.classList.remove("hidden");
  document.getElementById("success-msg").textContent =
    `"${team.teamName}" ha sido registrado como equipo #${team.number}. Los datos fueron enviados al canal de Discord del torneo.`;
}

function showForm() {
  document.getElementById("success-card").classList.add("hidden");
  document.getElementById("form-section").classList.remove("hidden");
  document.getElementById("register-form").reset();

  // Resetear jugadores a 5
  const list = document.getElementById("players-list");
  const inputs = list.querySelectorAll(".player-input");
  inputs.forEach((inp, i) => {
    if (i >= 5) inp.remove();
    else inp.value = "";
  });

  // Resetear comprobante
  document.getElementById("payment-proof").value = "";
  document.getElementById("image-preview").src = "";
  document.getElementById("image-preview-wrap").classList.add("hidden");
  document.getElementById("file-upload-area").classList.remove("has-file");
  document.getElementById("file-name-text").textContent = "Toca para subir la captura";
  document.getElementById("transaction-id").value = "";
  document.getElementById("country-search").value = "";
  document.getElementById("country-search").classList.remove("country-selected");

  // Resetear logo
  document.getElementById("team-logo").value = "";
  document.getElementById("logo-preview").src = "";
  document.getElementById("logo-preview-wrap").classList.add("hidden");
  document.getElementById("logo-upload-area").classList.remove("has-file");
  document.getElementById("logo-name-text").textContent = "Toca para subir tu logo";
}

function showError(msg) {
  document.getElementById("error-msg").textContent = msg;
  document.getElementById("error-modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("error-modal").classList.add("hidden");
}

function openRulesModal() {
  document.getElementById("rules-modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeRulesModal() {
  document.getElementById("rules-modal").classList.add("hidden");
  document.body.style.overflow = "";
}

function closeRulesOnBackdrop(e) {
  if (e.target === document.getElementById("rules-modal")) closeRulesModal();
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}


// =============================================
// Poblar select de países
// =============================================
function populateCountries() {
  const countries = [
    ["🇦🇫", "Afganistán"], ["🇦🇱", "Albania"], ["🇩🇿", "Alemania"], ["🇩🇪", "Alemania"],
    ["🇦🇩", "Andorra"], ["🇦🇴", "Angola"], ["🇦🇬", "Antigua y Barbuda"], ["🇸🇦", "Arabia Saudita"],
    ["🇦🇷", "Argentina"], ["🇦🇲", "Armenia"], ["🇦🇺", "Australia"], ["🇦🇹", "Austria"],
    ["🇦🇿", "Azerbaiyán"], ["🇧🇸", "Bahamas"], ["🇧🇩", "Bangladés"], ["🇧🇧", "Barbados"],
    ["🇧🇭", "Baréin"], ["🇧🇪", "Bélgica"], ["🇧🇿", "Belice"], ["🇧🇯", "Benín"],
    ["🇧🇾", "Bielorrusia"], ["🇲🇲", "Birmania"], ["🇧🇴", "Bolivia"], ["🇧🇦", "Bosnia y Herzegovina"],
    ["🇧🇼", "Botsuana"], ["🇧🇷", "Brasil"], ["🇧🇳", "Brunéi"], ["🇧🇬", "Bulgaria"],
    ["🇧🇫", "Burkina Faso"], ["🇧🇮", "Burundi"], ["🇧🇹", "Bután"], ["🇨🇻", "Cabo Verde"],
    ["🇰🇭", "Camboya"], ["🇨🇲", "Camerún"], ["🇨🇦", "Canadá"], ["🇶🇦", "Catar"],
    ["🇹🇩", "Chad"], ["🇨🇱", "Chile"], ["🇨🇳", "China"], ["🇨🇾", "Chipre"],
    ["🇨🇴", "Colombia"], ["🇰🇲", "Comoras"], ["🇨🇬", "Congo"], ["🇨🇩", "Congo (RDC)"],
    ["🇰🇵", "Corea del Norte"], ["🇰🇷", "Corea del Sur"], ["🇨🇮", "Costa de Marfil"],
    ["🇨🇷", "Costa Rica"], ["🇭🇷", "Croacia"], ["🇨🇺", "Cuba"], ["🇩🇰", "Dinamarca"],
    ["🇩🇯", "Yibuti"], ["🇩🇲", "Dominica"], ["🇪🇨", "Ecuador"], ["🇪🇬", "Egipto"],
    ["🇸🇻", "El Salvador"], ["🇦🇪", "Emiratos Árabes Unidos"], ["🇪🇷", "Eritrea"],
    ["🇸🇰", "Eslovaquia"], ["🇸🇮", "Eslovenia"], ["🇪🇸", "España"], ["🇺🇸", "Estados Unidos"],
    ["🇪🇪", "Estonia"], ["🇸🇿", "Esuatini"], ["🇪🇹", "Etiopía"], ["🇵🇭", "Filipinas"],
    ["🇫🇮", "Finlandia"], ["🇫🇯", "Fiyi"], ["🇫🇷", "Francia"], ["🇬🇦", "Gabón"],
    ["🇬🇲", "Gambia"], ["🇬🇪", "Georgia"], ["🇬🇭", "Ghana"], ["🇬🇩", "Granada"],
    ["🇬🇷", "Grecia"], ["🇬🇹", "Guatemala"], ["🇬🇳", "Guinea"], ["🇬🇼", "Guinea-Bisáu"],
    ["🇬🇶", "Guinea Ecuatorial"], ["🇬🇾", "Guyana"], ["🇭🇹", "Haití"], ["🇭🇳", "Honduras"],
    ["🇭🇺", "Hungría"], ["🇮🇳", "India"], ["🇮🇩", "Indonesia"], ["🇮🇶", "Irak"],
    ["🇮🇷", "Irán"], ["🇮🇪", "Irlanda"], ["🇮🇸", "Islandia"], ["🇮🇱", "Israel"],
    ["🇮🇹", "Italia"], ["🇯🇲", "Jamaica"], ["🇯🇵", "Japón"], ["🇯🇴", "Jordania"],
    ["🇰🇿", "Kazajistán"], ["🇰🇪", "Kenia"], ["🇰🇬", "Kirguistán"], ["🇰🇮", "Kiribati"],
    ["🇽🇰", "Kosovo"], ["🇰🇼", "Kuwait"], ["🇱🇦", "Laos"], ["🇱🇸", "Lesoto"],
    ["🇱🇻", "Letonia"], ["🇱🇧", "Líbano"], ["🇱🇷", "Liberia"], ["🇱🇾", "Libia"],
    ["🇱🇮", "Liechtenstein"], ["🇱🇹", "Lituania"], ["🇱🇺", "Luxemburgo"], ["🇲🇰", "Macedonia del Norte"],
    ["🇲🇬", "Madagascar"], ["🇲🇾", "Malasia"], ["🇲🇼", "Malaui"], ["🇲🇻", "Maldivas"],
    ["🇲🇱", "Malí"], ["🇲🇹", "Malta"], ["🇲🇦", "Marruecos"], ["🇲🇺", "Mauricio"],
    ["🇲🇷", "Mauritania"], ["🇲🇽", "México"], ["🇫🇲", "Micronesia"], ["🇲🇩", "Moldavia"],
    ["🇲🇨", "Mónaco"], ["🇲🇳", "Mongolia"], ["🇲🇪", "Montenegro"], ["🇲🇿", "Mozambique"],
    ["🇳🇦", "Namibia"], ["🇳🇷", "Nauru"], ["🇳🇵", "Nepal"], ["🇳🇮", "Nicaragua"],
    ["🇳🇪", "Níger"], ["🇳🇬", "Nigeria"], ["🇳🇴", "Noruega"], ["🇳🇿", "Nueva Zelanda"],
    ["🇴🇲", "Omán"], ["🇳🇱", "Países Bajos"], ["🇵🇰", "Pakistán"], ["🇵🇼", "Palaos"],
    ["🇵🇸", "Palestina"], ["🇵🇦", "Panamá"], ["🇵🇬", "Papúa Nueva Guinea"], ["🇵🇾", "Paraguay"],
    ["🇵🇪", "Perú"], ["🇵🇱", "Polonia"], ["🇵🇹", "Portugal"], ["🇬🇧", "Reino Unido"],
    ["🇨🇫", "República Centroafricana"], ["🇨🇿", "República Checa"], ["🇩🇴", "República Dominicana"],
    ["🇷🇼", "Ruanda"], ["🇷🇴", "Rumanía"], ["🇷🇺", "Rusia"], ["🇼🇸", "Samoa"],
    ["🇰🇳", "San Cristóbal y Nieves"], ["🇸🇲", "San Marino"], ["🇻🇨", "San Vicente y las Granadinas"],
    ["🇸🇹", "Santo Tomé y Príncipe"], ["🇸🇳", "Senegal"], ["🇷🇸", "Serbia"],
    ["🇸🇨", "Seychelles"], ["🇸🇱", "Sierra Leona"], ["🇸🇬", "Singapur"], ["🇸🇾", "Siria"],
    ["🇸🇴", "Somalia"], ["🇱🇰", "Sri Lanka"], ["🇿🇦", "Sudáfrica"], ["🇸🇩", "Sudán"],
    ["🇸🇸", "Sudán del Sur"], ["🇸🇪", "Suecia"], ["🇨🇭", "Suiza"], ["🇸🇷", "Surinam"],
    ["🇹🇭", "Tailandia"], ["🇹🇿", "Tanzania"], ["🇹🇯", "Tayikistán"], ["🇹🇱", "Timor Oriental"],
    ["🇹🇬", "Togo"], ["🇹🇴", "Tonga"], ["🇹🇹", "Trinidad y Tobago"], ["🇹🇳", "Túnez"],
    ["🇹🇲", "Turkmenistán"], ["🇹🇷", "Turquía"], ["🇹🇻", "Tuvalu"], ["🇺🇦", "Ucrania"],
    ["🇺🇬", "Uganda"], ["🇺🇾", "Uruguay"], ["🇺🇿", "Uzbekistán"], ["🇻🇺", "Vanuatu"],
    ["🇻🇦", "Vaticano"], ["🇻🇪", "Venezuela"], ["🇻🇳", "Vietnam"], ["🇾🇪", "Yemen"],
    ["🇿🇲", "Zambia"], ["🇿🇼", "Zimbabue"],
  ]
  .sort((a, b) => a[1].localeCompare(b[1], "es"));

  const searchInput = document.getElementById("country-search");
  const dropdown = document.getElementById("country-dropdown");
  const hiddenInput = document.getElementById("region");

  function renderDropdown(filter) {
    const q = filter.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const matches = countries.filter(([, name]) =>
      name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q)
    );
    dropdown.innerHTML = "";
    if (matches.length === 0) {
      dropdown.innerHTML = `<div class="country-option" style="color:#888">Sin resultados</div>`;
    } else {
      matches.forEach(([flag, name]) => {
        const div = document.createElement("div");
        div.className = "country-option";
        div.textContent = `${flag} ${name}`;
        div.addEventListener("mousedown", () => {
          searchInput.value = `${flag} ${name}`;
          hiddenInput.value = name;
          searchInput.classList.add("country-selected");
          dropdown.classList.add("hidden");
        });
        dropdown.appendChild(div);
      });
    }
    dropdown.classList.remove("hidden");
  }

  searchInput.addEventListener("input", () => {
    hiddenInput.value = "";
    searchInput.classList.remove("country-selected");
    renderDropdown(searchInput.value);
  });

  searchInput.addEventListener("focus", () => renderDropdown(searchInput.value));

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".country-wrapper")) dropdown.classList.add("hidden");
  });
}

// =============================================
// Animación de mariposas cayendo (canvas)
// =============================================
(function initButterflies() {
  const canvas = document.getElementById("butterfly-canvas");
  const ctx = canvas.getContext("2d");

  // Paleta de morados
  const COLORS = [
    "rgba(180, 80, 255, ALPHA)",
    "rgba(140, 40, 220, ALPHA)",
    "rgba(200, 120, 255, ALPHA)",
    "rgba(100, 20, 180, ALPHA)",
    "rgba(220, 160, 255, ALPHA)",
  ];

  const BUTTERFLY_COUNT = 28;
  let butterflies = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // Cada mariposa tiene posición, velocidad, tamaño, fase de aleteo y color
  function createButterfly() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,        // empieza arriba (fuera de pantalla)
      size: 8 + Math.random() * 14,             // tamaño de ala
      speedY: 0.4 + Math.random() * 0.8,        // velocidad de caída
      speedX: (Math.random() - 0.5) * 0.6,      // deriva lateral suave
      flapSpeed: 0.04 + Math.random() * 0.05,   // velocidad de aleteo
      flapAngle: Math.random() * Math.PI * 2,   // fase inicial aleatoria
      wobble: Math.random() * Math.PI * 2,      // oscilación horizontal
      wobbleSpeed: 0.01 + Math.random() * 0.02,
      alpha: 0.4 + Math.random() * 0.5,
      colorTemplate: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
  }

  function drawButterfly(b) {
    const flap = Math.sin(b.flapAngle);          // -1 a 1
    const wingOpen = Math.abs(flap);             // 0 = cerrada, 1 = abierta
    const color = b.colorTemplate.replace("ALPHA", b.alpha.toFixed(2));

    ctx.save();
    ctx.translate(b.x, b.y);

    // Ala izquierda
    ctx.save();
    ctx.scale(-wingOpen, 1);
    drawWing(ctx, b.size, color);
    ctx.restore();

    // Ala derecha
    ctx.save();
    ctx.scale(wingOpen, 1);
    drawWing(ctx, b.size, color);
    ctx.restore();

    // Cuerpo (pequeña línea central)
    ctx.beginPath();
    ctx.moveTo(0, -b.size * 0.6);
    ctx.lineTo(0, b.size * 0.6);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
  }

  function drawWing(ctx, size, color) {
    ctx.beginPath();
    // Ala superior
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(
      size * 0.3, -size * 0.8,
      size * 1.1, -size * 0.9,
      size * 1.0, 0
    );
    // Ala inferior
    ctx.bezierCurveTo(
      size * 0.9, size * 0.6,
      size * 0.3, size * 0.7,
      0, size * 0.3
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    butterflies.forEach(b => {
      // Movimiento
      b.flapAngle += b.flapSpeed;
      b.wobble += b.wobbleSpeed;
      b.x += b.speedX + Math.sin(b.wobble) * 0.5;
      b.y += b.speedY;

      // Si sale por abajo, reaparece arriba
      if (b.y > canvas.height + 20) {
        b.y = -20;
        b.x = Math.random() * canvas.width;
      }
      // Si sale por los lados, rebota suavemente
      if (b.x < -20) b.x = canvas.width + 20;
      if (b.x > canvas.width + 20) b.x = -20;

      drawButterfly(b);
    });

    requestAnimationFrame(update);
  }

  // Init
  resize();
  window.addEventListener("resize", resize);
  for (let i = 0; i < BUTTERFLY_COUNT; i++) {
    const b = createButterfly();
    b.y = Math.random() * canvas.height; // distribuir al inicio
    butterflies.push(b);
  }
  update();
})();
