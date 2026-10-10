const API_URL = "http://127.0.0.1:8000";
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- SISTEMA DE AUDIO ---
// (los nombres coinciden exactamente con los archivos de assets/sound)
const audioRutas = {
    disparo: "assets/sound/shoot.WAV",
    explosion: "assets/sound/explosion.WAV",
    powerup: "assets/sound/powerup.WAV",
    gameOver: "assets/sound/game_over.WAV",
    musica: "assets/sound/music.wav"
};

// Configuración de música de fondo en bucle
const musicaFondo = new Audio(audioRutas.musica);
musicaFondo.loop = true;
musicaFondo.volume = 0.2; // Volumen ajustado al 20% para no opacar los SFX

function reproducirMusica() {
    musicaFondo.currentTime = 0;
    musicaFondo.play().catch(() => {});
}

function detenerMusica() {
    musicaFondo.pause();
    musicaFondo.currentTime = 0;
}

function reproducirSonido(clave, volumen = 0.5) {
    if (!audioRutas[clave]) return;
    const sfx = new Audio(audioRutas[clave]);
    sfx.volume = volumen;
    sfx.play().catch(() => {});
}

// --- PRECARGA DE SPRITES PNG ---
const sprites = {
    jugador: new Image(),
    basico: new Image(),
    rapido: new Image(),
    blindado: new Image()
};

function cargarImagenes() {
    const fuentes = {
        jugador: "assets/jugador.png",
        basico: "assets/enemigo_basico.png",
        rapido: "assets/enemigo_rapido.png",
        blindado: "assets/enemigo_blindado.png"
    };

    const promesas = Object.keys(fuentes).map(key => {
        return new Promise((resolve) => {
            sprites[key].src = fuentes[key];
            sprites[key].onload = () => resolve(true);
            sprites[key].onerror = () => {
                console.error(`Error al cargar la imagen: ${fuentes[key]}`);
                resolve(false);
            };
        });
    });

    return Promise.all(promesas);
}

// ===========================================================================
//  CONFIGURACIÓN DE MODOS, DIFICULTAD Y ESCENARIOS
// ===========================================================================

// "campana" = niveles con escenarios distintos (los carga el backend)
// "oleadas" = sin base, oleadas infinitas, gana quien consiga más puntos
let modoJuego = "campana";

// La dificultad seleccionada en el menú ahora afecta de verdad a la partida
const DIFICULTADES = {
    bajo:  { cantidad: 0.75, velocidad: 0.9, extraSimultaneos: -1 },
    medio: { cantidad: 1,    velocidad: 1,   extraSimultaneos: 0 },
    alta:  { cantidad: 1.3,  velocidad: 1.1, extraSimultaneos: 1 }
};

const PUNTOS_ENEMIGO = { basico: 100, rapido: 150, blindado: 200 };

// Temas visuales (suelo del escenario)
const TEMAS = {
    pradera:  { nombre: "PRADERA",  suelo: "#2f5d1f", motas: ["#3b7326", "#274d19"], estilo: "puntos" },
    bosque:   { nombre: "BOSQUE",   suelo: "#14301a", motas: ["#1d4a26", "#0d2212"], estilo: "puntos" },
    rio:      { nombre: "RIO",      suelo: "#4a5a3c", motas: ["#5a6b49", "#3b4a2f"], estilo: "puntos" },
    tundra:   { nombre: "TUNDRA",   suelo: "#c4d6e0", motas: ["#ffffff", "#a9c1cf"], estilo: "nieve" },
    desierto: { nombre: "DESIERTO", suelo: "#c9a45c", motas: ["#dbbb78", "#b08a45"], estilo: "dunas" },
    arena:    { nombre: "ARENA",    suelo: "#1d1d26", motas: ["#2b2b38", "#34344a"], estilo: "cuadricula" }
};
// Si el backend no enviara el tema, se usa este orden según el número de nivel
const TEMAS_NIVEL_DEFECTO = ["pradera", "bosque", "rio", "tundra", "desierto"];

// Tipos de casilla: 0 vacío | 1 ladrillo | 2 acero | 3 bosque | 4 base | 5 agua | 6 hielo
// Arenas del modo OLEADAS (no tienen base). Cambian cada 3 oleadas.
const ARENAS_OLEADAS = [
    {
        nombre: "ARENA", tema: "arena", mapa: [
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,1,1,0,2,0,0,0,2,0,1,1,0],
            [0,1,1,0,0,0,0,0,0,0,1,1,0],
            [0,0,0,0,1,1,0,1,1,0,0,0,0],
            [2,0,1,0,0,0,0,0,0,0,1,0,2],
            [0,0,1,0,3,3,0,3,3,0,1,0,0],
            [0,0,0,0,3,3,2,3,3,0,0,0,0],
            [0,0,1,0,3,3,0,3,3,0,1,0,0],
            [2,0,1,0,0,0,0,0,0,0,1,0,2],
            [0,0,0,0,1,1,0,1,1,0,0,0,0],
            [0,1,1,0,0,0,0,0,0,0,1,1,0],
            [0,1,1,0,2,0,0,0,2,0,1,1,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0]
        ]
    },
    {
        nombre: "FORTIN DE ACERO", tema: "desierto", mapa: [
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,2,2,0,1,1,0,1,1,0,2,2,0],
            [0,2,0,0,0,0,0,0,0,0,0,2,0],
            [0,0,0,1,0,2,2,2,0,1,0,0,0],
            [1,0,0,1,0,0,0,0,0,1,0,0,1],
            [1,0,0,0,0,1,0,1,0,0,0,0,1],
            [0,0,2,0,0,1,0,1,0,0,2,0,0],
            [1,0,0,0,0,1,0,1,0,0,0,0,1],
            [1,0,0,1,0,0,0,0,0,1,0,0,1],
            [0,0,0,1,0,2,2,2,0,1,0,0,0],
            [0,2,0,0,0,0,0,0,0,0,0,2,0],
            [0,2,2,0,1,1,0,1,1,0,2,2,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0]
        ]
    },
    {
        nombre: "PANTANO", tema: "rio", mapa: [
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,3,3,0,0,5,5,5,0,0,3,3,0],
            [0,3,3,0,0,5,5,5,0,0,3,3,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [5,5,0,1,0,0,0,0,0,1,0,5,5],
            [5,5,0,1,0,2,0,2,0,1,0,5,5],
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [5,5,0,1,0,2,0,2,0,1,0,5,5],
            [5,5,0,1,0,0,0,0,0,1,0,5,5],
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,3,3,0,0,5,5,5,0,0,3,3,0],
            [0,3,3,0,0,5,5,5,0,0,3,3,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0]
        ]
    }
];

// Puntos de aparición de enemigos (arriba) y del jugador
const SPAWNS_ENEMIGOS = [{ x: 2, y: 2 }, { x: 242, y: 2 }, { x: 482, y: 2 }];
const SPAWN_JUGADOR_CAMPANA = { x: 162, y: 482 }; // junto a la base
const SPAWN_JUGADOR_OLEADAS = { x: 242, y: 482 }; // centro inferior

// ===========================================================================
//  ESTADO GENERAL
// ===========================================================================
let jugadorId = null;
let nombreJugador = "";
let juegoActivo = false;
let animacionFrameId;
let vidas = 3;

// "jugando" | "transicion" (pausa entre niveles/oleadas) | "cargando" (esperando al servidor)
let fase = "jugando";
let faseFrames = 0;

