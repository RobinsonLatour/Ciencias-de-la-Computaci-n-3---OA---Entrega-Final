// Diagnóstico del robot R-07 · Entrega final
// Lógica de los chequeos, feedback con el DOM, puntos, pistas, guardado y informe.

// ---------- Constantes ----------
const CLAVE_FINAL = "NUCLEO-ESTABLE";
const CLAVE_GUARDADO = "r07-progreso";
const PUNTOS_ACIERTO = 10;
const PUNTOS_ERROR = 2;
const COSTO_PISTA = 3;
const MAX_INTENTOS = 3;
const ACIERTOS_PARA_INSIGNIA = 6;

// Zonas del mapa y los chequeos que tiene cada una
const ZONAS = [
  { id: "sensores", titulo: "Sistema de percepción", chequeos: [1, 2, 3] },
  { id: "actuadores", titulo: "Sistema de acción", chequeos: [4, 5] },
  { id: "controlador", titulo: "Sistema de decisión", chequeos: [6, 7] },
  { id: "desafio", titulo: "Núcleo de R-07", chequeos: [8, 9] }
];

// Configuración de cada chequeo: tipo, respuesta correcta, pista y mensajes
const CHEQUEOS = {
  1: {
    tipo: "opcion", campo: "c1", correcta: ["sensor"], textoCorrecta: "Sensor de distancia",
    aviso: "Elegí una opción antes de ejecutar el chequeo.",
    pista: "Pensá en la pieza que mide algo del ambiente, no en la que hace una acción.",
    ok: "Sensor identificado. R-07 vuelve a sentir su entorno.",
    error: "Esa pieza no capta información del ambiente."
  },
  2: {
    tipo: "opcion", campo: "c2", correcta: ["verdadero"], textoCorrecta: "Verdadero",
    aviso: "Elegí verdadero o falso antes de ejecutar el chequeo.",
    pista: "Un sensor de luz mide justamente eso: si hay luz o sombra.",
    ok: "Correcto. El sensor de luz distingue luz de sombra.",
    error: "Revisá el expediente: ¿qué mide un sensor de luz?"
  },
  3: {
    tipo: "casillas", campo: "c3", correcta: ["distancia", "color", "luz"],
    textoCorrecta: "Sensor de distancia, sensor de color y sensor de luz",
    aviso: "Marcá al menos una casilla antes de ejecutar el chequeo.",
    pista: "Son tres. El motor y el parlante hacen acciones, no miden.",
    ok: "Inventario completo. Los tres sensores están identificados.",
    error: "El inventario no coincide. Alguna pieza está de más o falta."
  },
  4: {
    tipo: "combo", campos: ["c4-respuesta"], correcta: ["motor"], textoCorrecta: "motor",
    aviso: "Elegí una opción en la lista antes de ejecutar el chequeo.",
    pista: "Es el actuador que hace girar las ruedas.",
    ok: "Motor confirmado. R-07 recupera el movimiento.",
    error: "Esa pieza no es la que mueve al robot."
  },
  5: {
    tipo: "texto", campo: "c5-respuesta", correcta: ["led", "el led"], textoCorrecta: "led",
    aviso: "Escribí una palabra antes de ejecutar el chequeo.",
    pista: "Es un actuador pequeño que enciende una luz. Tiene tres letras.",
    ok: "Led confirmado. R-07 vuelve a encender sus luces.",
    error: "Esa no es la pieza que enciende una luz."
  },
  6: {
    tipo: "texto", campo: "c6-respuesta", correcta: ["controlador", "el controlador"], textoCorrecta: "controlador",
    aviso: "Escribí una palabra antes de ejecutar el chequeo.",
    pista: "Es la parte que decide: no siente ni se mueve.",
    ok: "Controlador confirmado. R-07 vuelve a decidir.",
    error: "Esa no es la parte que decide."
  },
  7: {
    tipo: "opcion", campo: "c7", correcta: ["decide"], textoCorrecta: "Decide frenar y manda la orden al motor",
    aviso: "Elegí una opción antes de ejecutar el chequeo.",
    pista: "El controlador no mide ni frena: recibe, decide y manda la orden.",
    ok: "Correcto. El controlador decide y manda la orden al actuador.",
    error: "Esa acción no le corresponde al controlador."
  },
  8: {
    tipo: "combo", campos: ["c8-a", "c8-b", "c8-c"], correcta: ["sensor", "controlador", "actuador"],
    textoCorrecta: "sensor, controlador, actuador",
    aviso: "Completá las tres listas antes de ejecutar el chequeo.",
    pista: "El orden es: primero siente, después decide, al final actúa.",
    ok: "Secuencia reconstruida. Los tres sistemas de R-07 trabajan juntos.",
    error: "La secuencia no es correcta. Revisá el orden de los tres sistemas."
  },
  9: {
    tipo: "texto", campo: "c9-respuesta", correcta: ["motor", "el motor"], textoCorrecta: "motor",
    aviso: "Escribí una palabra antes de ejecutar el chequeo.",
    pista: "Es el mismo actuador que hace girar las ruedas.",
    ok: "Motor confirmado. R-07 frena a tiempo.",
    error: "Esa pieza no es la que frena al robot."
  }
};

