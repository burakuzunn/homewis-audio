const valEl = document.getElementById("value");
const statEl = document.getElementById("status");
const ptrEl = document.getElementById("pointer");
const container = document.getElementById("bar-container");

const barCount = 100;
/* barları oluştur */
for (let i = 0; i < barCount; i++) {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.classList.add(
        i < 30 ? "green" :
        i < 60 ? "yellow" :
        i < 80 ? "orange" : "red"
    );
    container.appendChild(bar);
}

/* Web-Audio */
let ctx, analyser;

/* 1 s ref kalibrasyonu */
const CAL_TIME = 1000;
let refDb = null;
let calSum = 0,
    calN = 0,
    calEnd = 0;

/* 20-öğeli halka tampon ≈ 3 s */
const BUF_LEN = 20;
const dbBuf = new Array(BUF_LEN).fill(0);
let bufIdx = 0;

function updateStatus(db) {
    if (db < 40) { statEl.textContent = "Çok sessiz";
        statEl.style.color = "var(--quiet)"; } else if (db < 70) { statEl.textContent = "Orta";
        statEl.style.color = "var(--mid)"; } else { statEl.textContent = "Yüksek";
        statEl.style.color = "var(--loud)"; }
}

function rmsToDb(rms) {
    return Math.max(0, 20 * Math.log10(rms) + 100);
}

function median(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function render() {
    /* tek RMS ölç */
    const N = analyser.fftSize;
    const data = new Uint8Array(N);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < N; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
    }
    const rms = Math.sqrt(sum / N);
    const rawDb = rmsToDb(rms);

    /* ref kalibrasyonu ilk 1 s */
    const now = performance.now();
    if (refDb === null) {
        if (calEnd === 0) calEnd = now + CAL_TIME;
        calSum += rawDb;
        calN++;
        if (now >= calEnd) refDb = calSum / calN;
    }

    const adjDb = refDb ? Math.max(0, rawDb - refDb) : 0;

    /* halka tampon → medyan */
    dbBuf[bufIdx++] = adjDb;
    if (bufIdx === BUF_LEN) bufIdx = 0;
    const medDb = median(dbBuf);

    /* 0-100 ölçek (30 dB = %100) */
    const norm = Math.min(medDb / 30, 1);
    const disp = Math.round(norm * 100);

    /* UI */
    valEl.innerHTML = `${disp} <span>dB</span>`;
    updateStatus(disp);
    ptrEl.style.top = `${(1-norm)*100}%`;

    const active = Math.round(norm * barCount);
    [...container.children].forEach((b, i) => b.style.opacity = i < active ? "1" : "0.25");
}

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new(window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 4096; // ≈93 ms

        ctx.createMediaStreamSource(stream).connect(analyser);

        setInterval(render, 150); // 150 ms
    } catch (err) {
        valEl.textContent = "İzin reddedildi";
        statEl.textContent = "";
        console.error("Mic error:", err);
    }
}
window.addEventListener("load", init);