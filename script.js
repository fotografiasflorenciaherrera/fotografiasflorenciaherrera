// ========================================================
// CONFIGURACIÓN CENTRAL (cambiar datos SOLO acá)
// ========================================================

// Número de WhatsApp de Florencia (formato internacional, sin + ni espacios)
const telefonoWhatsApp = "5493865260159";

// URL del Webhook de Make.com (mientras diga TU_WEBHOOK_AQUI, el formulario se envía por WhatsApp)
const urlWebhook = "https://hook.us1.make.com/TU_WEBHOOK_AQUI";

let albumes = [];

// ========================================================
// UTILIDADES
// ========================================================

// Arma el enlace de WhatsApp
function crearUrlWhatsApp(mensaje = "") {
    const base = `https://api.whatsapp.com/send?phone=${telefonoWhatsApp}`;
    return mensaje ? `${base}&text=${encodeURIComponent(mensaje)}` : base;
}

// Evita que un texto del CMS con comillas o etiquetas rompa la página
function escaparHTML(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function irALaGaleria() {
    const seccion = document.getElementById("galeria-seccion");
    if (seccion) seccion.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ========================================================
// CARGA DE DATOS DESDE EL CMS (Sobre Mí + Galería)
// ========================================================

// Carga dinámicamente la sección "Sobre Mí" manteniendo el diseño y tipografías
async function cargarSobreMi() {
    const imgElement = document.querySelector(".sobre-mi-imagen img");
    const textoContainer = document.querySelector(".sobre-mi-texto");

    try {
        const respuesta = await fetch("sobre_mi.json", { cache: "no-cache" });
        if (!respuesta.ok) return;

        const datos = await respuesta.json();

        // Actualiza la foto de perfil si existe en el JSON
        if (datos.foto && imgElement) {
            imgElement.src = datos.foto;
        }

        // Reconstruye el texto conservando la jerarquía CSS original
        if (textoContainer) {
            let parrafosHTML = "";
            if (datos.biografia) {
                parrafosHTML = datos.biografia
                    .split("\n\n")
                    .filter(p => p.trim() !== "")
                    .map(p => `<p>${escaparHTML(p)}</p>`)
                    .join("");
            }

            textoContainer.innerHTML = `
                <span class="etiqueta-destacada">Sobre Mí</span>
                ${datos.saludo ? `<p class="saludo"><strong>${escaparHTML(datos.saludo)}</strong></p>` : ""}
                ${parrafosHTML}
                ${datos.frase_cierre ? `<p class="frase-cierre">${escaparHTML(datos.frase_cierre)}</p>` : ""}
            `;
        }
    } catch (error) {
        console.log("Cargando contenido por defecto de 'Sobre Mí':", error);
    }
}

async function cargarDatosDesdeCMS() {
    const contenedorFotos = document.getElementById("contenedor-galeria");
    try {
        const respuesta = await fetch("albumes.json", { cache: "no-cache" });

        if (!respuesta.ok) {
            throw new Error("No se encontró el archivo albumes.json");
        }

        const datos = await respuesta.json();
        albumes = datos.albumes || [];
        cargarVistaInicial();
    } catch (error) {
        console.error("Aún no hay álbumes cargados o hubo un error:", error);
        if (contenedorFotos) {
            contenedorFotos.innerHTML = `<p class="mensaje-galeria">Pronto vas a poder ver la galería acá.</p>`;
        }
    }
}

// ========================================================
// MOTOR LÓGICO DE LA GALERÍA INTERACTIVA
// ========================================================

function cargarVistaInicial() {
    const contenedorFiltros = document.getElementById("filtros-albumes");
    const contenedorFotos = document.getElementById("contenedor-galeria");

    if (!contenedorFiltros || !contenedorFotos) return;

    contenedorFiltros.innerHTML = "";
    contenedorFotos.innerHTML = "";

    if (albumes.length === 0) {
        contenedorFotos.innerHTML = `<p class="mensaje-galeria">Aún no hay álbumes cargados.</p>`;
        return;
    }

    albumes.forEach(album => {
        const tarjetaCarpeta = document.createElement("div");
        tarjetaCarpeta.classList.add("foto-tarjeta", "clicable");
        tarjetaCarpeta.setAttribute("role", "button");
        tarjetaCarpeta.setAttribute("tabindex", "0");
        tarjetaCarpeta.setAttribute("aria-label", `Ver álbum ${album.tituloAlbum}`);

        tarjetaCarpeta.innerHTML = `
            <img src="${escaparHTML(album.imagenPortada)}" alt="${escaparHTML(album.tituloAlbum)}" loading="lazy">
            <div class="foto-info">
                <h3>📁 ${escaparHTML(album.tituloAlbum)}</h3>
                <p class="album-descripcion">${escaparHTML(album.descripcion)}</p>
                <span class="precio">${escaparHTML(album.precioGeneral)} c/u</span>
                <span class="btn-comprar btn-block">Ver Álbum Completo</span>
            </div>
        `;

        const abrir = () => mostrarAlbumPorDentro(album);
        tarjetaCarpeta.addEventListener("click", abrir);
        tarjetaCarpeta.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                abrir();
            }
        });

        contenedorFotos.appendChild(tarjetaCarpeta);
    });
}

