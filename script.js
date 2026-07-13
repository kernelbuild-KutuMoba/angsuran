// ================= CONFIGURASI REPO GITHUB =================
const CONFIG_GITHUB = {
    username: "kernelbuild-KutuMoba",  // TULIS USERNAME GITHUB ANDA DI SINI
    repo: "angsuran",      // TULIS NAMA REPOSITORI ANDA DI SINI
    path: "data.json",
    token: ""                          // BIARKAN KOSONG, Token diisi lewat form admin.html
};
// ==========================================================

let dataOrganisasi = [];
let fileSha = "";

// Fungsi memuat data awal
async function muatDataAwal(isAdmin = false) {
    const bAdmin = document.getElementById('body-admin');
    
    // Jika diakses oleh Halaman Anggota Biasa (Membaca file secara normal tanpa token)
    if (!isAdmin && !bAdmin) {
        try {
            // Membaca file data.json biasa yang di-hosting gratis oleh GitHub Pages
            const respon = await fetch('data.json?v=' + Date.now()); // bypass cache browser
            if (!respon.ok) throw new Error();
            dataOrganisasi = await respon.json();
            muatDataTabel();
        } catch (e) {
            console.error("Gagal memuat database publik.");
        }
        return;
    }

    // Jika diakses oleh Halaman Admin (Menggunakan GitHub API dan Token untuk melacak SHA)
    const url = `https://github.com{CONFIG_GITHUB.username}/${CONFIG_GITHUB.repo}/contents/${CONFIG_GITHUB.path}`;
    try {
        const respon = await fetch(url, {
            headers: { "Authorization": `token ${CONFIG_GITHUB.token}` }
        });
        
        if (!respon.ok) throw new Error();
        
        const dataJson = await respon.json();
        fileSha = dataJson.sha; 
        
        // Dekode data dari base64 GitHub
        const teksKonten = decodeURIComponent(escape(atob(dataJson.content))); 
        dataOrganisasi = JSON.parse(teksKonten);
        
        // Sembunyikan gerbang login admin jika berhasil memuat data
        const gerbang = document.getElementById('gerbang-pin');
        const kontenUtama = document.getElementById('konten-admin-utama');
        if(gerbang) gerbang.classList.add('hidden');
        if(kontenUtama) kontenUtama.classList.remove('hidden');

        muatDataTabel();
    } catch (error) {
        alert("Gagal terhubung ke GitHub! Pastikan Token (ghp_...) benar dan masa berlakunya belum kedaluwarsa.");
    }
}

