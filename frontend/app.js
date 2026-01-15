// Ajuste se você rodar o backend em outra porta
const API_BASE = "http://127.0.0.1:8000";

let leadsCache = [];
let selectedLeadId = null;

const $ = (id) => document.getElementById(id);

function setApiStatus(ok) {
  const dot = $("apiDot");
  const text = $("apiStatus");
  dot.classList.remove("ok", "bad");
  dot.classList.add(ok ? "ok" : "bad");
  text.textContent = ok ? "API: online" : "API: offline";
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
  return res.json();
}

function renderLeads(items, targetId) {
  const root = $(targetId);
  root.innerHTML = "";

  if (!items.length) {
    root.innerHTML = `<div class="hint">Nenhum lead encontrado.</div>`;
    return;
  }

  for (const lead of items) {
    const tagsHtml = (lead.tags || [])
      .map((t) => `<span class="tag">${t}</span>`)
      .join("");

    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="meta">
        <div class="name">${lead.nome}</div>
        <div class="sub">Canal: ${lead.canal} • Tel: ${lead.telefone || "—"}</div>
        <div class="tags">${tagsHtml}</div>
      </div>
      <div class="actions">
        <span class="badge">Selecionar</span>
      </div>
    `;

    el.addEventListener("click", () => {
      selectedLeadId = lead.id;
      $("selectedLead").value = `${lead.nome} (${lead.id.slice(0, 8)}...)`;
      $("reminderBox").value = "";
    });

    root.appendChild(el);
  }
}

function filterLeads(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return leadsCache;

  return leadsCache.filter((l) => {
    const nameMatch = (l.nome || "").toLowerCase().includes(q);
    const tagMatch = (l.tags || []).some((t) => (t || "").toLowerCase().includes(q));
    return nameMatch || tagMatch;
  });
}

async function loadLeads() {
  const data = await apiGet("/crm/leads");
  leadsCache = data.items || [];
  renderLeads(filterLeads($("search").value), "leadsList");
}

async function checkApi() {
  try {
    await apiGet("/health");
    setApiStatus(true);
  } catch (e) {
    setApiStatus(false);
  }
}

async function createLead(e) {
  e.preventDefault();
  const hint = $("leadFormHint");
  hint.textContent = "";

  const nome = $("nome").value.trim();
  const canal = $("canal").value;
  const telefone = $("telefone").value.trim() || null;

  const tagsRaw = $("tags").value.trim();
  const tags = tagsRaw
    ? tagsRaw.split(",").map((x) => x.trim()).filter(Boolean)
    : [];

  try {
    await apiPost("/crm/leads", { nome, canal, telefone, tags });
    hint.textContent = "Lead criado com sucesso ✅";
    $("leadForm").reset();
    await loadLeads();
  } catch (err) {
    hint.textContent = `Erro ao criar lead: ${err.message}`;
  }
}

async function loadColdLeads() {
  const days = Number($("coldDays").value || 30);
  const data = await apiGet(`/crm/cold-leads?days=${days}`);
  renderLeads(data.items || [], "coldList");
}

async function addInteraction() {
  if (!selectedLeadId) {
    alert("Selecione um lead primeiro.");
    return;
  }
  const tipo = $("tipo").value;
  const note = $("note").value.trim();

  try {
    await apiPost(`/crm/leads/${selectedLeadId}/interacoes`, { tipo, note });
    $("note").value = "";
    await loadLeads();
    alert("Interação registrada ✅");
  } catch (err) {
    alert(`Erro ao registrar interação: ${err.message}`);
  }
}

async function generateReminder() {
  if (!selectedLeadId) {
    alert("Selecione um lead primeiro.");
    return;
  }
  try {
    const data = await apiGet(`/crm/leads/${selectedLeadId}/reminder`);
    $("reminderBox").value = data.mensagem || "";
  } catch (err) {
    alert(`Erro ao gerar lembrete: ${err.message}`);
  }
}

// --- eventos ---
window.addEventListener("load", async () => {
  await checkApi();
  await loadLeads();
});

$("leadForm").addEventListener("submit", createLead);
$("refreshBtn").addEventListener("click", loadLeads);
$("coldBtn").addEventListener("click", loadColdLeads);
$("interBtn").addEventListener("click", addInteraction);
$("reminderBtn").addEventListener("click", generateReminder);

$("search").addEventListener("input", () => {
  renderLeads(filterLeads($("search").value), "leadsList");
});