function mostrarAlbumPorDentro(album) {
    const contenedorFiltros = document.getElementById("filtros-albumes");
    const contenedorFotos = document.getElementById("contenedor-galeria");

    if (!contenedorFiltros || !contenedorFotos) return;

    contenedorFiltros.innerHTML = `
        <button type="button" class="btn-album activo" id="btn-volver">← Volver a las Carpetas</button>
        <h2 class="titulo-album">${escaparHTML(album.tituloAlbum)}</h2>
        <p class="subtitulo-album">Mostrando todas las muestras de calidad disponibles.</p>
    `;

    document.getElementById("btn-volver").addEventListener("click", () => {
        cargarVistaInicial();
        irALaGaleria();
    });

    contenedorFotos.innerHTML = "";

    if (album.fotos && album.fotos.length > 0) {
        album.fotos.forEach(foto => {
            const tarjetaFoto = document.createElement("div");
            tarjetaFoto.classList.add("foto-tarjeta");

            const mensajeWhatsApp = `Hola Florencia! Vi tu catálogo web y me interesa adquirir la fotografía "${foto.title}" de la categoría ${album.tituloAlbum} (Valor: ${album.precioGeneral}).`;
            const urlWhatsAppReal = crearUrlWhatsApp(mensajeWhatsApp);

            tarjetaFoto.innerHTML = `
                <img src="${escaparHTML(foto.imagenUrl)}" alt="${escaparHTML(foto.title)}" loading="lazy">
                <div class="foto-info">
                    <h3>${escaparHTML(foto.title)}</h3>
                    <span class="precio">${escaparHTML(album.precioGeneral)}</span>
                    <a href="${urlWhatsAppReal}" target="_blank" rel="noopener noreferrer" class="btn-comprar">Encargar Foto</a>
                </div>
            `;

            contenedorFotos.appendChild(tarjetaFoto);
        });
    } else {
        contenedorFotos.innerHTML = `<p class="mensaje-galeria">Este álbum aún no tiene fotos cargadas.</p>`;
    }

    irALaGaleria();
}

// ========================================================
// PROTECCIÓN DE IMÁGENES
// ========================================================

document.addEventListener("contextmenu", function (e) {
    if (e.target.tagName === "IMG" || e.target.closest(".foto-tarjeta")) {
        e.preventDefault();
    }
});

document.addEventListener("dragstart", function (e) {
    if (e.target.tagName === "IMG") {
        e.preventDefault();
    }
});

// ========================================================
// INICIALIZACIÓN
// ========================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Botón flotante de WhatsApp
    const btnWhatsApp = document.getElementById("btn-whatsapp");
    if (btnWhatsApp) {
        btnWhatsApp.href = crearUrlWhatsApp("Hola Florencia! Vi tu página web y quisiera hacerte una consulta.");
    }

    // 2. Netlify Identity: al iniciar sesión va al panel
    if (window.netlifyIdentity) {
        window.netlifyIdentity.on("init", user => {
            if (!user) {
                window.netlifyIdentity.on("login", () => {
                    document.location.href = "/admin/";
                });
            }
        });
    }

    // 3. Carga los datos del CMS
    cargarSobreMi();
    cargarDatosDesdeCMS();

    // 4. Formulario de servicios especiales
    configurarFormulario();
});

// ========================================================
// ENVÍO DEL FORMULARIO
// ========================================================

function configurarFormulario() {
    const formEspecial = document.getElementById("form-servicio-especial");
    if (!formEspecial) return;

    formEspecial.addEventListener("submit", async (e) => {
        e.preventDefault();

        const datosPedido = {
            nombre: document.getElementById("nombre-cliente")?.value.trim() || "",
            telefono: document.getElementById("telefono-cliente")?.value.trim() || "",
            descripcion: document.getElementById("descripcion-evento")?.value.trim() || "",
            expectativas: document.getElementById("expectativas-servicio")?.value.trim() || "",
            fechaEnvio: new Date().toLocaleString("es-AR")
        };

        if (urlWebhook.includes("TU_WEBHOOK_AQUI")) {
            const mensaje =
                `Hola Florencia! Quiero solicitar un presupuesto de servicio especial.\n\n` +
                `Nombre: ${datosPedido.nombre}\n` +
                `Teléfono: ${datosPedido.telefono}\n` +
                `Evento: ${datosPedido.descripcion}\n` +
                `Expectativas: ${datosPedido.expectativas}`;
            window.open(crearUrlWhatsApp(mensaje), "_blank", "noopener,noreferrer");
            return;
        }

        const btnSubmit = document.getElementById("btn-enviar-presupuesto");
        if (!btnSubmit) return;

        const textoOriginalBtn = btnSubmit.innerText;
        btnSubmit.innerText = "Enviando solicitud...";
        btnSubmit.disabled = true;

        try {
            const respuesta = await fetch(urlWebhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datosPedido)
            });

            if (respuesta.ok) {
                alert("¡Solicitud enviada con éxito! Florencia se pondrá en contacto a la brevedad.");
                formEspecial.reset();
            } else {
                alert("Hubo un detalle al enviar. Intentalo nuevamente.");
            }
        } catch (error) {
            console.error("Error al enviar el pedido:", error);
            alert("Ocurrió un error de conexión. Por favor, verificá tu internet.");
        } finally {
            btnSubmit.innerText = textoOriginalBtn;
            btnSubmit.disabled = false;
        }
    });
}
