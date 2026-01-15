/**
 * PERMISSIONS CONFIGURATION
 * Define as permissões para cada perfil de usuário.
 */
const PERMISSIONS = {
    // Perfis definidos no Login.html
    ROLES: {
        ADMIN: "Admin",
        SUPERADMIN: "SuperAdmin",
        ADVANCED: "Advanced",
        USER: "User"
    },

    // Páginas ou IDs de menu que cada perfil pode acessar
    // Se não estiver na lista, o acesso é negado (ou o item é escondido)
    ACCESS_CONTROL: {
        "SuperAdmin": {
            allowedMenus: ["menuEscalas", "menuMusicas", "menuEquipe", "menuAcessoMesa", "menuMontarRepertorio"],
            allowedPages: ["Cadastro de Musicas.html", "Cadastro de Repertorio.html", "AcessoMesa.html", "Historico de Musicas.html"]
        },
        "Admin": {
            allowedMenus: ["menuEscalas", "menuMusicas", "menuEquipe", "menuAcessoMesa", "menuMontarRepertorio"],
            allowedPages: ["Cadastro de Musicas.html", "Cadastro de Repertorio.html", "AcessoMesa.html", "Historico de Musicas.html"]
        },
        "Advanced": {
            allowedMenus: ["menuEscalas", "menuMusicas", "menuEquipe", "menuAcessoMesa", "menuMontarRepertorio"],
            allowedPages: ["Cadastro de Musicas.html", "Cadastro de Repertorio.html", "AcessoMesa.html", "Historico de Musicas.html"]
        },
        "User": {
            allowedMenus: ["menuEscalas", "menuMusicas", "menuEquipe", "menuMontarRepertorio"], // Apenas Acesso a Mesa oculto
            allowedPages: ["Cadastro de Musicas.html", "Cadastro de Repertorio.html", "Historico de Musicas.html"]
        }
    }
};

/**
 * Verifica se o usuário logado tem permissão para ver um elemento ou acessar uma página.
 * @param {string} role Perfil do usuário
 * @param {string} item ID do menu ou nome da página
 * @param {string} type "menu" ou "page"
 * @returns {boolean}
 */
function hasPermission(role, item, type = "menu") {
    const config = PERMISSIONS.ACCESS_CONTROL[role] || PERMISSIONS.ACCESS_CONTROL["User"];
    if (type === "menu") {
        return config.allowedMenus.includes(item);
    } else {
        return config.allowedPages.includes(item);
    }
}
