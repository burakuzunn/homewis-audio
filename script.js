const valEl = document.getElementById("value");
const statEl = document.getElementById("status");
const ptrEl = document.getElementById("pointer");
const container = document.getElementById("bar-container");

const barCount = 50;
const bars = [];

for (let i = 0; i < barCount; i++) {
    const bar = document.createElement("div");
    bar.classList.add("bar");

    if (i < 15) bar.classList.add("red");
    else if (i < 30) bar.classList.add("orange");
    else if (i < 40) bar.classList.add("yellow");
    else bar.classList.add("green");

    const centerIndex = barCount / 2;
    const dist = Math.abs(i + 0.5 - centerIndex);
    const ratio = dist / centerIndex;
    const minOp = 0.5;
    const maxOp = 1.0;
    const opacity = minOp + (maxOp - minOp) * ratio;
    bar.style.opacity = opacity.toFixed(2);

    container.appendChild(bar);
    bars.push(bar);
}

let ctx, analyser;

function updateStatus(dB) {
    if (dB < 40) {
        statEl.textContent = "Çok sessiz";
        statEl.style.color = "var(--quiet)";
    } else if (dB < 70) {
        statEl.textContent = "Orta";
        statEl.style.color = "var(--mid)";
    } else {
        statEl.textContent = "Yüksek";
        statEl.style.color = "var(--loud)";
    }
}

function render() {
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);

    let sum = 0;
    for (const v of data) {
        const x = (v - 128) / 128;
        sum += x * x;
    }

    const rms = Math.sqrt(sum / data.length);
    let dB = Math.round(20 * Math.log10(rms) + 100);
    dB = isFinite(dB) ? Math.min(Math.max(dB, 0), 100) : 0;

    valEl.innerHTML = `${dB} <span>dB</span>`;
    updateStatus(dB);

    // Pointer çizgisi yukarıdan aşağıya hareket eder
    const pct = dB / 100;
    ptrEl.style.top = `${(1 - pct) * 100}%`;

    const activeCount = Math.round(pct * barCount);

    bars.forEach((bar, i) => {
        bar.style.opacity = i < activeCount ? "1" : "0.2";
    });
}

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new(window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 1024; // CPU yükünü azalt

        const src = ctx.createMediaStreamSource(stream);
        src.connect(analyser);

        // render() fonksiyonunu daha az yoğun çalıştır:
        setInterval(render, 100); // 10 FPS (optimum performans)
    } catch (err) {
        valEl.textContent = "İzin reddedildi";
        statEl.textContent = "";
        console.error("Mikrofon hatası:", err);
    }
}

window.addEventListener("load", init);