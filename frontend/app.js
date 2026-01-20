console.log("app.js carregado - versao nova");

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

function daysSince(iso){
  if(!iso) return null;
  const d = new Date(iso);
  if(Number.isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  return ms / (1000 * 60 * 60 * 24);
}

function normalizeStr(s){
  return (s || "").toString().toLowerCase();
}

/**
 * Score simples (MVP) para “Top Prioridades Hoje”
 * - base: dias desde último contato (mais dias => mais prioridade)
 * - tags “recorrente”, “barbearia”, “vip”, “quente”, “urgente” aumentam
 * - canal "instagram" levemente acima (só pra variar visualmente)
 */
function leadScore(lead){
  const d = daysSince(lead.last_contact_at) ?? daysSince(lead.created_at) ?? 0;
  const tags = (lead.tags || []).map(t => normalizeStr(t));
  let bonus = 0;

  if(tags.includes("urgente")) bonus += 25;
  if(tags.includes("vip")) bonus += 15;
  if(tags.includes("recorrente")) bonus += 10;
  if(tags.includes("barbearia")) bonus += 8;
  if(tags.includes("quente")) bonus += 6;

  if(normalizeStr(lead.canal) === "instagram") bonus += 3;

  // score final: dias * 3 + bonus (arredondado)
  return Math.round(d * 3 + bonus);
}

function statusFromScore(score){
  if(score >= 80) return { label:"Urgente", cls:"danger" };
  if(score >= 60) return { label:"Alta", cls:"high" };     // laranja
  if(score >= 35) return { label:"Média", cls:"medium" };  // amarelo
  return { label:"Baixa", cls:"success" };                 // verde
}



function badgeForTag(tag){
  const t = normalizeStr(tag);
  if(t === "recorrente" || t === "vip") return "badge success";
  if(t === "urgente") return "badge warn";
  return "badge";
}

function renderLeads(items){
  const tbody = $("leadTbody");
  const q = $("search").value.trim().toLowerCase();

  const filtered = items.filter(l => {
    const tags = (l.tags || []).join(" ").toLowerCase();
    return (
      normalizeStr(l.nome).includes(q) ||
      normalizeStr(l.canal).includes(q) ||
      tags.includes(q)
    );
  });

  if(filtered.length === 0){
    tbody.innerHTML = `<tr><td colspan="6" class="muted">Nenhum lead encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(l => {
    const tagsHtml = (l.tags || [])
      .map(t => `<span class="${badgeForTag(t)}">${t}</span>`)
      .join(" ");
    const score = leadScore(l);
    const s = statusFromScore(score);
    const pill = `<span class="scorePill ${s.cls}">${s.label} • ${score}</span>`;

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <div>
              <strong>${l.nome || ""}</strong>
              <div class="muted">${l.id}</div>
            </div>
            ${pill}
          </div>
        </td>

        <td>${l.canal || ""}</td>
        <td>${l.telefone || "—"}</td>
        <td>${tagsHtml || "—"}</td>
        <td>${fmtDate(l.last_contact_at)}</td>
        <td>
          <button class="btn ghost small" data-action="reminder" data-id="${l.id}">Lembrete</button>
          <button class="btn ghost small" data-action="select" data-id="${l.id}">Selecionar</button>
        </td>
      </tr>
    `;
  }).join("");
}

function setText(id, value){
  const el = $(id);
  if(!el) return;
  el.textContent = String(value);
}

function computeCounts(items){
  const coldDays = Number($("coldDays")?.value || 30);
  const now = Date.now();
  const hotDays = 7;

  let total = items.length;
  let cold = 0;
  let hot = 0;

  for(const l of items){
    const last = l.last_contact_at || l.created_at;
    const dt = new Date(last);
    if(!Number.isNaN(dt.getTime())){
      const d = (now - dt.getTime()) / (1000*60*60*24);
      if(d >= coldDays) cold++;
      if(d <= hotDays) hot++;
    }
  }

  return { total, cold, hot, coldDays, hotDays };
}

function renderKPIs(items){
  const c = computeCounts(items);

  // Top KPIs (card frio)
  setText("kpiTotal", c.total);
  setText("kpiCold", c.cold);

  // Chips (card mensagem)
  setText("chipTotal", c.total);
  setText("chipCold", c.cold);

  // Tabs (lista)
  setText("tabTotal", c.total);
  setText("tabCold", c.cold);
  setText("tabHot", c.hot);
}

