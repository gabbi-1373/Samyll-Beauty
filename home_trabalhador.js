// ── DADOS INICIAIS ──────────────────────────────────────────────────────────

const agendamentosIniciais = {
    cabelo: [
        { hora: '09:00', cliente: 'Mariana Silva',  servico: 'Escova progressiva',     valor: 120 },
        { hora: '11:30', cliente: 'Juliana Costa',  servico: 'Coloração + hidratação', valor: 180 },
        { hora: '14:00', cliente: 'Fernanda Melo',  servico: 'Corte feminino',          valor: 60  },
    ],
    unha: [
        { hora: '10:00', cliente: 'Patricia Souza', servico: 'Gel nas unhas',           valor: 90  },
        { hora: '13:00', cliente: 'Camila Rocha',   servico: 'Esmaltação em gel',       valor: 70  },
    ],
};

const materiaisIniciais = [
    { nome: 'Shampoo Hidratante',   cat: 'cabelo',    status: 'ok',     obs: 'Utilizado no atendimento das 11h' },
    { nome: 'Creme de Coloração',   cat: 'cabelo',    status: 'low',    obs: 'Pouco restante — pedir mais' },
    { nome: 'Base Líquida',         cat: 'maquiagem', status: 'ok',     obs: '' },
    { nome: 'Esmalte Cremoso Rosa', cat: 'unha',      status: 'acabou', obs: 'Acabou durante atendimento 13h' },
    { nome: 'Toxina Botulínica',    cat: 'botox',     status: 'ok',     obs: '' },
];

// ── HELPERS DE LOCALSTORE ────────────────────────────────────────────────────

const LS = {
    get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(key);
            return raw !== null ? JSON.parse(raw) : fallback;
        } catch { return fallback; }
    },
    set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    },
    remove(key) {
        try { localStorage.removeItem(key); } catch {}
    },
};

// Chave de data para resetar estado a cada novo dia
const TODAY_KEY = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

function guardaDia() {
    const salvo = LS.get('sb_dia');
    if (salvo !== TODAY_KEY) {
        // Novo dia → limpa estados transitórios do dia anterior
        LS.remove('sb_confirmados');
        LS.remove('sb_pontos');
        LS.remove('sb_saldoItems');
        LS.remove('sb_saldoDia');
        LS.set('sb_dia', TODAY_KEY);
    }
}

// ── ESTADO EM MEMÓRIA ────────────────────────────────────────────────────────

let materiais   = LS.get('sb_materiais', materiaisIniciais);
let confirmados = LS.get('sb_confirmados', {});   // { "cabelo-0": true, ... }
let pontos      = LS.get('sb_pontos', {});         // { "entrada-cabelo": "09:01", ... }
let saldoItems  = LS.get('sb_saldoItems', []);
let saldoDia    = LS.get('sb_saldoDia', 0);

// ── MAPEAMENTOS ──────────────────────────────────────────────────────────────

const statusLabel = { ok: 'Disponível', low: 'Pouco Estoque', acabou: 'Acabou' };
const statusClass = { ok: 'status-ok',  low: 'status-low',    acabou: 'status-acabou' };
const catIcon     = { cabelo:'💇', sobrancelha:'✨', maquiagem:'💄', unha:'💅', botox:'💉', geral:'🧹' };

// ── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    guardaDia();

    // Data de hoje no hero
    const d = new Date();
    document.getElementById('data-hoje').textContent =
        d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    renderSchedule('cabelo');
    renderSchedule('unha');
    renderMaterials();
    renderSaldo();
    restaurarPontos();
});

// ── NAVEGAÇÃO ────────────────────────────────────────────────────────────────

function openPanel(id, btn) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tabs button').forEach(b => b.classList.remove('active'));
    document.getElementById('panel-' + id).classList.add('active');
    if (btn) btn.classList.add('active');
}

// ── AGENDAMENTOS ─────────────────────────────────────────────────────────────

function renderSchedule(area) {
    const list = document.getElementById(area + '-list');
    if (!list) return;
    const items = agendamentosIniciais[area] || [];

    list.innerHTML = items.map((a, idx) => {
        const key = `${area}-${idx}`;
        const jaConfirmado = confirmados[key];
        return `
        <div class="appointment-card">
            <div class="appt-left">
                <div class="appt-time">${a.hora}</div>
                <div class="appt-info">
                    <h4>${a.cliente}</h4>
                    <p>${a.servico} &nbsp;·&nbsp; <strong>R$ ${a.valor},00</strong></p>
                </div>
            </div>
            <div class="appt-right">
                <button
                    class="btn btn-primary btn-sm"
                    id="btn-confirmar-${key}"
                    onclick="confirmarAtendimento(this, '${a.cliente}', ${a.valor}, '${key}')"
                    ${jaConfirmado ? 'disabled style="opacity:0.6"' : ''}>
                    ${jaConfirmado ? '✓ Confirmado' : '✓ Confirmar'}
                </button>
                <button class="btn btn-outline btn-sm" onclick="showToast('Atendimento desmarcado')">Desmarcar</button>
            </div>
        </div>`;
    }).join('');
}

