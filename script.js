/* ---------------- PARAMETRELER ---------------- */
const SAMPLE_WINDOW = 128; // RMS örnek sayısı
const MIN_DB = 0;
const MAX_DB = 80;
const UI_INTERVAL = 150; // ms
const SLIDER_LERP = 0.5; // 0–1
const TOTAL_BARS = 40; // gösterge segmenti

/* ---------------- DOM ---------------- */
const valEl = document.getElementById("value");
const statEl = document.getElementById("status");
const ptrEl = document.getElementById("pointer");
const barCont = document.getElementById("bar-container");

/* ---- BARLARI OLUŞTUR ---- */
for (let i = 0; i < TOTAL_BARS; i++) {
    const div = document.createElement("div");
    div.classList.add("bar");
    const r = i / TOTAL_BARS;
    if (r < 0.50) div.classList.add("green");
    else if (r < 0.75) div.classList.add("yellow");
    else if (r < 0.90) div.classList.add("orange");
    else div.classList.add("red");
    barCont.appendChild(div);
}
const bars = [...document.querySelectorAll("#bar-container .bar")];

/* ---------------- SES ---------------- */
let ctx, analyser, smoothDb = 0;
/* istatistik (opsiyonel) */
let minDb = Infinity,
    maxDb = -Infinity,
    sumDb = 0,
    cnt = 0;

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new(window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        ctx.createMediaStreamSource(stream).connect(analyser);
        setInterval(updateUI, UI_INTERVAL);
    } catch (e) {
        valEl.textContent = "İzin reddedildi";
        console.error(e);
    }
}

function getRms() {
    const buf = new Float32Array(SAMPLE_WINDOW);
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    return Math.sqrt(sum / buf.length);
}

function getDb() {
    const db = 20 * Math.log10(getRms()) + MAX_DB; // negatifleri pozitife kaydır
    return Math.min(Math.max(db, MIN_DB), MAX_DB);
}

function updateStatus(db) {
    if (db < 40) { statEl.textContent = "Çok sessiz";
        statEl.style.color = "var(--quiet)"; } else if (db < 70) { statEl.textContent = "Orta";
        statEl.style.color = "var(--mid)"; } else { statEl.textContent = "Yüksek";
        statEl.style.color = "var(--loud)"; }
}

function updateUI() {
    const db = getDb();
    smoothDb = smoothDb * (1 - SLIDER_LERP) + db * SLIDER_LERP;

    /* pointer & bar opacity */
    const norm = smoothDb / MAX_DB; // 0–1
    ptrEl.style.top = `${(1 - norm) * 100}%`;
    const active = Math.round(norm * bars.length);
    bars.forEach((b, i) => b.style.opacity = i < active ? "1" : "0.25");

    /* değer & durum metni */
    valEl.innerHTML = `${Math.round(smoothDb)} <span>dB</span>`;
    updateStatus(smoothDb);

    /* (isteğe bağlı istatistik) */
    minDb = Math.min(minDb, db);
    maxDb = Math.max(maxDb, db);
    sumDb += db;
    cnt++;
}

/* ---------------- START ---------------- */
window.addEventListener("load", init);