function renderPriorities(items){
  const grid = $("prioGrid");
  if(!grid) return;

  if(items.length === 0){
    // deixa os placeholders do HTML mesmo
    return;
  }

  const ranked = [...items]
    .map(l => ({ lead: l, score: leadScore(l) }))
    .sort((a,b) => b.score - a.score)
    .slice(0, 3);

  // se tiver menos de 3, completa
  while(ranked.length < 3){
    ranked.push({
      lead: { id: "", nome: "—", canal: "—", tags: [], last_contact_at: null, created_at: null },
      score: 0
    });
  }

  grid.innerHTML = ranked.map(({lead, score}) => {
    const s = statusFromScore(score);
    const tags = (lead.tags || []).slice(0, 3);
    const tagsLine = tags.length ? tags.map(t => `• ${t}`).join("<br/>") : "• (sem tags)";
    const last = lead.last_contact_at ? fmtDate(lead.last_contact_at) : "—";

    // ✅ pill com cor + label + score (igual o padrão)
    const pill = `<span class="scorePill ${s.cls}">${s.label} • ${score}</span>`;

    return `
      <div class="prioCard">
        <div class="prioTop">
          <div>
            <div class="prioName">${lead.nome || "—"}</div>
            <div class="prioMeta muted">score: <b>${score}</b> • último: ${last}</div>
          </div>
          ${pill}
        </div>
        <div class="prioList muted">
          ${tagsLine}<br/>
          • canal: ${lead.canal || "—"}
        </div>
        <button class="btn ghost small" type="button" data-action="reminder" data-id="${lead.id || ""}" ${lead.id ? "" : "disabled"}>
          Gerar decisão
        </button>
      </div>
    `;
  }).join("");

  // permitir “Gerar decisão” reaproveitando reminder
  grid.querySelectorAll("button[data-action='reminder']").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if(id) await generateReminder(id);
    });
  });
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
      .slice(0, 8)
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

/**
 * Seed: cria alguns leads + interações para simular “último contato”
 * (Assim o dashboard fica bonito na hora, como no print.)
 */
async function seedExample(){
  const examples = [
    { nome:"João S.", canal:"whatsapp", telefone:"(51) 98438-0621", tags:["urgente","recorrente"] },
    { nome:"Tiago C.", canal:"whatsapp", telefone:"11 99900-0900", tags:["alta","barbearia"] },
    { nome:"Maria A.", canal:"instagram", telefone:"", tags:["média"] },
    { nome:"Junior P.", canal:"email", telefone:"", tags:["google ads"] },
  ];

  // cria
  const created = [];
  for(const ex of examples){
    try{
      const r = await httpPost("/crm/leads", ex);
      created.push(r.lead);
    }catch(_){
      // se falhar, ignora (pode ter CORS/servidor desligado)
    }
  }

  // registra interações em alguns para gerar last_contact_at (simula quente/frio)
  // - João: contato recente (hoje)
  // - Tiago: contato 2 dias atrás (a API salva "agora", então só marcamos interação; os dias serão aproximados)
  // - Maria: sem contato (fica mais "fria" dependendo do tempo)
  for(const lead of created){
    if(!lead?.id) continue;
    if(lead.nome.startsWith("João")){
      await httpPost(`/crm/leads/${lead.id}/interacoes`, { tipo:"mensagem_enviada", note:"Seed: lembrete enviado" });
    }
    if(lead.nome.startsWith("Tiago")){
      await httpPost(`/crm/leads/${lead.id}/interacoes`, { tipo:"resposta", note:"Seed: respondeu" });
    }
  }

  await refreshLeads();
}

function init(){
  $("leadForm").addEventListener("submit", createLead);
  $("btnRefresh").addEventListener("click", refreshLeads);
  $("btnCold").addEventListener("click", getColdLeads);
  $("btnPing").addEventListener("click", pingHealth);
  $("btnCopy").addEventListener("click", copyReminder);
  $("btnInteraction").addEventListener("click", registerInteraction);
  $("search").addEventListener("input", () => renderLeads(leadsCache));

  const btnSeed = $("btnSeed");
  if(btnSeed) btnSeed.addEventListener("click", seedExample);

  // quando muda os dias, recalcula KPIs na hora
  const coldDays = $("coldDays");
  if(coldDays) coldDays.addEventListener("input", () => renderKPIs(leadsCache));

  wireTableActions();
  refreshLeads().catch(() => {});
}

async function refreshLeads(){
  const data = await httpGet("/crm/leads");
  leadsCache = data.items || [];

  // se essas funções existirem no seu arquivo, elas serão chamadas
  if (typeof renderKPIs === "function") renderKPIs(leadsCache);
  if (typeof renderLeads === "function") renderLeads(leadsCache);
  if (typeof renderPriorities === "function") renderPriorities(leadsCache);
}

document.addEventListener("DOMContentLoaded", init);
