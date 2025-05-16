const valEl = document.getElementById("value");
const statEl = document.getElementById("status");
const ptrEl = document.getElementById("pointer");
const container = document.getElementById("bar-container");

const barCount = 100;
const bars = [];

/* bar renkleri */
for (let i = 0; i < barCount; i++) {
    const bar = document.createElement("div");
    bar.className = "bar";
    if (i < 30) bar.classList.add("green");
    else if (i < 60) bar.classList.add("yellow");
    else if (i < 80) bar.classList.add("orange");
    else bar.classList.add("red");
    container.appendChild(bar);
    bars.push(bar);
}

/* Audio vars */
let ctx, analyser;

/* tek sefer referans */
const CAL_TIME = 1000; // 1 s
let refDb = null;
let calEnd = 0;
let accDb = 0,
    accN = 0;

/* EMA */
let emaDb = 0;

function updateStatus(db) {
    if (db < 40) { statEl.textContent = "Çok sessiz";
        statEl.style.color = "var(--quiet)"; } else if (db < 70) { statEl.textContent = "Orta";
        statEl.style.color = "var(--mid)"; } else { statEl.textContent = "Yüksek";
        statEl.style.color = "var(--loud)"; }
}

function render() {
    /* tek RMS */
    const N = analyser.fftSize;
    const data = new Uint8Array(N);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < N; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
    }
    const rms = Math.sqrt(sum / N);
    const rawDb = Math.max(0, 20 * Math.log10(rms) + 100);

    /* referans yakala bir kez */
    const now = performance.now();
    if (refDb === null) {
        if (calEnd === 0) calEnd = now + CAL_TIME;
        accDb += rawDb;
        accN++;
        if (now >= calEnd) refDb = accDb / accN;
    }

    const adjDb = refDb ? Math.max(0, rawDb - refDb) : 0;

    /* EMA α=0.15 */
    emaDb = 0.85 * emaDb + 0.15 * adjDb;

    /* 0–100 ölçek (30 dB tepe) */
    const norm = Math.min(emaDb / 30, 1);
    const disp = Math.round(norm * 100);

    /* UI */
    valEl.innerHTML = `${disp} <span>dB</span>`;
    updateStatus(disp);
    ptrEl.style.top = `${(1-norm)*100}%`;

    const active = Math.round(norm * barCount);
    bars.forEach((b, i) => b.style.opacity = i < active ? "1" : "0.25");
}

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new(window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 4096; // stabil RMS

        ctx.createMediaStreamSource(stream).connect(analyser);

        setInterval(render, 150); // 150 ms döngü
    } catch (e) {
        valEl.textContent = "İzin reddedildi";
        statEl.textContent = "";
        console.error("Mic error:", e);
    }
}
window.addEventListener("load", init);