let dificultadSeleccionada = "medio";
let dificultadActual = DIFICULTADES.medio;

// En campaña es el nº de nivel; en oleadas es el nº de oleada
let nivelActual = 1;
let totalNiveles = 5;
let nombreEscenario = "";

let maxEnemigos = 3;
let probSpawn = 0.01;
let objetivoNivel = 10;          // enemigos a destruir para superar el nivel/oleada
let generadosNivel = 0;          // enemigos ya aparecidos en este nivel/oleada
let enemigosEliminadosNivel = 0;
let pesosEnemigos = { basico: 100, rapido: 0, blindado: 0 };
let spawnJugador = SPAWN_JUGADOR_CAMPANA;
let perdioVidaNivel = false;

// Combos (solo modo oleadas): destruir enemigos seguidos multiplica los puntos
let combo = 0;
let comboFrames = 0;
let mejorCombo = 0;

// --- VARIABLES DE JUICINESS / DOPA-EFFECTS ---
let particulas = [];
let textosFlotantes = [];
let shakeTime = 0;
let shakeIntensity = 0;

function activarShake(duracion, intensidad) {
    shakeTime = duracion;
    shakeIntensity = intensidad;
}

class Particula {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        let angulo = Math.random() * Math.PI * 2;
        let vel = Math.random() * 4 + 1;
        this.vx = Math.cos(angulo) * vel;
        this.vy = Math.sin(angulo) * vel;
        this.size = Math.random() * 5 + 3;
        this.color = color;
        this.vida = 20 + Math.random() * 15;
        this.maxVida = this.vida;
    }
    actualizar() {
        this.x += this.vx;
        this.y += this.vy;
        this.size *= 0.93;
        this.vida--;
    }
    dibujar() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.vida / this.maxVida);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class TextoFlotante {
    constructor(x, y, texto, color = "#f1c40f") {
        this.x = x;
        this.y = y;
        this.texto = texto;
        this.color = color;
        this.vida = 45;
        this.maxVida = 45;
        this.vy = -1.2;
    }
    actualizar() {
        this.y += this.vy;
        this.vida--;
    }
    dibujar() {
        ctx.save();
        let alpha = Math.max(0, this.vida / this.maxVida);
        ctx.globalAlpha = alpha;
        ctx.font = "900 18px Arial, sans-serif";
        ctx.fillStyle = this.color;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.strokeText(this.texto, this.x, this.y);
        ctx.fillText(this.texto, this.x, this.y);
        ctx.restore();
    }
}

function crearExplosion(x, y, color, cantidad = 15) {
    for (let i = 0; i < cantidad; i++) {
        particulas.push(new Particula(x, y, color));
    }
}

function crearTextoFlotante(x, y, texto, color) {
    textosFlotantes.push(new TextoFlotante(x, y, texto, color));
}

// --- BANNER CENTRAL (anuncios de nivel / oleada) ---
let banner = { titulo: "", sub: "", extra: "", color: "#f1c40f", frames: 0, max: 1 };

function mostrarBanner(titulo, sub = "", extra = "", frames = 150, color = "#f1c40f") {
    banner = { titulo, sub, extra, color, frames, max: frames };
}

function dibujarBanner() {
    if (banner.frames <= 0) return;
    const entrada = Math.min(1, (banner.max - banner.frames + 1) / 12);
    const salida = Math.min(1, banner.frames / 20);
    ctx.save();
    ctx.globalAlpha = Math.min(entrada, salida);
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 200, canvas.width, 120);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "20px 'Press Start 2P', monospace";
    ctx.fillStyle = banner.color;
    ctx.fillText(banner.titulo, canvas.width / 2, 235);
    if (banner.sub) {
        ctx.font = "12px 'Press Start 2P', monospace";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(banner.sub, canvas.width / 2, 268);
    }
    if (banner.extra) {
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.fillStyle = "#2ecc71";
        ctx.fillText(banner.extra, canvas.width / 2, 296);
    }
    ctx.restore();
}

function dibujarComboHUD() {
    if (modoJuego !== "oleadas" || combo < 2) return;
    const mult = multiplicadorCombo();
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "12px 'Press Start 2P', monospace";
    ctx.fillStyle = mult > 1 ? "#e67e22" : "#ecf0f1";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    const txt = `COMBO ${combo}  x${mult}`;
    ctx.strokeText(txt, 10, 10);
    ctx.fillText(txt, 10, 10);
    // barra de tiempo restante del combo
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(10, 28, Math.max(0, (comboFrames / 180)) * 120, 4);
    ctx.restore();
}

// --- GESTOR DE PUNTUACIÓN ---
class GestorPuntuacion {
    constructor() { this.puntos = 0; this.suscriptores = []; }
    suscribir(fn) { this.suscriptores.push(fn); }
    sumarPuntos(cant) { this.puntos += cant; this.suscriptores.forEach(fn => fn(this.puntos)); }
}
const scoreObserver = new GestorPuntuacion();
scoreObserver.suscribir((pts) => {
    const scoreElem = document.getElementById("score");
    if (scoreElem) scoreElem.innerText = pts;
});

// --- HUD (panel lateral) ---
function setTexto(id, valor) {
    const el = document.getElementById(id);
    if (el) el.innerText = valor;
}

function actualizarHUD() {
    setTexto("livesValue", vidas);
    if (modoJuego === "oleadas") {
        setTexto("modeLabel", "OLEADAS");
        setTexto("levelLabel", "OLEADA");
        setTexto("levelValue", nivelActual);
    } else {
        setTexto("modeLabel", "CAMPAÑA");
        setTexto("levelLabel", "NIVEL");
        setTexto("levelValue", `${nivelActual} / ${totalNiveles}`);
    }
    setTexto("sceneValue", nombreEscenario || "-");
    setTexto("enemiesValue", `${enemigosEliminadosNivel} / ${objetivoNivel}`);
}

// ===========================================================================
//  MAPA Y ESCENARIOS
// ===========================================================================
const T = 40;
let mapa = [];          // Se llena desde la API (campaña) o desde ARENAS_OLEADAS
let temaActual = TEMAS.pradera;
let fondoActual = null; // Canvas "offscreen" con el suelo del escenario ya dibujado
const fondosCache = {};