function confirmarAtendimento(btn, cliente, valor, key) {
    if (confirmados[key]) return;

    btn.textContent = '✓ Confirmado';
    btn.disabled = true;
    btn.style.opacity = '0.6';

    confirmados[key] = true;
    LS.set('sb_confirmados', confirmados);

    adicionarSaldoItem(cliente, valor);
    showToast(`Atendimento de ${cliente} confirmado! +R$ ${valor},00`);
}

// ── PONTO ────────────────────────────────────────────────────────────────────

function baterPonto(tipo, area) {
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const key = `${tipo}-${area}`;
    pontos[key] = now;
    LS.set('sb_pontos', pontos);

    document.getElementById(key).textContent = now;
    showToast(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada às ${now}`);
}

function restaurarPontos() {
    Object.entries(pontos).forEach(([key, hora]) => {
        const el = document.getElementById(key);
        if (el) el.textContent = hora;
    });
}

// ── HIGIENE ──────────────────────────────────────────────────────────────────

function renderMaterials() {
    const grid = document.getElementById('material-grid');
    grid.innerHTML = materiais.map(m => `
        <div class="material-card">
            <div class="material-icon">${catIcon[m.cat] || '🧴'}</div>
            <div class="material-info">
                <h4>${m.nome}</h4>
                <p>${m.cat.charAt(0).toUpperCase() + m.cat.slice(1)}${m.obs ? ' · ' + m.obs : ''}</p>
            </div>
            <span class="material-status ${statusClass[m.status]}">${statusLabel[m.status]}</span>
        </div>
    `).join('');
}

function openModal()  { document.getElementById('modal-higiene').classList.add('open'); }
function closeModal() { document.getElementById('modal-higiene').classList.remove('open'); }

function addMaterial() {
    const nome   = document.getElementById('mat-nome').value.trim();
    const cat    = document.getElementById('mat-cat').value;
    const status = document.getElementById('mat-status').value;
    const obs    = document.getElementById('mat-obs').value.trim();
    if (!nome) { showToast('Informe o nome do material'); return; }

    materiais.push({ nome, cat, status, obs });
    LS.set('sb_materiais', materiais);  // persiste no localStorage

    renderMaterials();
    closeModal();
    document.getElementById('mat-nome').value = '';
    document.getElementById('mat-obs').value  = '';
    showToast('Material adicionado!');
}

// ── SALDO ────────────────────────────────────────────────────────────────────

function adicionarSaldoItem(cliente, valor) {
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    saldoItems.push({ cliente, valor, hora });
    saldoDia += valor;
    LS.set('sb_saldoItems', saldoItems);
    LS.set('sb_saldoDia', saldoDia);
    renderSaldo();
}

function renderSaldo() {
    document.getElementById('saldo-dia').textContent    = `R$ ${saldoDia.toFixed(2).replace('.', ',')}`;
    document.getElementById('saldo-semana').textContent = `R$ ${(saldoDia + 430).toFixed(2).replace('.', ',')}`;
    document.getElementById('saldo-total').textContent  = `R$ ${(saldoDia + 1250).toFixed(2).replace('.', ',')}`;

    const el = document.getElementById('saldo-items');
    if (saldoItems.length === 0) {
        el.innerHTML = '<p style="color:var(--warm-mid);font-size:0.9rem;">Nenhum atendimento confirmado ainda.</p>';
        return;
    }
    el.innerHTML = saldoItems.map(i => `
        <div class="saldo-item">
            <div class="saldo-item-info">
                <h4>${i.cliente}</h4>
                <p>${i.hora}</p>
            </div>
            <div class="saldo-item-amount">+ R$ ${i.valor},00</div>
        </div>
    `).join('');
}

function retirarSaldo() {
    if (saldoDia === 0) { showToast('Nenhum valor disponível para retirada.'); return; }
    showToast(`Retirada de R$ ${saldoDia.toFixed(2).replace('.', ',')} solicitada!`);
    saldoDia = 0;
    saldoItems = [];
    LS.set('sb_saldoItems', saldoItems);
    LS.set('sb_saldoDia', saldoDia);
    renderSaldo();
}

// ── TOAST ────────────────────────────────────────────────────────────────────

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}