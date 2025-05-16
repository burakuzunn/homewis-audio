/* ------------------- PARAMETRELER ------------------- */
const SAMPLE_WINDOW = 128; // RMS için örnek sayısı
const MIN_DB = 0; // gösterge alt sınırı
const MAX_DB = 80; // gösterge üst sınırı
const UI_INTERVAL_MS = 150; // UI güncelleme sıklığı
const SLIDER_LERP = 0.5; // 0–1 arası (0 = anlık, 1 = çok yavaş)

/* ------------------- DOM ------------------- */
const valEl = document.getElementById("value"); // büyük dB
const statEl = document.getElementById("status"); // “Çok sessiz” vs.
const ptrEl = document.getElementById("pointer"); // mavi çizgi
const bars = [...document.querySelectorAll("#bar-container .bar")];

// (İstersen min/avg/max göstergelerine de ID ver)
const minEl = document.getElementById("mindbText"); // opsiyonel
const avgEl = document.getElementById("avrdbText");
const maxEl = document.getElementById("maxdbText");

let ctx, analyser;
let smoothDb = 0;

/* istatistik */
let minDb = Infinity;
let maxDb = -Infinity;
let sumDb = 0;
let sampleCnt = 0;

/* ------------------- WEB AUDIO ------------------- */
async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new(window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;

        ctx.createMediaStreamSource(stream).connect(analyser);

        setInterval(updateUI, UI_INTERVAL_MS);
    } catch (e) {
        valEl.textContent = "İzin reddedildi";
        statEl.textContent = "";
        console.error("Mic error:", e);
    }
}

/* ------------------- SEVİYE HESABI ------------------- */
function getRms() {
    const buf = new Float32Array(SAMPLE_WINDOW);
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
}

function getDb() {
    const rms = getRms();
    const db = 20 * Math.log10(rms);
    const shifted = db + MAX_DB; // negatifleri pozitife çek
    return Math.min(Math.max(shifted, MIN_DB), MAX_DB);
}

/* ------------------- UI ------------------- */
function updateStatus(db) {
    if (db < 40) {
        statEl.textContent = "Çok sessiz";
        statEl.style.color = "var(--quiet)";
    } else if (db < 70) {
        statEl.textContent = "Orta";
        statEl.style.color = "var(--mid)";
    } else {
        statEl.textContent = "Yüksek";
        statEl.style.color = "var(--loud)";
    }
}

function updateUI() {
    const db = getDb();

    /* Slider/bar yumuşatma */
    smoothDb = smoothDb * (1 - SLIDER_LERP) + db * SLIDER_LERP;

    /* bar & pointer */
    const norm = smoothDb / MAX_DB; // 0-1
    ptrEl.style.top = `${(1 - norm) * 100}%`;
    const active = Math.round(norm * bars.length);
    bars.forEach((b, i) => b.style.opacity = i < active ? "1" : "0.25");

    /* sayısal ve durum metni */
    valEl.innerHTML = `${Math.round(smoothDb)} <span>dB</span>`;
    updateStatus(smoothDb);

    /* istatistikler */
    minDb = Math.min(minDb, db);
    maxDb = Math.max(maxDb, db);
    sumDb += db;
    sampleCnt++;

    if (minEl) minEl.textContent = `${Math.round(minDb)}`;
    if (avgEl) avgEl.textContent = `${Math.round(sumDb / sampleCnt)}`;
    if (maxEl) maxEl.textContent = `${Math.round(maxDb)}`;
}

/* ------------------- succes ------------------- */
window.addEventListener("load", init);