// Generador pseudo-aleatorio con semilla: el fondo siempre se ve igual para un mismo tema
function crearRng(semilla) {
    let a = semilla >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function crearFondo(claveTema) {
    if (fondosCache[claveTema]) return fondosCache[claveTema];

    const tema = TEMAS[claveTema] || TEMAS.pradera;
    const off = document.createElement("canvas");
    off.width = canvas.width;
    off.height = canvas.height;
    const c = off.getContext("2d");
    const rnd = crearRng(claveTema.length * 7919 + claveTema.charCodeAt(0));

    c.fillStyle = tema.suelo;
    c.fillRect(0, 0, off.width, off.height);

    if (tema.estilo === "puntos") {
        for (let i = 0; i < 320; i++) {
            c.fillStyle = tema.motas[Math.floor(rnd() * tema.motas.length)];
            const s = 2 + Math.floor(rnd() * 3);
            c.fillRect(rnd() * off.width, rnd() * off.height, s, s);
        }
    } else if (tema.estilo === "nieve") {
        for (let i = 0; i < 90; i++) {
            c.fillStyle = tema.motas[1];
            c.beginPath();
            c.arc(rnd() * off.width, rnd() * off.height, 6 + rnd() * 14, 0, Math.PI * 2);
            c.globalAlpha = 0.18;
            c.fill();
        }
        c.globalAlpha = 1;
        for (let i = 0; i < 220; i++) {
            c.fillStyle = tema.motas[0];
            const s = 1 + Math.floor(rnd() * 3);
            c.fillRect(rnd() * off.width, rnd() * off.height, s, s);
        }
    } else if (tema.estilo === "dunas") {
        c.lineWidth = 2;
        for (let i = 0; i < 55; i++) {
            c.strokeStyle = tema.motas[i % 2];
            const x = rnd() * off.width, y = rnd() * off.height, r = 10 + rnd() * 22;
            c.beginPath();
            c.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.9);
            c.stroke();
        }
    } else if (tema.estilo === "cuadricula") {
        c.strokeStyle = tema.motas[0];
        c.lineWidth = 1;
        for (let p = 0; p <= off.width; p += T) {
            c.beginPath(); c.moveTo(p + 0.5, 0); c.lineTo(p + 0.5, off.height); c.stroke();
            c.beginPath(); c.moveTo(0, p + 0.5); c.lineTo(off.width, p + 0.5); c.stroke();
        }
        for (let i = 0; i < 60; i++) {
            c.fillStyle = tema.motas[1];
            c.fillRect(rnd() * off.width, rnd() * off.height, 2, 2);
        }
    }

    fondosCache[claveTema] = off;
    return off;
}

function aplicarTema(clave) {
    const k = TEMAS[clave] ? clave : "pradera";
    temaActual = TEMAS[k];
    fondoActual = crearFondo(k);
}

function dibujarLadrillo(x, y) {
    ctx.fillStyle = "#5c2c16";
    ctx.fillRect(x, y, T, T);

    const filas = 4;
    const altoLadrillo = T / filas;
    const anchoLadrillo = T / 2;

    for (let i = 0; i < filas; i++) {
        let ly = y + i * altoLadrillo;
        let desfasado = (i % 2 === 1) ? anchoLadrillo / 2 : 0;

        for (let j = -1; j < 3; j++) {
            let lx = x + j * anchoLadrillo + desfasado;

            if (lx + anchoLadrillo > x && lx < x + T) {
                let drawX = Math.max(lx, x);
                let drawW = Math.min(lx + anchoLadrillo, x + T) - drawX;

                ctx.fillStyle = "#b84218";
                ctx.fillRect(drawX + 1, ly + 1, drawW - 1, altoLadrillo - 1);
                ctx.fillStyle = "#d96236";
                ctx.fillRect(drawX + 1, ly + 1, drawW - 1, 1);
                ctx.fillRect(drawX + 1, ly + 1, 1, altoLadrillo - 1);
                ctx.fillStyle = "#7a270a";
                ctx.fillRect(drawX + 1, ly + altoLadrillo - 1, drawW - 1, 1);
            }
        }
    }
}

function dibujarAcero(x, y) {
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(x, y, T, T);

    let grad = ctx.createLinearGradient(x, y, x + T, y + T);
    grad.addColorStop(0, "#e0e6ed");
    grad.addColorStop(0.5, "#95a5a6");
    grad.addColorStop(1, "#7f8c8d");

    ctx.fillStyle = grad;
    ctx.fillRect(x + 2, y + 2, T - 4, T - 4);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3, y + 3, T - 6, T - 6);

    ctx.fillStyle = "#34495e";
    const remaches = [[x + 6, y + 6], [x + T - 6, y + 6], [x + 6, y + T - 6], [x + T - 6, y + T - 6]];
    remaches.forEach(([rx, ry]) => {
        ctx.beginPath();
        ctx.arc(rx, ry, 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

function dibujarBase(x, y) {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x, y, T, T);
    ctx.strokeStyle = "#c0392b";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, T - 2, T - 2);

    let cx = x + T / 2;
    let cy = y + T / 2;

    ctx.fillStyle = "#f39c12";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx + 12, cy - 6);
    ctx.lineTo(cx + 10, cy + 10);
    ctx.lineTo(cx, cy + 15);
    ctx.lineTo(cx - 10, cy + 10);
    ctx.lineTo(cx - 12, cy - 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e67e22";
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 3, 0, Math.PI * 2);
    ctx.fill();
}

function dibujarAgua(x, y, c, f) {
    ctx.fillStyle = "#1c58a8";
    ctx.fillRect(x, y, T, T);
    ctx.fillStyle = "#2a74cc";
    ctx.fillRect(x + 1, y + 1, T - 2, T - 2);

    const t = Date.now() / 450;
    ctx.fillStyle = "rgba(255,255,255,0.30)";
    for (let i = 0; i < 3; i++) {
        const desp = Math.sin(t + c * 0.9 + f * 0.6 + i * 1.7) * 5;
        ctx.fillRect(x + 6 + desp + i * 4, y + 7 + i * 12, 16, 2);
        ctx.fillRect(x + 22 - desp, y + 13 + i * 12, 10, 2);
    }
}

function dibujarHielo(x, y) {
    let grad = ctx.createLinearGradient(x, y, x + T, y + T);
    grad.addColorStop(0, "#d4f0fc");
    grad.addColorStop(0.5, "#a3daf5");
    grad.addColorStop(1, "#7cc3ea");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, T, T);

    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + T - 8);  ctx.lineTo(x + 16, y + T - 20);
    ctx.moveTo(x + 20, y + T - 6); ctx.lineTo(x + 34, y + T - 24);
    ctx.stroke();

    ctx.strokeStyle = "rgba(50,130,185,0.55)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
}

function dibujarMapa() {
    if (!mapa || mapa.length === 0) return;

    for (let f = 0; f < 13; f++) {
        for (let c = 0; c < 13; c++) {
            if (!mapa[f] || mapa[f][c] === undefined) continue;

            const tipo = mapa[f][c];
            const x = c * T, y = f * T;

            if (tipo === 1) dibujarLadrillo(x, y);
            else if (tipo === 2) dibujarAcero(x, y);
            else if (tipo === 4) dibujarBase(x, y);
            else if (tipo === 5) dibujarAgua(x, y, c, f);
            else if (tipo === 6) dibujarHielo(x, y);
            // tipo 3 (bosque) se dibuja después, por encima de los tanques
        }
    }
}