// ---------- Estado ----------
let estado = estadoInicial();

function estadoInicial() {
  return { nombre: "", puntaje: 0, tema: "oscuro", chequeos: {} };
}

// ---------- Elementos de la página ----------
const cuerpo = document.body;
const hudNombre = document.getElementById("hud-nombre");
const puntajeTexto = document.getElementById("puntaje");
const estadoProgreso = document.getElementById("estado-progreso");
const barraRelleno = document.getElementById("barra-progreso-relleno");
const textoProgreso = document.getElementById("texto-progreso");
const mensajeMapa = document.getElementById("mensaje-mapa");
const bloqueInforme = document.getElementById("bloque-informe");

const formularioAgente = document.getElementById("formulario-agente");
const campoNombre = document.getElementById("nombre-agente");
const mensajeNombre = document.getElementById("mensaje-nombre");

const botonTema = document.getElementById("boton-tema");
const informeFinal = document.getElementById("informe-final");
const modalReiniciar = document.getElementById("modal-reiniciar");

// ---------- Funciones de apoyo ----------
function normalizarTexto(texto) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function datosChequeo(numero) {
  if (!estado.chequeos[numero]) {
    estado.chequeos[numero] = { resultado: "pendiente", intentos: 0, pista: false };
  }
  return estado.chequeos[numero];
}

function chequeoResuelto(numero) {
  const datos = estado.chequeos[numero];
  return datos !== undefined && datos.resultado !== "pendiente";
}

function contarResueltos() {
  return Object.keys(CHEQUEOS).filter(function (numero) {
    return chequeoResuelto(numero);
  }).length;
}

function contarAciertos() {
  return Object.keys(CHEQUEOS).filter(function (numero) {
    return estado.chequeos[numero] && estado.chequeos[numero].resultado === "ok";
  }).length;
}

function zonaCompleta(indice) {
  return ZONAS[indice].chequeos.every(chequeoResuelto);
}

function zonaDesbloqueada(indice) {
  return indice === 0 || zonaCompleta(indice - 1);
}

function todoCompleto() {
  return contarResueltos() === Object.keys(CHEQUEOS).length;
}

// ---------- Guardado del progreso ----------
function guardarProgreso() {
  try {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(estado));
  } catch (error) {
    // Si el navegador no deja guardar, el diagnóstico sigue funcionando sin guardado.
  }
}

function cargarProgreso() {
  try {
    const guardado = localStorage.getItem(CLAVE_GUARDADO);
    if (guardado) {
      estado = Object.assign(estadoInicial(), JSON.parse(guardado));
    }
  } catch (error) {
    estado = estadoInicial();
  }
}

