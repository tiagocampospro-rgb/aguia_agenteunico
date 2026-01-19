let leadsCache = [];

function $(id){ return document.getElementById(id); }

function apiBase(){
  return $("apiBase").value.trim().replace(/\/+$/, "");
}

async function httpGet(path){
  const url = `${apiBase()}${path}`;
  const res = await fetch(url);
  if(!res.ok){
    const txt = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${txt}`);
  }
  return res.json();
}

async function httpPost(path, body){
  const url = `${apiBase()}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body),
  });
  if(!res.ok){
    const txt = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${txt}`);
  }
  return res.json();
}

function fmtDate(iso){
  if(!iso) return "—";
  const d = new Date(iso);
  if(Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR");
}

function renderLeads(items){
  const tbody = $("leadTbody");
  const q = $("search").value.trim().toLowerCase();

  const filtered = items.filter(l => {
    const tags = (l.tags || []).join(" ").toLowerCase();
    return (
      l.nome?.toLowerCase().includes(q) ||
      l.canal?.toLowerCase().includes(q) ||
      tags.includes(q)
    );
  });

  if(filtered.length === 0){
    tbody.innerHTML = `<tr><td colspan="6" class="muted">Nenhum lead encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(l => {
    const tagsHtml = (l.tags || []).map(t => `<span class="badge">${t}</span>`).join("");
    return `
      <tr>
        <td><strong>${l.nome || ""}</strong><div class="muted">${l.id}</div></td>
        <td>${l.canal || ""}</td>
        <td>${l.telefone || "—"}</td>
        <td>${tagsHtml || "—"}</td>
        <td>${fmtDate(l.last_contact_at)}</td>
        <td>
          <button class="btn secondary" data-action="reminder" data-id="${l.id}">Lembrete</button>
          <button class="btn secondary" data-action="select" data-id="${l.id}">Selecionar</button>
        </td>
      </tr>
    `;
  }).join("");
}

async function refreshLeads(){
  const data = await httpGet("/crm/leads");
  leadsCache = data.items || [];
  renderLeads(leadsCache);
}

async function createLead(e){
  e.preventDefault();

  const nome = $("nome").value.trim();
  const telefone = $("telefone").value.trim() || null;
  const canal = $("canal").value;
  const tags = $("tags").value
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  $("formMsg").textContent = "Enviando...";
  try{
    await httpPost("/crm/leads", { nome, telefone, canal, tags });
    $("formMsg").textContent = "✅ Lead cadastrado!";
    $("leadForm").reset();
    await refreshLeads();
  }catch(err){
    $("formMsg").textContent = `❌ Erro: ${err.message}`;
  }
}

async function getColdLeads(){
  $("coldResult").textContent = "Buscando...";
  const days = Number($("coldDays").value || 30);
  try{
    const data = await httpGet(`/crm/cold-leads?days=${encodeURIComponent(days)}`);
    const items = data.items || [];
    if(items.length === 0){
      $("coldResult").textContent = `Nenhum lead frio nos últimos ${days} dias.`;
      return;
    }
    $("coldResult").innerHTML = items
      .map(l => `• <strong>${l.nome}</strong> (${l.canal}) — último: ${fmtDate(l.last_contact_at)}`)
      .join("<br/>");
  }catch(err){
    $("coldResult").textContent = `❌ Erro: ${err.message}`;
  }
}

async function generateReminder(leadId){
  $("reminderBox").value = "Gerando mensagem...";
  try{
    const data = await httpGet(`/crm/leads/${leadId}/reminder`);
    $("reminderBox").value = data.mensagem || "";
    $("copyMsg").textContent = "";
  }catch(err){
    $("reminderBox").value = `❌ Erro: ${err.message}`;
  }
}

function selectLead(leadId){
  $("interactionLeadId").value = leadId;
  $("interactionMsg").textContent = `Lead selecionado: ${leadId}`;
}

async function registerInteraction(){
  const leadId = $("interactionLeadId").value.trim();
  const tipo = $("interactionType").value;
  const note = $("interactionNote").value.trim() || "";

  if(!leadId){
    $("interactionMsg").textContent = "❌ Preencha o Lead ID (use “Selecionar”).";
    return;
  }

  $("interactionMsg").textContent = "Enviando...";
  try{
    await httpPost(`/crm/leads/${leadId}/interacoes`, { tipo, note });
    $("interactionMsg").textContent = "✅ Interação registrada!";
    $("interactionNote").value = "";
    await refreshLeads();
  }catch(err){
    $("interactionMsg").textContent = `❌ Erro: ${err.message}`;
  }
}

async function pingHealth(){
  try{
    const data = await httpGet("/health");
    alert(`✅ Backend OK!\n${JSON.stringify(data, null, 2)}`);
  }catch(err){
    alert(`❌ Backend não respondeu.\n${err.message}`);
  }
}

function wireTableActions(){
  $("leadTbody").addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if(!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if(action === "reminder") await generateReminder(id);
    if(action === "select") selectLead(id);
  });
}

function copyReminder(){
  const txt = $("reminderBox").value;
  if(!txt) return;
  navigator.clipboard.writeText(txt).then(() => {
    $("copyMsg").textContent = "✅ Copiado!";
    setTimeout(() => $("copyMsg").textContent = "", 1200);
  });
}

function init(){
  $("leadForm").addEventListener("submit", createLead);
  $("btnRefresh").addEventListener("click", refreshLeads);
  $("btnCold").addEventListener("click", getColdLeads);
  $("btnPing").addEventListener("click", pingHealth);
  $("btnCopy").addEventListener("click", copyReminder);
  $("btnInteraction").addEventListener("click", registerInteraction);
  $("search").addEventListener("input", () => renderLeads(leadsCache));

  wireTableActions();
  refreshLeads().catch(() => {});
}

document.addEventListener("DOMContentLoaded", init);