// El bosque se dibuja ENCIMA de los tanques para que puedan esconderse
function dibujarBosque() {
    if (!mapa || mapa.length === 0) return;
    const colores = ["#1f7a2b", "#2e9c3c", "#145018"];

    ctx.save();
    ctx.globalAlpha = 0.92;
    for (let f = 0; f < 13; f++) {
        for (let c = 0; c < 13; c++) {
            if (!mapa[f] || mapa[f][c] !== 3) continue;
            const x = c * T, y = f * T;

            ctx.fillStyle = "#17591f";
            ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
            for (let i = 0; i < 8; i++) {
                const h = (c * 31 + f * 17 + i * 13) % 11;
                const px = x + 4 + ((c * 7 + f * 3 + i * 9) % 32);
                const py = y + 4 + ((c * 5 + f * 11 + i * 7) % 32);
                ctx.fillStyle = colores[(c + f + i) % 3];
                ctx.beginPath();
                ctx.arc(px, py, 6 + (h % 3), 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    ctx.restore();
}

// ===========================================================================
//  CLASES DEL JUEGO
// ===========================================================================
class PowerUp {
    constructor(x, y) {
        this.x = x; this.y = y;
        const tipos = ["bomba", "casco", "vida"];
        this.tipo = tipos[Math.floor(Math.random() * tipos.length)];
        this.activo = true;
    }

    dibujar() {
        if (!this.activo) return;
        let centerX = this.x + 18;
        let centerY = this.y + 18;

        ctx.save();
        let parpadeo = Math.floor(Date.now() / 200) % 2 === 0;
        ctx.fillStyle = parpadeo ? "#ecf0f1" : "#e74c3c";
        ctx.fillRect(this.x + 4, this.y + 4, 28, 28);

        ctx.strokeStyle = "#2c3e50";
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x + 4, this.y + 4, 28, 28);

        if (this.tipo === "bomba") {
            ctx.fillStyle = "#2c3e50";
            ctx.beginPath(); ctx.arc(centerX, centerY + 3, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#95a5a6";
            ctx.fillRect(centerX - 3, centerY - 7, 6, 4);
            ctx.fillStyle = parpadeo ? "#f1c40f" : "#e67e22";
            ctx.fillRect(centerX - 1, centerY - 10, 2, 3);

        } else if (this.tipo === "casco") {
            ctx.fillStyle = "#f1c40f";
            ctx.beginPath(); ctx.arc(centerX, centerY + 3, 9, Math.PI, 0); ctx.fill();
            ctx.fillRect(centerX - 12, centerY + 3, 24, 3);
            ctx.fillStyle = "#e67e22";
            ctx.fillRect(centerX - 2, centerY - 4, 4, 7);

        } else if (this.tipo === "vida") {
            ctx.fillStyle = "#2ecc71";
            ctx.fillRect(centerX - 5, centerY - 5, 10, 10);
            ctx.fillRect(centerX - 1, centerY - 10, 2, 5);
            ctx.fillStyle = "#27ae60";
            ctx.fillRect(centerX - 8, centerY - 6, 3, 12);
            ctx.fillRect(centerX + 5, centerY - 6, 3, 12);
        }
        ctx.restore();
    }
}

class Bala {
    constructor(x, y, dir, esEnemigo) {
        this.size = 6; this.x = x; this.y = y;
        this.dir = dir; this.vel = 5;
        this.esEnemigo = esEnemigo; this.activa = true;
    }

    actualizar() {
        if (this.dir === "UP") this.y -= this.vel;
        if (this.dir === "DOWN") this.y += this.vel;
        if (this.dir === "LEFT") this.x -= this.vel;
        if (this.dir === "RIGHT") this.x += this.vel;
        this.verificarColision();
    }

    dibujar() {
        ctx.fillStyle = this.esEnemigo ? "#ff4757" : "#eccc68";
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }

    verificarColision() {
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.activa = false; return;
        }

        let centroX = this.x + (this.size / 2);
        let centroY = this.y + (this.size / 2);
        let c = Math.floor(centroX / T);
        let f = Math.floor(centroY / T);

        // Las balas atraviesan agua (5), bosque (3) y hielo (6)
        if (mapa.length > 0 && c >= 0 && c < 13 && f >= 0 && f < 13) {
            if (mapa[f] && mapa[f][c] === 1) {
                if (!this.esEnemigo) { mapa[f][c] = 0; }
                this.activa = false;
                crearExplosion(centroX, centroY, "#d96236", 6);
            }
            else if (mapa[f] && mapa[f][c] === 2) {
                this.activa = false;
                crearExplosion(centroX, centroY, "#ecf0f1", 5);
            }
            else if (mapa[f] && mapa[f][c] === 4) {
                this.activa = false;
                crearExplosion(centroX, centroY, "#e74c3c", 25);
                activarShake(20, 10);
                reproducirSonido("explosion", 0.8);
                terminarJuego("derrota");
            }
        }
    }
}

const VECTORES = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };
const esVertical = (dir) => dir === "UP" || dir === "DOWN";

class Tanque {
    constructor(x, y, colorBase, tipoSprite = "jugador") {
        this.x = x; this.y = y; this.size = 36;
        this.colorOriginal = colorBase; this.color = colorBase;
        this.vel = 2.5; this.dir = "UP";
        this.balas = []; this.vivo = true; this.cooldown = 0;
        this.escudoHasta = 0;      // marca de tiempo (ms) hasta la que es invulnerable
        this.esEspecial = false;
        this.hp = 1;
        this.flash = 0;            // frames de destello al recibir un golpe sin morir
        this.deslizar = 0;         // frames restantes de deslizamiento sobre hielo
        this.dirDeslizar = "UP";
        this.tiempoIA = 0;
        this.tiempoDisparoIA = 0;

        this.tipoSprite = tipoSprite;
    }

    get invulnerable() { return this.escudoHasta > Date.now(); }

    dibujar() {
        if (!this.vivo) return;
        ctx.save();
        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);

        let angle = 0;
        if (this.dir === "RIGHT") angle = Math.PI / 2;
        if (this.dir === "DOWN") angle = Math.PI;
        if (this.dir === "LEFT") angle = -Math.PI / 2;
        ctx.rotate(angle);

        let img = sprites[this.tipoSprite] || sprites.jugador;

        if (img.complete && img.naturalWidth !== 0) {
            ctx.drawImage(img, -this.size / 2, -this.size / 2, this.size, this.size);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        }

        if (this.flash > 0) {
            ctx.fillStyle = "rgba(255,255,255,0.65)";
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        }

        ctx.restore();

        if (this.invulnerable) {
            ctx.save();
            ctx.strokeStyle = (Math.floor(Date.now() / 100) % 2 === 0) ? "#f1c40f" : "#3498db";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.size / 2, this.y + this.size / 2, 22, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    disparar(esEnemigo) {
        if (this.balas.length < 1 && this.vivo && this.cooldown <= 0) {
            let bx = this.x + 15, by = this.y + 15;
            this.balas.push(new Bala(bx, by, this.dir, esEnemigo));
            this.cooldown = 30;

            if (!esEnemigo) {
                reproducirSonido("disparo", 0.4);
            }
        }
    }

    actualizar() {
        if (this.cooldown > 0) this.cooldown--;
        if (this.flash > 0) this.flash--;
    }

    // Agua (5) bloquea a los tanques; bosque (3) y hielo (6) se pueden cruzar
    puedeMoverse(nx, ny) {
        if (nx < 0 || nx > canvas.width - this.size || ny < 0 || ny > canvas.height - this.size) return false;
        let esquinas = [
            { x: nx + 2, y: ny + 2 }, { x: nx + this.size - 2, y: ny + 2 },
            { x: nx + 2, y: ny + this.size - 2 }, { x: nx + this.size - 2, y: ny + this.size - 2 }
        ];
        return !esquinas.some(p => {
            let c = Math.floor(p.x / T); let f = Math.floor(p.y / T);
            if (f < 0 || f >= 13 || c < 0 || c >= 13) return true;
            if (mapa.length > 0 && mapa[f] !== undefined) {
                let t = mapa[f][c];
                return t === 1 || t === 2 || t === 4 || t === 5;
            }
            return false;
        });
    }

    puedeAvanzar(dir) {
        const [dx, dy] = VECTORES[dir];
        return this.puedeMoverse(this.x + dx * 6, this.y + dy * 6);
    }

    // Al girar de eje se "ajusta" a la cuadrícula de 20px (como el Battle City original),
    // así es mucho más fácil entrar en pasillos de una sola casilla.
    cambiarDireccion(nueva, asistir = false) {
        if (nueva === this.dir) return;
        if (asistir && esVertical(nueva) !== esVertical(this.dir)) {
            const paso = T / 2;
            if (esVertical(nueva)) {
                const nx = Math.round((this.x - 2) / paso) * paso + 2;
                if (this.puedeMoverse(nx, this.y)) this.x = nx;
            } else {
                const ny = Math.round((this.y - 2) / paso) * paso + 2;
                if (this.puedeMoverse(this.x, ny)) this.y = ny;
            }
        }
        this.dir = nueva;
    }
}

// ===========================================================================
//  IA ENEMIGA: búsqueda de camino (BFS) hacia el jugador
// ===========================================================================
function tileDe(obj) {
    return {
        c: Math.max(0, Math.min(12, Math.floor((obj.x + obj.size / 2) / T))),
        f: Math.max(0, Math.min(12, Math.floor((obj.y + obj.size / 2) / T)))
    };
}

// Casillas por las que puede pasar un tanque: vacío (0), bosque (3) e hielo (6)
function esTransitable(c, f) {
    if (!mapa[f]) return false;
    const t = mapa[f][c];
    return t === 0 || t === 3 || t === 6;
}

// Devuelve la primera dirección del camino más corto entre dos casillas (o null si no hay)
function siguientePasoBFS(origen, destino) {
    if (origen.c === destino.c && origen.f === destino.f) return null;

    const visitado = Array.from({ length: 13 }, () => Array(13).fill(false));
    const cola = [{ c: origen.c, f: origen.f, primera: null }];
    visitado[origen.f][origen.c] = true;
    const movs = [["UP", 0, -1], ["DOWN", 0, 1], ["LEFT", -1, 0], ["RIGHT", 1, 0]];

    for (let i = 0; i < cola.length; i++) {
        const n = cola[i];
        for (const [dir, dc, df] of movs) {
            const c = n.c + dc, f = n.f + df;
            if (c < 0 || c >= 13 || f < 0 || f >= 13 || visitado[f][c]) continue;
            if (!esTransitable(c, f)) continue;
            visitado[f][c] = true;
            const primera = n.primera || dir;
            if (c === destino.c && f === destino.f) return primera;
            cola.push({ c, f, primera });
        }
    }
    return null;
}

function direccionDirecta(e) {
    const dx = jugador.x - e.x, dy = jugador.y - e.y;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "RIGHT" : "LEFT";
    return dy > 0 ? "DOWN" : "UP";
}

function direccionAleatoriaValida(e) {
    const validas = ["UP", "DOWN", "LEFT", "RIGHT"].filter(d => e.puedeAvanzar(d));
    if (validas.length === 0) return e.dir;
    return validas[Math.floor(Math.random() * validas.length)];
}

function decidirDireccion(e) {
    const origen = tileDe(e);
    const destino = tileDe(jugador);
    let dir = null;

    // El 12% de las veces deambula para no ser 100% predecible
    if (Math.random() > 0.12) dir = siguientePasoBFS(origen, destino);

    if (!dir) {
        if (origen.c === destino.c && origen.f === destino.f) dir = direccionDirecta(e);
        else dir = direccionAleatoriaValida(e);
    }
    return dir;
}

// Mueve al enemigo centrándolo en su carril para no atascarse en las esquinas
function moverEnemigo(e) {
    const [dx, dy] = VECTORES[e.dir];
    const nx = e.x + dx * e.vel, ny = e.y + dy * e.vel;

    let nudgeX = 0, nudgeY = 0;
    if (esVertical(e.dir)) {
        const alvo = Math.round((e.x - 2) / T) * T + 2;
        const d = alvo - e.x;
        nudgeX = Math.abs(d) <= e.vel ? d : Math.sign(d) * e.vel;
    } else {
        const alvo = Math.round((e.y - 2) / T) * T + 2;
        const d = alvo - e.y;
        nudgeY = Math.abs(d) <= e.vel ? d : Math.sign(d) * e.vel;
    }

    if (e.puedeMoverse(nx + nudgeX, ny + nudgeY)) { e.x = nx + nudgeX; e.y = ny + nudgeY; return true; }
    if ((nudgeX !== 0 || nudgeY !== 0) && e.puedeMoverse(e.x + nudgeX, e.y + nudgeY)) {
        e.x += nudgeX; e.y += nudgeY; return true;
    }
    if (e.puedeMoverse(nx, ny)) { e.x = nx; e.y = ny; return true; }
    return false;
}

function actualizarIA(e) {
    e.tiempoIA--;
    if (e.tiempoIA <= 0) {
        e.tiempoIA = 10;
        e.dir = decidirDireccion(e);
    }

    e.tiempoDisparoIA--;
    if (e.tiempoDisparoIA <= 0) {
        e.tiempoDisparoIA = 20;
        let alineadoX = Math.abs(e.x - jugador.x) < 25;
        let alineadoY = Math.abs(e.y - jugador.y) < 25;
        if (alineadoX || alineadoY || Math.random() < 0.3) {
            e.disparar(true);
        }
    }
}

class EnemyFactory {
    static create(tipo, x, y) {
        let e = new Tanque(x, y, "#e74c3c", tipo);
        e.tipo = tipo;
        e.dir = "DOWN";
        e.vel = 2.0;

        if (tipo === "rapido") { e.vel = 3.2; e.color = "#d35400"; e.colorOriginal = "#d35400"; }
        if (tipo === "blindado") { e.vel = 1.2; e.hp = 2; e.color = "#27ae60"; e.colorOriginal = "#27ae60"; }

        e.vel *= dificultadActual.velocidad;
        if (Math.random() < 0.20) { e.esEspecial = true; }

        e.tiempoIA = 5 + Math.floor(Math.random() * 10);
        e.tiempoDisparoIA = 10 + Math.floor(Math.random() * 15);
        return e;
    }
}

let jugador = new Tanque(162, 482, "#f1c40f", "jugador");
let enemigos = [];
let powerUps = [];
let teclas = { w: false, a: false, s: false, d: false };

// --- EVENTOS DEL TECLADO ---
window.addEventListener("keydown", (e) => {
    if (!juegoActivo) return;
    let key = e.key.toLowerCase();

    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) e.preventDefault();

    if (key === "w" || e.key === "ArrowUp") teclas.w = true;
    if (key === "s" || e.key === "ArrowDown") teclas.s = true;
    if (key === "a" || e.key === "ArrowLeft") teclas.a = true;
    if (key === "d" || e.key === "ArrowRight") teclas.d = true;
    if (e.key === " ") jugador.disparar(false);
});

window.addEventListener("keyup", (e) => {
    let key = e.key.toLowerCase();
    if (key === "w" || e.key === "ArrowUp") teclas.w = false;
    if (key === "s" || e.key === "ArrowDown") teclas.s = false;
    if (key === "a" || e.key === "ArrowLeft") teclas.a = false;
    if (key === "d" || e.key === "ArrowRight") teclas.d = false;
});

window.addEventListener("blur", () => { teclas = { w: false, a: false, s: false, d: false }; });

// ===========================================================================
//  PROGRESIÓN: NIVELES DE CAMPAÑA Y OLEADAS
// ===========================================================================

// Reinicia todo lo que depende del nivel/oleada actual
function limpiarEscena() {
    enemigos.forEach(e => { e.vivo = false; });
    enemigos = [];
    powerUps = [];
    particulas = [];
    textosFlotantes = [];

    generadosNivel = 0;
    enemigosEliminadosNivel = 0;
    perdioVidaNivel = false;
    combo = 0;
    comboFrames = 0;

    jugador.x = spawnJugador.x;
    jugador.y = spawnJugador.y;
    jugador.dir = "UP";
    jugador.balas = [];
    jugador.deslizar = 0;

    fase = "jugando";
    faseFrames = 0;
}

// Cantidad de cada tipo de enemigo según el nivel de campaña (más duros hacia el final)
function pesosCampana(nivel) {
    const tabla = [
        { basico: 70, rapido: 30, blindado: 0 },
        { basico: 50, rapido: 30, blindado: 20 },
        { basico: 40, rapido: 30, blindado: 30 },
        { basico: 30, rapido: 35, blindado: 35 },
        { basico: 20, rapido: 35, blindado: 45 }
    ];
    return tabla[Math.min(nivel, tabla.length) - 1] || tabla[tabla.length - 1];
}

// Devuelve "ok", "fin" (no hay más niveles) o "error" (fallo de red)
async function cargarNivelCampana(nivel) {
    try {
        const resp = await fetch(`${API_URL}/campaign/level/${nivel}`);
        if (resp.status === 404) return "fin";
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        const d = dificultadActual;
        mapa = data.map_layout;
        totalNiveles = data.total_levels || totalNiveles;
        nombreEscenario = data.name || `NIVEL ${nivel}`;
        aplicarTema(data.theme || TEMAS_NIVEL_DEFECTO[(nivel - 1) % TEMAS_NIVEL_DEFECTO.length]);

        maxEnemigos = Math.max(2, data.difficulty.max_enemies + d.extraSimultaneos);
        probSpawn = data.difficulty.spawn_rate;
        objetivoNivel = Math.max(4, Math.round((data.difficulty.objective || 10) * d.cantidad));
        pesosEnemigos = pesosCampana(nivel);

        nivelActual = nivel;
        spawnJugador = SPAWN_JUGADOR_CAMPANA;
        limpiarEscena();
        darEscudo(2500);
        activarShake(15, 6);
        mostrarBanner(`NIVEL ${nivel}`, nombreEscenario, "", 150, "#3498db");
        actualizarHUD();
        return "ok";
    } catch (e) {
        console.error("Error cargando el nivel desde la API:", e);
        return "error";
    }
}

// Configura una oleada del modo infinito (cada oleada es más dura que la anterior)
function prepararOleada(w) {
    const d = dificultadActual;
    const especial = (w % 5 === 0); // cada 5 oleadas: oleada especial de blindados

    const arena = ARENAS_OLEADAS[Math.floor((w - 1) / 3) % ARENAS_OLEADAS.length];
    mapa = arena.mapa.map(fila => fila.slice()); // copia: los ladrillos se regeneran en cada oleada
    nombreEscenario = arena.nombre;
    aplicarTema(arena.tema);

    objetivoNivel = Math.max(4, Math.round((5 + 3 * w) * d.cantidad * (especial ? 1.2 : 1)));
    maxEnemigos = Math.max(2, Math.min(3 + Math.floor((w - 1) / 2), 8) + d.extraSimultaneos);
    probSpawn = Math.min(0.012 + 0.002 * (w - 1), 0.045);
    pesosEnemigos = especial
        ? { basico: 10, rapido: 30, blindado: 60 }
        : {
            basico: Math.max(15, 100 - 12 * (w - 1)),
            rapido: w >= 2 ? Math.min(40, 20 + 4 * (w - 2)) : 0,
            blindado: w >= 3 ? Math.min(45, 10 + 5 * (w - 3)) : 0
        };

    nivelActual = w;
    spawnJugador = SPAWN_JUGADOR_OLEADAS;
    limpiarEscena();
    darEscudo(2500);
    activarShake(12, 5);
    mostrarBanner(`OLEADA ${w}`, especial ? "¡OLEADA ESPECIAL!" : arena.nombre, "", 150, especial ? "#e74c3c" : "#3498db");
    actualizarHUD();
}

function comprobarFinNivel() {
    if (fase !== "jugando") return;
    if (enemigosEliminadosNivel < objetivoNivel) return;

    // Bonus por superar el nivel/oleada (+500 extra si no perdiste ninguna vida)
    const sinDanio = !perdioVidaNivel;
    const bonus = 250 * nivelActual + (sinDanio ? 500 : 0);
    scoreObserver.sumarPuntos(bonus);
    reproducirSonido("powerup", 0.7);

    // Última misión de la campaña: victoria
    if (modoJuego === "campana" && nivelActual >= totalNiveles) {
        terminarJuego("victoria");
        return;
    }

    fase = "transicion";
    faseFrames = 200;
    darEscudo(4000);

    const titulo = modoJuego === "oleadas" ? `OLEADA ${nivelActual} SUPERADA` : `NIVEL ${nivelActual} SUPERADO`;
    mostrarBanner(titulo, `BONUS +${bonus} PTS`, sinDanio ? "¡SIN DAÑO!" : "", 190, "#2ecc71");

    // Campaña: registrar el progreso en el servidor (sin bloquear el juego)
    if (modoJuego === "campana" && jugadorId) {
        fetch(`${API_URL}/campaign/advance/${jugadorId}`, { method: "POST" })
            .catch(e => console.error("Error guardando progreso del nivel:", e));
    }
}

async function avanzarSiguienteNivel() {
    fase = "cargando";

    if (modoJuego === "oleadas") {
        prepararOleada(nivelActual + 1);
        return;
    }

    const resultado = await cargarNivelCampana(nivelActual + 1);
    if (!juegoActivo) return;
    if (resultado === "fin") terminarJuego("victoria");
    else if (resultado === "error") terminarJuego("error");
}

// ===========================================================================
//  GESTIÓN DE VIDAS, PODERES Y PUNTOS
// ===========================================================================
function darEscudo(tiempoMs) {
    // No se acortan escudos más largos que ya estuvieran activos
    jugador.escudoHasta = Math.max(jugador.escudoHasta, Date.now() + tiempoMs);
}

function perderVida() {
    if (jugador.invulnerable) return;

    vidas--;
    perdioVidaNivel = true;
    combo = 0;
    comboFrames = 0;
    actualizarHUD();

    crearExplosion(jugador.x + 18, jugador.y + 18, "#e74c3c", 25);
    activarShake(18, 8);
    reproducirSonido("explosion", 0.7);

    if (vidas <= 0) {
        terminarJuego("derrota");
    } else {
        jugador.x = spawnJugador.x;
        jugador.y = spawnJugador.y;
        jugador.dir = "UP";
        jugador.deslizar = 0;
        darEscudo(3000);
    }
}

function multiplicadorCombo() {
    // combos 1-3 -> x1, 4-6 -> x2, 7-9 -> x3 ... máximo x5
    return Math.min(1 + Math.floor((Math.max(combo, 1) - 1) / 3), 5);
}

function destruirEnemigo(e, porBomba = false) {
    e.vivo = false;

    let mult = 1;
    if (modoJuego === "oleadas") {
        combo++;
        comboFrames = 180; // 3 segundos para encadenar la siguiente baja
        mejorCombo = Math.max(mejorCombo, combo);
        mult = multiplicadorCombo();
    }

    const pts = (PUNTOS_ENEMIGO[e.tipo] || 100) * mult;
    scoreObserver.sumarPuntos(pts);

    crearTextoFlotante(e.x + 6, e.y, `+${pts}` + (mult > 1 ? ` x${mult}` : ""), mult > 1 ? "#e67e22" : "#f1c40f");
    crearExplosion(e.x + 18, e.y + 18, "#e74c3c", 20);
    if (!porBomba) {
        crearExplosion(e.x + 18, e.y + 18, "#f39c12", 10);
        activarShake(10, 5);
        reproducirSonido("explosion", 0.6);
        if (e.esEspecial) powerUps.push(new PowerUp(e.x, e.y));
    }

    enemigosEliminadosNivel++;
    actualizarHUD();
}

function aplicarPowerUp(tipo) {
    if (tipo === "bomba") {
        reproducirSonido("explosion", 0.8);
        enemigos.forEach(e => { if (e.vivo) destruirEnemigo(e, true); });
        activarShake(20, 10);
    } else if (tipo === "casco") {
        darEscudo(8000);
        crearTextoFlotante(jugador.x, jugador.y - 10, "¡ESCUDO!", "#3498db");
    } else if (tipo === "vida") {
        vidas++;
        actualizarHUD();
        crearTextoFlotante(jugador.x, jugador.y - 10, "+1 VIDA", "#2ecc71");
    }
}

// ===========================================================================
//  BUCLE DE JUEGO
// ===========================================================================
function elegirTipoEnemigo() {
    const total = pesosEnemigos.basico + pesosEnemigos.rapido + pesosEnemigos.blindado;
    let r = Math.random() * total;
    for (const tipo of ["basico", "rapido", "blindado"]) {
        r -= pesosEnemigos[tipo];
        if (r < 0) return tipo;
    }
    return "basico";
}

function spawnLibre(p) {
    if (!esTransitable(Math.floor((p.x + 18) / T), Math.floor((p.y + 18) / T))) return false;
    if (Math.abs(jugador.x - p.x) < 40 && Math.abs(jugador.y - p.y) < 40) return false;
    return !enemigos.some(e => Math.abs(e.x - p.x) < 40 && Math.abs(e.y - p.y) < 40);
}

function intentarSpawnEnemigo() {
    if (fase !== "jugando") return;
    if (generadosNivel >= objetivoNivel) return;       // ya aparecieron todos los de este nivel/oleada
    if (enemigos.length >= maxEnemigos) return;
    if (Math.random() >= probSpawn) return;

    const libres = SPAWNS_ENEMIGOS.filter(spawnLibre);
    if (libres.length === 0) return;

    const p = libres[Math.floor(Math.random() * libres.length)];
    enemigos.push(EnemyFactory.create(elegirTipoEnemigo(), p.x, p.y));
    generadosNivel++;
}

function moverJugador() {
    let dirMov = null;
    if (teclas.w) dirMov = "UP";
    else if (teclas.s) dirMov = "DOWN";
    else if (teclas.a) dirMov = "LEFT";
    else if (teclas.d) dirMov = "RIGHT";

    if (dirMov) {
        jugador.cambiarDireccion(dirMov, true);
        const [dx, dy] = VECTORES[dirMov];
        const nx = jugador.x + dx * jugador.vel, ny = jugador.y + dy * jugador.vel;
        if (jugador.puedeMoverse(nx, ny)) { jugador.x = nx; jugador.y = ny; }

        // Sobre hielo el tanque sigue deslizándose un poco al soltar las teclas
        const t = tileDe(jugador);
        if (mapa[t.f] && mapa[t.f][t.c] === 6) {
            jugador.deslizar = 14;
            jugador.dirDeslizar = dirMov;
        } else {
            jugador.deslizar = 0;
        }
    } else if (jugador.deslizar > 0) {
        const [dx, dy] = VECTORES[jugador.dirDeslizar];
        const v = jugador.vel * (jugador.deslizar / 14);
        const nx = jugador.x + dx * v, ny = jugador.y + dy * v;
        if (jugador.puedeMoverse(nx, ny)) { jugador.x = nx; jugador.y = ny; jugador.deslizar--; }
        else jugador.deslizar = 0;
    }
}

function actualizarJuego() {
    jugador.actualizar();
    moverJugador();

    // --- Enemigos ---
    enemigos.forEach(e => {
        if (!e.vivo) return;
        e.actualizar();
        actualizarIA(e);

        if (!moverEnemigo(e)) {
            e.dir = decidirDireccion(e);
            e.tiempoIA = 10;
        }

        e.balas.forEach(b => {
            b.actualizar();
            if (b.activa && b.x > jugador.x && b.x < jugador.x + 36 && b.y > jugador.y && b.y < jugador.y + 36) {
                b.activa = false;
                perderVida();
            }
        });
        e.balas = e.balas.filter(b => b.activa);
    });

    // --- Balas del jugador ---
    jugador.balas.forEach(b => {
        b.actualizar();
        enemigos.forEach(e => {
            if (e.vivo && b.activa && b.x > e.x && b.x < e.x + 36 && b.y > e.y && b.y < e.y + 36) {
                b.activa = false;
                e.hp--;
                if (e.hp <= 0) {
                    destruirEnemigo(e);
                } else {
                    // Blindado: aguanta el primer impacto
                    e.flash = 6;
                    crearExplosion(b.x, b.y, "#ecf0f1", 8);
                    reproducirSonido("explosion", 0.3);
                }
            }
        });
    });
    jugador.balas = jugador.balas.filter(b => b.activa);
    enemigos = enemigos.filter(e => e.vivo);

    // --- Power-ups ---
    powerUps.forEach(p => {
        if (p.activo && jugador.x < p.x + 36 && jugador.x + 36 > p.x && jugador.y < p.y + 36 && jugador.y + 36 > p.y) {
            p.activo = false;
            reproducirSonido("powerup", 0.7);
            aplicarPowerUp(p.tipo);
            scoreObserver.sumarPuntos(500);
            crearTextoFlotante(p.x + 6, p.y, "+500", "#2ecc71");
            crearExplosion(p.x + 18, p.y + 18, "#2ecc71", 15);
            activarShake(8, 4);
        }
    });
    powerUps = powerUps.filter(p => p.activo);

    // --- Aparición de enemigos, combo y fin de nivel/oleada ---
    intentarSpawnEnemigo();

    if (comboFrames > 0) {
        comboFrames--;
        if (comboFrames === 0) combo = 0;
    }

    comprobarFinNivel();

    if (fase === "transicion") {
        faseFrames--;
        if (faseFrames <= 0) avanzarSiguienteNivel();
    }

    // --- Efectos visuales ---
    particulas.forEach(p => p.actualizar());
    particulas = particulas.filter(p => p.vida > 0);

    textosFlotantes.forEach(t => t.actualizar());
    textosFlotantes = textosFlotantes.filter(t => t.vida > 0);

    if (banner.frames > 0) banner.frames--;
}

function dibujarEscena() {
    ctx.save();
    if (shakeTime > 0) {
        let dx = (Math.random() - 0.5) * shakeIntensity;
        let dy = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(dx, dy);
        shakeTime--;
    }

    ctx.clearRect(-10, -10, canvas.width + 20, canvas.height + 20);
    ctx.fillStyle = temaActual.suelo;
    ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);
    if (fondoActual) ctx.drawImage(fondoActual, 0, 0);

    dibujarMapa();
    powerUps.forEach(p => p.dibujar());
    jugador.dibujar();
    jugador.balas.forEach(b => b.dibujar());
    enemigos.forEach(e => { e.dibujar(); e.balas.forEach(b => b.dibujar()); });
    dibujarBosque();

    particulas.forEach(p => p.dibujar());
    textosFlotantes.forEach(t => t.dibujar());

    ctx.restore();

    dibujarBanner();
    dibujarComboHUD();
}

function gameLoop() {
    if (!juegoActivo) return;

    actualizarJuego();
    dibujarEscena();

    animacionFrameId = requestAnimationFrame(gameLoop);
}

// ===========================================================================
//  CONEXIÓN API Y RANKING
// ===========================================================================
async function actualizarRanking() {
    const titulo = document.getElementById("ranking-title");
    if (titulo) titulo.innerText = modoJuego === "oleadas" ? "TOP OLEADAS" : "TOP CAMPAÑA";

    try {
        const resp = await fetch(`${API_URL}/ranking?modo=${modoJuego}`);
        const datos = await resp.json();
        const listaUI = document.getElementById("ranking-list");
        listaUI.innerHTML = "";

        if (datos.length === 0) {
            listaUI.innerHTML = "<li>Aún no hay registros</li>"; return;
        }

        datos.forEach((registro, index) => {
            const li = document.createElement("li");
            li.innerHTML = `<span>#${index + 1} <span class="rank-name">${registro.nombre}</span></span> <span class="rank-score">${registro.puntos} pts</span>`;
            listaUI.appendChild(li);
        });
    } catch (e) {
        const listaUI = document.getElementById("ranking-list");
        if (listaUI) listaUI.innerHTML = "<li style='color:#e74c3c;'>Error de conexión</li>";
    }
}

function actualizarDescripcionModo() {
    const modo = document.getElementById("modo").value;
    const desc = document.getElementById("modo-desc");
    if (!desc) return;
    desc.innerText = modo === "oleadas"
        ? "Sin base. Destruye oleadas infinitas de enemigos y logra la máxima puntuación."
        : "5 niveles con escenarios distintos. Defiende tu base hasta el final.";
}

async function iniciarSesion() {
    const user = document.getElementById("username").value;
    dificultadSeleccionada = document.getElementById("dificultad").value;
    dificultadActual = DIFICULTADES[dificultadSeleccionada] || DIFICULTADES.medio;
    modoJuego = document.getElementById("modo").value === "oleadas" ? "oleadas" : "campana";
    const errorMsg = document.getElementById("login-error");

    if (!user.trim()) { errorMsg.innerText = "Por favor, ingresa un nombre válido."; return; }

    errorMsg.innerText = "Conectando al servidor...";
    errorMsg.style.color = "#f39c12";

    try {
        const resp = await fetch(`${API_URL}/login`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre_usuario: user.toUpperCase() })
        });
        const data = await resp.json();
        jugadorId = data.jugador.id;
        nombreJugador = data.jugador.nombre_usuario;
    } catch (e) {
        errorMsg.style.color = "#e74c3c";
        errorMsg.innerText = "Error: Asegúrate de que Uvicorn esté corriendo.";
        return;
    }

    // Se prepara la partida ANTES de ocultar el menú: si el nivel no carga, el error se ve aquí
    const listo = await prepararPartida();
    if (!listo) {
        errorMsg.style.color = "#e74c3c";
        errorMsg.innerText = "No se pudo cargar el nivel 1. Reinicia Uvicorn para actualizar la base de datos.";
        return;
    }

    document.getElementById("login-screen").style.display = "none";
    document.getElementById("main-wrapper").style.display = "flex";
    document.getElementById("playerName").innerText = nombreJugador;
    document.getElementById("diffLabel").innerText = dificultadSeleccionada.toUpperCase();

    actualizarHUD();
    await actualizarRanking();
    arrancarPartida();
}

