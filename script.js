const valEl = document.getElementById("value");
const statEl = document.getElementById("status");
const ptrEl = document.getElementById("pointer");
const container = document.getElementById("bar-container");

const barCount = 100;
const bars = [];

/* — barlar (0 dB yeşil → 100 dB kırmızı) — */
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

/* Web-Audio */
let ctx, analyser;

/* — tek seferlik kalibrasyon — */
let refDb = null; // sabit referans
let accDb = 0; // ilk N frame’in toplam dB
let frameCnt = 0;
const CAL_FRAMES = 10; // 10×150 ms ≈ 1.5 s

/* EMA pürüz giderme */
let smoothDb = 0;

function updateStatus(db) {
    if (db < 40) { statEl.textContent = "Çok sessiz";
        statEl.style.color = "var(--quiet)"; } else if (db < 70) { statEl.textContent = "Orta";
        statEl.style.color = "var(--mid)"; } else { statEl.textContent = "Yüksek";
        statEl.style.color = "var(--loud)"; }
}

function render() {
    const N = analyser.fftSize;
    const buf = new Uint8Array(N);
    analyser.getByteTimeDomainData(buf);

    /* RMS */
    let sum = 0;
    for (let n = 0; n < N; n++) {
        const v = (buf[n] - 128) / 128;
        sum += v * v;
    }
    const rms = Math.sqrt(sum / N);

    /* dBFS (+100 shift) */
    const rawDb = Math.max(0, 20 * Math.log10(rms) + 100);

    /* — yalnızca ilk CAL_FRAMES karede ortalama alıp refDb olarak sabitle — */
    if (refDb === null) {
        accDb += rawDb;
        frameCnt++;
        if (frameCnt === CAL_FRAMES) {
            refDb = accDb / CAL_FRAMES; // ortalama referans
        }
    }

    /* referans varsa ayarlanmış dB hesapla */
    const adjDb = refDb !== null ? Math.max(0, rawDb - refDb) : 0;
    smoothDb = 0.85 * smoothDb + 0.15 * adjDb; // EMA α=0.15

    const norm = Math.min(smoothDb / 30, 1); // 0-100 ölçeği
    const disp = Math.round(norm * 100);

    /* — UI — */
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
        analyser.fftSize = 2048;

        ctx.createMediaStreamSource(stream).connect(analyser);

        /* 150 ms’de bir ölçüm */
        setInterval(render, 150);
    } catch (err) {
        valEl.textContent = "İzin reddedildi";
        statEl.textContent = "";
        console.error("Mic error:", err);
    }
}
window.addEventListener("load", init);