// ---------- Pantallas y menú ----------
function mostrarPantalla(idPantalla) {
  document.querySelectorAll(".pantalla").forEach(function (pantalla) {
    pantalla.hidden = pantalla.id !== idPantalla;
  });
  window.scrollTo(0, 0);
}

function irAlMapa() {
  if (estado.nombre === "") {
    return;
  }
  actualizarMapa();
  mostrarPantalla("pantalla-mapa");
}

function entrarZona(idZona) {
  const indice = ZONAS.findIndex(function (zona) {
    return zona.id === idZona;
  });
  if (indice === -1 || !zonaDesbloqueada(indice)) {
    return;
  }
  mostrarPantalla("zona-" + idZona);
}

// ---------- HUD y mapa ----------
function actualizarHud() {
  const total = Object.keys(CHEQUEOS).length;
  const resueltos = contarResueltos();
  hudNombre.textContent = estado.nombre === "" ? "sin identificar" : estado.nombre;
  puntajeTexto.textContent = "PUNTOS: " + estado.puntaje;
  estadoProgreso.textContent = "DIAGNÓSTICO: " + resueltos + "/" + total;
  barraRelleno.style.width = (resueltos / total) * 100 + "%";
  textoProgreso.textContent = "Diagnóstico completado: " + Math.round((resueltos / total) * 100) + "%";
}

function actualizarMapa() {
  ZONAS.forEach(function (zona, indice) {
    const tarjeta = document.getElementById("tarjeta-" + zona.id);
    const textoEstado = document.getElementById("estado-zona-" + zona.id);
    const boton = tarjeta.querySelector(".boton-entrar");
    const resueltos = zona.chequeos.filter(chequeoResuelto).length;

    tarjeta.classList.remove("completa", "disponible", "bloqueada");
    if (zonaCompleta(indice)) {
      tarjeta.classList.add("completa");
      textoEstado.textContent = "ZONA REVISADA · " + resueltos + "/" + zona.chequeos.length;
      boton.textContent = "Repasar la zona";
      boton.disabled = false;
    } else if (zonaDesbloqueada(indice)) {
      tarjeta.classList.add("disponible");
      textoEstado.textContent = "ACCESO HABILITADO · " + resueltos + "/" + zona.chequeos.length;
      boton.textContent = "Entrar a la zona";
      boton.disabled = false;
    } else {
      tarjeta.classList.add("bloqueada");
      textoEstado.textContent = "BLOQUEADA · revisá la zona anterior";
      boton.textContent = "Bloqueada";
      boton.disabled = true;
    }
  });

  bloqueInforme.hidden = !todoCompleto();
  ZONAS.forEach(function (zona, indice) {
    document.getElementById("zona-lista-" + zona.id).hidden = !zonaCompleta(indice);
  });
  if (estado.nombre !== "") {
    mensajeMapa.textContent = "Agente " + estado.nombre + ", elegí una zona para seguir con el diagnóstico de R-07.";
  }
}

// ---------- Corrección de los chequeos ----------
function leerRespuesta(numero) {
  const config = CHEQUEOS[numero];
  const formulario = document.getElementById("formulario-" + numero);

  if (config.tipo === "opcion") {
    const marcada = formulario.querySelector('input[name="' + config.campo + '"]:checked');
    return marcada ? [marcada.value] : null;
  }
  if (config.tipo === "casillas") {
    const marcadas = formulario.querySelectorAll('input[name="' + config.campo + '"]:checked');
    return marcadas.length > 0 ? Array.from(marcadas).map(function (casilla) { return casilla.value; }) : null;
  }
  if (config.tipo === "combo") {
    const valores = config.campos.map(function (idCampo) {
      return document.getElementById(idCampo).value;
    });
    return valores.includes("") ? null : valores;
  }
  const texto = normalizarTexto(document.getElementById(config.campo).value);
  return texto === "" ? null : [texto];
}