async function prepararPartida() {
    await cargarImagenes();

    vidas = 3;
    nivelActual = 1;
    mejorCombo = 0;
    particulas = [];
    textosFlotantes = [];
    banner.frames = 0;

    if (modoJuego === "oleadas") {
        prepararOleada(1);
        return true;
    }
    return (await cargarNivelCampana(1)) === "ok";
}

function arrancarPartida() {
    juegoActivo = true;
    darEscudo(3000);
    reproducirMusica();
    animacionFrameId = requestAnimationFrame(gameLoop);
}

// ===========================================================================
//  FIN DE PARTIDA Y GUARDADO
// ===========================================================================
// resultado: "derrota" | "victoria" | "error"
function terminarJuego(resultado = "derrota") {
    if (!juegoActivo) return;
    juegoActivo = false;
    cancelAnimationFrame(animacionFrameId);

    detenerMusica();
    reproducirSonido(resultado === "victoria" ? "powerup" : "gameOver", 0.8);

    teclas = { w: false, a: false, s: false, d: false };
    if (document.activeElement) document.activeElement.blur();

    const titulo = document.getElementById("overlay-title");
    if (resultado === "victoria") {
        titulo.innerText = "¡VICTORIA!";
        titulo.style.color = "#2ecc71";
    } else if (resultado === "error") {
        titulo.innerText = "ERROR DE RED";
        titulo.style.color = "#f39c12";
    } else {
        titulo.innerText = "GAME OVER";
        titulo.style.color = "#e74c3c";
    }

    const detalle = modoJuego === "oleadas"
        ? `Oleada alcanzada: ${nivelActual}  |  Mejor combo: ${mejorCombo}`
        : (resultado === "victoria"
            ? "¡Completaste toda la campaña!"
            : `Nivel alcanzado: ${nivelActual} de ${totalNiveles}`);

    document.getElementById("overlay").style.display = "flex";
    document.getElementById("final-score").innerText = scoreObserver.puntos;
    document.getElementById("final-detail").innerText = detalle;
    document.getElementById("save-status").innerText = resultado === "error"
        ? "Se perdió la conexión con el servidor. Puedes guardar tu puntuación igualmente."
        : "Haz clic en el botón para guardar tu récord.";
    document.getElementById("save-status").style.color = "#fff";
}

async function guardarYReiniciar() {
    const btn = document.getElementById("btn-reiniciar");
    const saveTxt = document.getElementById("save-status");

    btn.disabled = true; btn.innerText = "GUARDANDO...";
    saveTxt.innerText = "Guardando en la base de datos..."; saveTxt.style.color = "#f39c12";

    try {
        await fetch(`${API_URL}/partida`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jugador_id: jugadorId,
                puntuacion: scoreObserver.puntos,
                nivel_alcanzado: nivelActual,
                dificultad: dificultadSeleccionada,
                modo: modoJuego
            })
        });

        saveTxt.innerText = "¡ÉXITO! Puntuación registrada."; saveTxt.style.color = "#2ecc71";
        setTimeout(() => { location.reload(); }, 1000);

    } catch (e) {
        saveTxt.innerText = "Error al conectar con la Base de Datos."; saveTxt.style.color = "#e74c3c";
        setTimeout(() => { location.reload(); }, 1500);
    }
}

actualizarDescripcionModo();
