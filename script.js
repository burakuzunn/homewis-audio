const valEl = document.getElementById('value');
const statEl = document.getElementById('status');
const ptrEl = document.getElementById('pointer');
const container = document.getElementById('bar-container');

// 50 bar oluştur
for (let i = 0; i < 50; i++) {
    const bar = document.createElement('div');
    bar.classList.add('bar');
    if (i < 15) bar.classList.add('green');
    else if (i < 30) bar.classList.add('yellow');
    else if (i < 40) bar.classList.add('orange');
    else bar.classList.add('red');
    container.appendChild(bar);
}

let ctx, analyser;

function updateStatus(dB) {
    if (dB < 40) {
        statEl.textContent = 'Çok sessiz';
        statEl.style.color = 'var(--quiet)';
    } else if (dB < 70) {
        statEl.textContent = 'Orta';
        statEl.style.color = 'var(--mid)';
    } else {
        statEl.textContent = 'Yüksek';
        statEl.style.color = 'var(--loud)';
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

    const pct = dB / 100;
    ptrEl.style.left = `calc(${pct * 100}% - 1px)`;

    requestAnimationFrame(render);
}

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("🎤 Mikrofon erişimi ALINDI");

        ctx = new(window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        render();
    } catch (err) {
        console.error("❌ Mikrofon erişim hatası:", err);
        valEl.textContent = "İzin reddedildi";
        statEl.textContent = "Mikrofon engellendi";
        statEl.style.color = "red";
    }
}

window.addEventListener("load", init);