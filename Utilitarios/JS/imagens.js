const SCRIPT_URL = APP_CONFIG.SCRIPT_URL;

async function carregarGaleria() {
    const gallery = document.getElementById('gallery');
    try {
        const response = await fetch(SCRIPT_URL + "?action=getImages");
        const res = await response.json();

        if (res.status === "success" && res.data.length > 0) {
            gallery.innerHTML = res.data.map(img => `
    <div class="image-card">
      <div class="image-container">
        <img src="${img.url}" onclick="verGrande('${img.url}')" onerror="this.src='https://via.placeholder.com/200?text=Erro+Link'">
      </div>
      <div class="image-info">
        <span title="${img.nome}">${img.nome}</span>
        <button class="btn-del" onclick="excluirImagem('${img.id}')"><i class="fas fa-trash-alt"></i></button>
      </div>
    </div>
  `).join('');
        } else {
            gallery.innerHTML = '<div class="loading">Nenhuma imagem encontrada.</div>';
        }
    } catch (e) {
        console.error("Erro detalhado:", e);
        gallery.innerHTML = '<div class="loading">Erro ao conectar com o Drive. Verifique o Console (F12).</div>';
    }
}
function verGrande(url) {
    document.getElementById('imgFull').src = url;
    document.getElementById('modalImg').style.display = 'flex';
}

async function excluirImagem(fileId) {
    if (!confirm("Deseja mover esta imagem para a lixeira do Drive?")) return;
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "deleteFile", fileId: fileId })
        });
        carregarGaleria();
    } catch (e) { alert("Erro ao excluir."); }
}

function confirmarTema() {
    localStorage.setItem('tema_escolhido_id', tempThemeId);
    toggleThemePanel();
    if (window.aplicarTemaAtual) aplicarTemaAtual();
}

window.onload = carregarGaleria;
