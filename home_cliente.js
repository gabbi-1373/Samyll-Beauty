/* ── CATÁLOGO DE SERVIÇOS ───────────────────────────────────────────────── */
const catalogo = {
    cabelo: [
        { nome: 'Escova Progressiva',     preco: 120, dur: '2h'    },
        { nome: 'Coloração + Hidratação', preco: 180, dur: '3h'    },
        { nome: 'Corte Feminino',          preco: 60,  dur: '1h'    },
        { nome: 'Hidratação Profunda',     preco: 80,  dur: '1h30'  },
    ],
    sobrancelha: [
        { nome: 'Design de Sobrancelha',  preco: 40,  dur: '30min' },
        { nome: 'Henna',                   preco: 55,  dur: '45min' },
        { nome: 'Laminação',               preco: 70,  dur: '1h'    },
    ],
    maquiagem: [
        { nome: 'Maquiagem Social',        preco: 80,  dur: '1h'    },
        { nome: 'Maquiagem Festa',         preco: 110, dur: '1h30'  },
        { nome: 'Maquiagem Noiva',         preco: 180, dur: '2h'    },
    ],
    unha: [
        { nome: 'Esmaltação Simples',      preco: 35,  dur: '45min' },
        { nome: 'Gel nas Unhas',           preco: 90,  dur: '1h30'  },
        { nome: 'Nail Art',                preco: 70,  dur: '1h'    },
    ],
    botox: [
        { nome: 'Botox Capilar Simples',   preco: 120, dur: '2h'    },
        { nome: 'Reconstrução Capilar',    preco: 160, dur: '3h'    },
        { nome: 'Alisamento Suave',        preco: 140, dur: '2h30'  },
    ],
};

