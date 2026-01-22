function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    img.src = src;
    lb.style.display = 'flex';
    setTimeout(() => img.style.transform = 'scale(1)', 10);
}

function closeLightbox() {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    img.style.transform = 'scale(0.9)';
    setTimeout(() => lb.style.display = 'none', 200);
}

function confirmingTema() {
    if (typeof confirmarTema === 'function') confirmarTema();
}
function confirmarTema() {
    localStorage.setItem('tema_escolhido_id', tempThemeId);
    toggleThemePanel();
    if (window.aplicarTemaAtual) aplicarTemaAtual();
}