function esCorrecta(numero, respuesta) {
  const config = CHEQUEOS[numero];

  if (config.tipo === "casillas") {
    return respuesta.length === config.correcta.length &&
      config.correcta.every(function (valor) { return respuesta.includes(valor); });
  }
  if (config.tipo === "combo") {
    return respuesta.every(function (valor, posicion) { return valor === config.correcta[posicion]; });
  }
  if (config.tipo === "texto") {
    return config.correcta.includes(respuesta[0]);
  }
  return respuesta[0] === config.correcta[0];
}

function mostrarResultado(numero, tipo, mensaje) {
  const resultado = document.getElementById("resultado-" + numero);
  resultado.textContent = mensaje;
  resultado.className = "resultado " + tipo;
}

function sumarPuntos(cantidad) {
  estado.puntaje = Math.max(0, estado.puntaje + cantidad);
}

function bloquearChequeo(numero) {
  const formulario = document.getElementById("formulario-" + numero);
  formulario.querySelectorAll("input, select, button").forEach(function (control) {
    control.disabled = true;
  });
  document.getElementById("chequeo-" + numero).classList.add("resuelto");
}

function resolverChequeo(numero, resultado) {
  const config = CHEQUEOS[numero];
  const datos = datosChequeo(numero);
  datos.resultado = resultado;

  if (resultado === "ok") {
    datos.intentos++;
    sumarPuntos(PUNTOS_ACIERTO);
    mostrarResultado(numero, "correcto", "[OK] " + config.ok + " +" + PUNTOS_ACIERTO + " puntos.");
  } else {
    mostrarResultado(numero, "fallo", "[FALLO] Se acabaron los intentos. La respuesta correcta era: " + config.textoCorrecta + ". Seguí con el diagnóstico.");
  }
  bloquearChequeo(numero);
  alTerminarChequeo(numero);
}

function registrarError(numero) {
  const config = CHEQUEOS[numero];
  const datos = datosChequeo(numero);
  datos.intentos++;
  sumarPuntos(-PUNTOS_ERROR);

  if (datos.intentos >= MAX_INTENTOS) {
    resolverChequeo(numero, "fallo");
    return;
  }
  const restantes = MAX_INTENTOS - datos.intentos;
  const textoIntentos = restantes === 1 ? "Te queda 1 intento." : "Te quedan " + restantes + " intentos.";
  mostrarResultado(numero, "incorrecto", "[ERROR] " + config.error + " -" + PUNTOS_ERROR + " puntos. " + textoIntentos);
  actualizarHud();
  guardarProgreso();
}

function corregirChequeo(evento) {
  evento.preventDefault();
  const numero = Number(evento.target.id.replace("formulario-", ""));
  if (chequeoResuelto(numero)) {
    return;
  }

  const respuesta = leerRespuesta(numero);
  if (respuesta === null) {
    mostrarResultado(numero, "aviso", "[AVISO] " + CHEQUEOS[numero].aviso);
    return;
  }
  if (esCorrecta(numero, respuesta)) {
    resolverChequeo(numero, "ok");
  } else {
    registrarError(numero);
  }
}

function pedirPista(numero) {
  if (chequeoResuelto(numero)) {
    return;
  }
  const datos = datosChequeo(numero);
  let costo = "";
  if (!datos.pista) {
    datos.pista = true;
    sumarPuntos(-COSTO_PISTA);
    costo = " -" + COSTO_PISTA + " puntos.";
  }
  mostrarResultado(numero, "pista", "[PISTA] " + CHEQUEOS[numero].pista + costo);
  actualizarHud();
  guardarProgreso();
}