const HORARIOS = ['09:00','09:30','10:00','10:30','11:00','11:30',
                  '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];
const OCUPADOS = { 5: ['09:00','11:00'], 12: ['13:00','14:30'], 20: ['10:00'] };

const ENDERECO = 'Rua das Flores, 142 — Centro';

/* ── LOCAL STORAGE ─────────────────────────────────────────────────────── */
const LS = {
    get: (k, fb = null) => { try { const r = localStorage.getItem(k); return r !== null ? JSON.parse(r) : fb; } catch { return fb; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const TODAY_KEY = new Date().toISOString().slice(0, 10);
if (LS.get('sb_cli_dia') !== TODAY_KEY) {
    localStorage.removeItem('sb_cli_booking');
    LS.set('sb_cli_dia', TODAY_KEY);
}

/* ── NOTIFICAÇÕES ──────────────────────────────────────────────────────── */
let notifs = LS.get('sb_cli_notifs', [
    { icon: '🎉', titulo: 'Promoção desta semana!', texto: 'Coloração + hidratação com 20% OFF. Agende já!', lida: false },
    { icon: '✨', titulo: 'Novo serviço disponível', texto: 'Laminação de sobrancelhas agora disponível!', lida: false },
    { icon: '📅', titulo: 'Lembrete', texto: 'Não esqueça do seu horário amanhã às 10h.', lida: true },
]);

function renderNotifs() {
    const list = document.getElementById('notifList');
    list.innerHTML = notifs.map((n, i) => `
        <div class="notif-item ${n.lida ? '' : 'unread'}" onclick="markRead(${i})">
            <div class="ni-ico">${n.icon}</div>
            <div class="ni-body"><strong>${n.titulo}</strong><span>${n.texto}</span></div>
        </div>`).join('');
    document.getElementById('bellDot').classList.toggle('show', notifs.some(n => !n.lida));
}
function toggleNotif() { document.getElementById('notifDropdown').classList.toggle('open'); }
function markRead(i) { notifs[i].lida = true; LS.set('sb_cli_notifs', notifs); renderNotifs(); }
function markAllRead() { notifs.forEach(n => n.lida = true); LS.set('sb_cli_notifs', notifs); renderNotifs(); }

/* ── ESTADO DE AGENDAMENTO ─────────────────────────────────────────────── */
let bookingArea = null, bookingItem = null, bookingDate = null, bookingTime = null;
let calYear, calMonth;

/* ── INIT ───────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    const d = new Date();
    document.getElementById('data-hoje').textContent =
        d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    calYear = d.getFullYear(); calMonth = d.getMonth();

    Object.keys(catalogo).forEach(area => renderServicos(area));
    renderNotifs();

    // restaura agendamento confirmado do dia
    const saved = LS.get('sb_cli_booking');
    if (saved) mostrarSucesso(saved, saved.area, false);

    document.addEventListener('click', e => {
        if (!document.getElementById('bellBtn').contains(e.target) &&
            !document.getElementById('notifDropdown').contains(e.target))
            document.getElementById('notifDropdown').classList.remove('open');
    });
});

/* ── NAVEGAÇÃO ─────────────────────────────────────────────────────────── */
function openPanel(id, btn) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tabs button').forEach(b => b.classList.remove('active'));
    document.getElementById('panel-' + id).classList.add('active');
    if (btn) btn.classList.add('active');
}

/* ── RENDERIZAR SERVIÇOS ───────────────────────────────────────────────── */
function renderServicos(area) {
    const list = document.getElementById(area + '-list');
    if (!list) return;
    list.innerHTML = catalogo[area].map((s, i) => `
        <div class="service-item-card">
            <div class="svc-left">
                <div class="svc-badge">R$ ${s.preco}</div>
                <div class="svc-info">
                    <h4>${s.nome}</h4>
                    <p>Duração estimada: <strong>${s.dur}</strong></p>
                </div>
            </div>
            <div class="svc-right">
                <button class="btn btn-rose btn-sm" onclick="iniciarAgendamento('${area}', ${i})">📅 Agendar</button>
            </div>
        </div>`).join('');
}

/* ── AGENDAMENTO ───────────────────────────────────────────────────────── */
function iniciarAgendamento(area, idx) {
    bookingArea = area; bookingItem = idx; bookingDate = null; bookingTime = null;
    calYear = new Date().getFullYear(); calMonth = new Date().getMonth();

    const wrap = document.getElementById('booking-' + area);
    const svc  = catalogo[area][idx];
    wrap.innerHTML = `
        <h3>📅 Agendamento — ${svc.nome}</h3>
        <div class="cal-nav">
            <button onclick="changeMonth(-1,'${area}')">‹</button>
            <span id="cal-label-${area}"></span>
            <button onclick="changeMonth(1,'${area}')">›</button>
        </div>
        <div class="cal-grid" id="cal-grid-${area}"></div>
        <div class="times-wrap" id="times-wrap-${area}" style="display:none">
            <p class="times-title">Horários disponíveis</p>
            <div class="times-grid" id="times-grid-${area}"></div>
            <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
                <button class="btn btn-outline btn-sm" onclick="fecharBooking('${area}')">← Voltar</button>
                <button class="btn btn-primary btn-sm" onclick="abrirModal('${area}')">Próximo →</button>
            </div>
        </div>
        <div class="confirm-box" id="confirm-box-${area}"></div>
        <div class="success-box" id="success-box-${area}"></div>`;
    wrap.classList.add('open');
    wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    renderCal(area);
}

function fecharBooking(area) {
    const wrap = document.getElementById('booking-' + area);
    wrap.classList.remove('open');
}

/* calendário */
function changeMonth(dir, area) {
    calMonth += dir;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    if (calMonth < 0)  { calMonth = 11; calYear--; }
    renderCal(area);
}

function renderCal(area) {
    const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const WD    = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    document.getElementById('cal-label-' + area).textContent = MESES[calMonth] + ' ' + calYear;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const first = new Date(calYear, calMonth, 1).getDay();
    const total = new Date(calYear, calMonth + 1, 0).getDate();
    let html = WD.map(w => `<div class="cal-wd">${w}</div>`).join('');
    for (let i = 0; i < first; i++) html += `<div class="cal-d emp"></div>`;
    for (let d = 1; d <= total; d++) {
        const dt = new Date(calYear, calMonth, d);
        const isSun = dt.getDay() === 0, isPast = dt < today;
        const isTod = dt.getTime() === today.getTime();
        const isSel = bookingDate && dt.getTime() === bookingDate.getTime();
        let cls = 'cal-d';
        if (isSel) cls += ' sel';
        else if (isTod) cls += ' today';
        if (isPast || isSun) cls += ' dis';
        else cls += ' avail';
        const click = (!isPast && !isSun) ? `onclick="pickDay(${d},'${area}')"` : '';
        html += `<div class="${cls}" ${click}>${d}</div>`;
    }
    document.getElementById('cal-grid-' + area).innerHTML = html;
}

function pickDay(d, area) {
    bookingDate = new Date(calYear, calMonth, d);
    bookingTime = null;
    renderCal(area);
    renderTimes(area);
    document.getElementById('times-wrap-' + area).style.display = 'block';
}

function renderTimes(area) {
    const occ = OCUPADOS[bookingDate ? bookingDate.getDate() : 0] || [];
    document.getElementById('times-grid-' + area).innerHTML = HORARIOS.map(h => {
        const taken = occ.includes(h), sel = bookingTime === h;
        let cls = 'time-pill';
        if (sel) cls += ' sel'; if (taken) cls += ' taken';
        return `<div class="${cls}" ${taken ? '' : `onclick="pickTime('${h}','${area}')"`}>${h}${taken ? ' ✗' : ''}</div>`;
    }).join('');
}

function pickTime(h, area) { bookingTime = h; renderTimes(area); }

/* modal de dados */
function abrirModal(area) {
    if (!bookingDate) { showToast('Selecione uma data!'); return; }
    if (!bookingTime) { showToast('Selecione um horário!'); return; }
    const svc = catalogo[bookingArea][bookingItem];
    const ds  = bookingDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('modal-resumo').innerHTML = `
        <div style="background:rgba(201,132,122,0.1);border-radius:12px;padding:16px">
            <div class="confirm-row"><div class="cr-ico">💇</div><div><div class="cr-lbl">Serviço</div><div class="cr-val">${svc.nome}</div></div></div>
            <div class="confirm-row"><div class="cr-ico">📅</div><div><div class="cr-lbl">Data</div><div class="cr-val">${ds}</div></div></div>
            <div class="confirm-row"><div class="cr-ico">🕐</div><div><div class="cr-lbl">Horário</div><div class="cr-val">${bookingTime}</div></div></div>
            <div class="confirm-row"><div class="cr-ico">📍</div><div><div class="cr-lbl">Local</div><div class="cr-val">${ENDERECO}</div></div></div>
            <div class="confirm-row" style="margin-bottom:0"><div class="cr-ico">💰</div><div><div class="cr-lbl">Valor</div><div class="cr-val">R$ ${svc.preco},00</div></div></div>
        </div>`;
    document.getElementById('modal-agend').classList.add('open');
}
function fecharModal() { document.getElementById('modal-agend').classList.remove('open'); }

function finalizarAgendamento() {
    const nome = document.getElementById('ag-nome').value.trim();
    const tel  = document.getElementById('ag-tel').value.trim();
    if (!nome) { showToast('Informe seu nome!'); return; }
    if (!tel)  { showToast('Informe seu telefone!'); return; }
    const svc = catalogo[bookingArea][bookingItem];
    const ds  = bookingDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const dados = { area: bookingArea, svc: svc.nome, data: ds, hora: bookingTime, local: ENDERECO, preco: svc.preco, nome };
    LS.set('sb_cli_booking', dados);

    // adicionar notif de confirmação
    notifs.unshift({ icon: '✅', titulo: 'Agendamento confirmado!', texto: `${svc.nome} — ${ds} às ${bookingTime}`, lida: false });
    LS.set('sb_cli_notifs', notifs);
    renderNotifs();

    fecharModal();
    mostrarSucesso(dados, bookingArea, true);
}

function mostrarSucesso(d, area, scrollTo) {
    const wrap = document.getElementById('booking-' + area);
    if (!wrap) return;
    wrap.classList.add('open');

    // esconde calendário e horários, mostra sucesso
    const sBox = document.getElementById('success-box-' + area);
    if (!sBox) { iniciarAgendamento(area, catalogo[area].findIndex(s => s.nome === d.svc)); return; }
    sBox.innerHTML = `
        <div class="suc-ico">🎉</div>
        <h3>Agendamento Confirmado!</h3>
        <p>Você receberá confirmação pelo WhatsApp. Nos vemos em breve! ✨</p>
        <div class="success-detail">
            <div class="sd-row"><span class="ico">💇</span><div class="txt"><small>Serviço</small><span>${d.svc}</span></div></div>
            <div class="sd-row"><span class="ico">📅</span><div class="txt"><small>Data</small><span>${d.data}</span></div></div>
            <div class="sd-row"><span class="ico">🕐</span><div class="txt"><small>Horário</small><span>${d.hora}</span></div></div>
            <div class="sd-row"><span class="ico">📍</span><div class="txt"><small>Local</small><span>${d.local}</span></div></div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="novoAgendamento('${area}')">+ Novo agendamento</button>`;
    sBox.classList.add('open');
    if (scrollTo) sBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function novoAgendamento(area) {
    LS.set('sb_cli_booking', null);
    bookingDate = null; bookingTime = null;
    renderServicos(area);
    document.getElementById('booking-' + area).classList.remove('open');
}

/* ── TOAST ─────────────────────────────────────────────────────────────── */
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}