// Fungsi Otomatis Kirim Perubahan data ke GitHub data.json
async function simpanKeGitHub() {
    const url = `https://github.com{CONFIG_GITHUB.username}/${CONFIG_GITHUB.repo}/contents/${CONFIG_GITHUB.path}`;
    const kontenBaruTeks = JSON.stringify(dataOrganisasi, null, 2);
    const kontenBase64 = btoa(unescape(encodeURIComponent(kontenBaruTeks)));

    const bodyData = {
        message: "Update data.json otomatis via Halaman Admin",
        content: kontenBase64,
        sha: fileSha 
    };

    try {
        const respon = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `token ${CONFIG_GITHUB.token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(bodyData)
        });

        if (!respon.ok) throw new Error();
        const hasil = await respon.json();
        fileSha = hasil.content.sha; // Perbarui kode lacak versi file
        muatDataTabel();
    } catch (error) {
        alert("Gagal menyimpan perubahan ke server GitHub!");
    }
}

function formatRupiah(angka) {
    return 'Rp ' + Math.round(angka).toLocaleString('id-ID');
}

function gantiTab(tab) {
    ['simulasi', 'monitoring'].forEach(t => {
        const konten = document.getElementById(`konten-${t}`);
        const btn = document.getElementById(`tab-${t}`);
        if(konten && btn) {
            konten.classList.add('hidden');
            btn.className = "tab-btn";
        }
    });
    const kontenAktif = document.getElementById(`konten-${tab}`);
    const btnAktif = document.getElementById(`tab-${tab}`);
    if(kontenAktif && btnAktif) {
        kontenAktif.classList.remove('hidden');
        btnAktif.className = "tab-btn active";
    }
}

function hitungSimulasi() {
    const pinjaman = parseFloat(document.getElementById('simulasi-pinjaman').value);
    if (!pinjaman || pinjaman < 500000) return alert("Minimal Rp 500.000");

    const angsuran = pinjaman * 0.11;
    document.getElementById('hasil-simulasi').classList.remove('hidden');
    document.getElementById('tabel-simulasi-wrapper').classList.remove('hidden');
    document.getElementById('txt-angsuran').innerText = formatRupiah(angsuran);
    document.getElementById('txt-total').innerText = formatRupiah(angsuran * 12);

    const tbody = document.getElementById('body-simulasi');
    tbody.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
        tbody.insertAdjacentHTML('beforeend', `<tr><td class="text-center" style="padding:10px;">${i}</td><td style="padding:10px; font-weight:600;">${formatRupiah(angsuran)}</td></tr>`);
    }
}

function tambahAnggota() {
    const nama = document.getElementById('adm-nama').value;
    const pinjaman = parseFloat(document.getElementById('adm-pinjaman').value);
    if (!nama || pinjaman < 500000) return alert("Isi nama & pinjaman minimal Rp 500.000");

    dataOrganisasi.push({ id: Date.now(), nama, pinjaman, bulanKe: 0, status: "Lancar" });
    document.getElementById('adm-nama').value = '';
    document.getElementById('adm-pinjaman').value = '';
    
    simpanKeGitHub();
}

function updateData(id, bulan, status) {
    const index = dataOrganisasi.findIndex(item => item.id === id);
    if (index !== -1) {
        let bln = parseInt(bulan);
        let stat = status;
        if (bln >= 12) { bln = 12; stat = "Lunas"; }
        dataOrganisasi[index].bulanKe = bln;
        dataOrganisasi[index].status = stat;
        
        simpanKeGitHub();
    }
}

function hapusAnggota(id) {
    if (confirm("Hapus data pinjaman ini secara permanen dari server GitHub?")) {
        dataOrganisasi = dataOrganisasi.filter(item => item.id !== id);
        simpanKeGitHub();
    }
}

function muatDataTabel() {
    const bMonitoring = document.getElementById('body-monitoring');
    const bAdmin = document.getElementById('body-admin');

    if (bMonitoring) {
        bMonitoring.innerHTML = '';
        dataOrganisasi.forEach(item => {
            const angsuran = item.pinjaman * 0.11;
            const sisa = item.status === 'Lunas' ? 0 : (angsuran * (12 - item.bulanKe));
            bMonitoring.insertAdjacentHTML('beforeend', `
                <tr>
                    <td style="padding:14px 16px; font-weight:600;">${item.nama}</td>
                    <td style="padding:14px 16px;">${formatRupiah(item.pinjaman)}</td>
                    <td style="padding:14px 16px;">${formatRupiah(angsuran)}</td>
                    <td class="text-center" style="padding:14px 16px;">${item.bulanKe} / 12</td>
                    <td style="padding:14px 16px; font-weight:700;">${formatRupiah(sisa)}</td>
                    <td class="text-center" style="padding:14px 16px;"><span class="badge ${item.status === 'Lunas' ? 'badge-lunas' : item.status === 'Telat' ? 'badge-telat' : 'badge-lancar'}">${item.status}</span></td>
                </tr>
            `);
        });
    }

    if (bAdmin) {
        bAdmin.innerHTML = '';
        dataOrganisasi.forEach(item => {
            bAdmin.insertAdjacentHTML('beforeend', `
                <tr>
                    <td style="padding:14px 16px; font-weight:600;">${item.nama}</td>
                    <td style="padding:14px 16px; color:#94a3b8;">${formatRupiah(item.pinjaman)}</td>
                    <td class="text-center" style="padding:14px 16px;">
                        <input type="number" min="0" max="12" value="${item.bulanKe}" onchange="updateData(${item.id}, this.value, '${item.status}')" class="num-input"> / 12
                    </td>
                    <td style="padding:14px 16px;">
                        <select onchange="updateData(${item.id}, ${item.bulanKe}, this.value)">
                            <option value="Lancar" ${item.status === 'Lancar' ? 'selected' : ''}>Lancar</option>
                            <option value="Telat" ${item.status === 'Telat' ? 'selected' : ''}>Telat</option>
                            <option value="Lunas" ${item.status === 'Lunas' ? 'selected' : ''}>Lunas</option>
                        </select>
                    </td>
                    <td class="text-center" style="padding:14px 16px;">
                        <button onclick="hapusAnggota(${item.id})" class="btn-del">Hapus</button>
                    </td>
                </tr>
            `);
        });
    }
}