function alTerminarChequeo(numero) {
  actualizarHud();
  actualizarMapa();
  guardarProgreso();

  const indice = ZONAS.findIndex(function (zona) {
    return zona.chequeos.includes(numero);
  });
  if (todoCompleto()) {
    mostrarInformeFinal();
  } else if (zonaCompleta(indice)) {
    const aviso = document.getElementById("zona-lista-" + ZONAS[indice].id);
    aviso.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function restaurarChequeo(numero) {
  const datos = estado.chequeos[numero];
  if (!datos) {
    return;
  }
  if (datos.resultado === "ok") {
    mostrarResultado(numero, "correcto", "[OK] " + CHEQUEOS[numero].ok);
    bloquearChequeo(numero);
  } else if (datos.resultado === "fallo") {
    mostrarResultado(numero, "fallo", "[FALLO] La respuesta correcta era: " + CHEQUEOS[numero].textoCorrecta + ".");
    bloquearChequeo(numero);
  } else if (datos.intentos > 0) {
    mostrarResultado(numero, "incorrecto", "[ERROR] Intentos usados: " + datos.intentos + " de " + MAX_INTENTOS + ".");
  }
}

// ---------- Teoría desplegable ----------
function alternarTeoria(boton) {
  const cuerpoTeoria = document.getElementById(boton.getAttribute("aria-controls"));
  const abierta = boton.getAttribute("aria-expanded") === "true";
  boton.setAttribute("aria-expanded", String(!abierta));
  cuerpoTeoria.hidden = abierta;
}

// ---------- Registro del agente ----------
function registrarAgente(evento) {
  evento.preventDefault();
  const nombre = campoNombre.value.trim();
  if (nombre === "") {
    mostrarMensajeNombre("[AVISO] Escribí tu nombre y apellido para identificarte, agente.");
    return;
  }
  estado.nombre = nombre;
  mostrarMensajeNombre("");
  actualizarHud();
  guardarProgreso();
  irAlMapa();
}

function mostrarMensajeNombre(mensaje) {
  mensajeNombre.textContent = mensaje;
  mensajeNombre.className = "resultado aviso";
}

// ---------- Tema claro y oscuro ----------
function aplicarTema() {
  const claro = estado.tema === "claro";
  cuerpo.classList.toggle("claro", claro);
  botonTema.textContent = claro ? "Tema oscuro" : "Tema claro";
}

function alternarTema() {
  estado.tema = estado.tema === "claro" ? "oscuro" : "claro";
  aplicarTema();
  guardarProgreso();
}

// ---------- Modales ----------
function abrirModal(modal, botonInicial) {
  modal.classList.add("visible");
  botonInicial.focus();
}

function cerrarModales() {
  informeFinal.classList.remove("visible");
  modalReiniciar.classList.remove("visible");
}

function reiniciarTodo() {
  try {
    localStorage.removeItem(CLAVE_GUARDADO);
  } catch (error) {
    // Sin guardado no hay nada que borrar.
  }
  window.location.reload();
}

// ---------- Informe final ----------
function mostrarInformeFinal() {
  const aciertos = contarAciertos();
  const total = Object.keys(CHEQUEOS).length;
  const conInsignia = aciertos >= ACIERTOS_PARA_INSIGNIA;

  document.getElementById("resumen-informe").textContent =
    "Agente " + estado.nombre + ": " + aciertos + " de " + total + " chequeos correctos.";
  document.getElementById("puntaje-final").textContent = "Puntaje final: " + estado.puntaje;
  document.getElementById("mensaje-insignia").textContent = conInsignia
    ? "Insignia de técnico/a de robótica desbloqueada."
    : "Expediente cerrado, pero sin insignia: te faltaron aciertos. Podés reiniciar y volver a intentarlo.";
  document.getElementById("clave-verificacion").textContent = "CLAVE: " + CLAVE_FINAL;
  abrirModal(informeFinal, document.getElementById("boton-descargar-pdf"));
}

function generarPdf() {
  if (!window.jspdf) {
    window.print();
    return;
  }
  const aciertos = contarAciertos();
  const total = Object.keys(CHEQUEOS).length;
  const documento = new window.jspdf.jsPDF();

  documento.setFontSize(18);
  documento.text("Informe de diagnóstico: robot R-07", 20, 25);
  documento.setFontSize(12);
  documento.text("Agente: " + estado.nombre, 20, 42);
  documento.text("Fecha: " + new Date().toLocaleDateString("es-UY"), 20, 50);
  documento.text("Puntaje final: " + estado.puntaje, 20, 62);
  documento.text("Chequeos resueltos: " + aciertos + " de " + total, 20, 70);

  let fila = 86;
  ZONAS.forEach(function (zona) {
    const correctos = zona.chequeos.filter(function (numero) {
      return estado.chequeos[numero] && estado.chequeos[numero].resultado === "ok";
    }).length;
    documento.text(zona.titulo + ": " + correctos + " de " + zona.chequeos.length + " chequeos", 20, fila);
    fila += 8;
  });

  documento.setFontSize(14);
  documento.text("CLAVE DE VERIFICACION: " + CLAVE_FINAL, 20, fila + 12);
  documento.setFontSize(10);
  documento.text("Reportá esta clave a tu docente como evidencia de que completaste el diagnóstico.", 20, fila + 22);

  const nombreArchivo = "informe-R-07-" + normalizarTexto(estado.nombre).replace(/[^a-z0-9]+/g, "-") + ".pdf";
  documento.save(nombreArchivo);
}

// ---------- Eventos ----------
function conectarEventos() {
  formularioAgente.addEventListener("submit", registrarAgente);

  document.querySelectorAll(".chequeo form").forEach(function (formulario) {
    formulario.addEventListener("submit", corregirChequeo);
  });
  document.querySelectorAll(".boton-pista").forEach(function (boton) {
    boton.addEventListener("click", function () {
      pedirPista(Number(boton.closest("form").id.replace("formulario-", "")));
    });
  });
  document.querySelectorAll(".teoria-cabecera").forEach(function (boton) {
    boton.addEventListener("click", function () { alternarTeoria(boton); });
  });
  document.querySelectorAll(".boton-entrar").forEach(function (boton) {
    boton.addEventListener("click", function () { entrarZona(boton.dataset.zona); });
  });
  document.querySelectorAll(".boton-siguiente[data-zona-siguiente]").forEach(function (boton) {
    boton.addEventListener("click", function () { entrarZona(boton.dataset.zonaSiguiente); });
  });
  document.getElementById("boton-informe-zona").addEventListener("click", mostrarInformeFinal);
  document.querySelectorAll(".volver-mapa").forEach(function (boton) {
    boton.addEventListener("click", irAlMapa);
  });

  document.getElementById("boton-mapa").addEventListener("click", irAlMapa);
  botonTema.addEventListener("click", alternarTema);
  document.getElementById("boton-reiniciar").addEventListener("click", function () {
    abrirModal(modalReiniciar, document.getElementById("boton-cancelar-reinicio"));
  });
  document.getElementById("boton-confirmar-reinicio").addEventListener("click", reiniciarTodo);
  document.getElementById("boton-cancelar-reinicio").addEventListener("click", cerrarModales);
  document.getElementById("boton-ver-informe").addEventListener("click", mostrarInformeFinal);
  document.getElementById("boton-cerrar-informe").addEventListener("click", cerrarModales);
  document.getElementById("boton-descargar-pdf").addEventListener("click", generarPdf);
  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape") {
      cerrarModales();
    }
  });
}

// ---------- Inicio ----------
function iniciar() {
  cargarProgreso();
  aplicarTema();
  conectarEventos();
  Object.keys(CHEQUEOS).forEach(restaurarChequeo);
  actualizarHud();
  actualizarMapa();
  if (estado.nombre !== "") {
    irAlMapa();
  }
}

iniciar();
