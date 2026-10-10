from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

# Importamos la conexión única
from database import db_instance

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializamos la BD al arrancar (crea tablas, migra el esquema y siembra los niveles)
conn = db_instance.connect()

MODOS_VALIDOS = ("campana", "oleadas")


# Modelos de datos
class LoginData(BaseModel):
    nombre_usuario: str


class PartidaData(BaseModel):
    jugador_id: int
    puntuacion: int
    dificultad: str
    nivel_alcanzado: int
    modo: str = "campana"  # "campana" | "oleadas"


@app.post("/login")
def login(data: LoginData):
    cur = conn.cursor()
    # Buscar jugador
    cur.execute("SELECT id, nombre_usuario FROM jugadores WHERE nombre_usuario = ?", (data.nombre_usuario,))
    row = cur.fetchone()

    if not row:
        cur.execute("INSERT INTO jugadores (nombre_usuario) VALUES (?)", (data.nombre_usuario,))
        jugador_id = cur.lastrowid
        nombre = data.nombre_usuario
        # Iniciar progreso de campaña para el nuevo usuario
        cur.execute("INSERT INTO progreso_campana (jugador_id, nivel_actual) VALUES (?, 1)", (jugador_id,))
    else:
        jugador_id = row["id"]
        nombre = row["nombre_usuario"]

    conn.commit()
    return {"jugador": {"id": jugador_id, "nombre_usuario": nombre}}


@app.post("/partida")
def guardar_partida(data: PartidaData):
    modo = data.modo if data.modo in MODOS_VALIDOS else "campana"
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO partidas (jugador_id, puntuacion, dificultad, nivel_alcanzado, modo, finalizada)
        VALUES (?, ?, ?, ?, ?, 1)
    ''', (data.jugador_id, data.puntuacion, data.dificultad, data.nivel_alcanzado, modo))
    conn.commit()
    return {"status": "Guardado exitoso"}


@app.get("/ranking")
def obtener_ranking(modo: Optional[str] = None):
    """Top 10 por puntuación máxima. Con ?modo=campana u ?modo=oleadas filtra por modo de juego."""
    cur = conn.cursor()
    filtro = ""
    params = []
    if modo in MODOS_VALIDOS:
        filtro = "WHERE p.modo = ?"
        params.append(modo)

    cur.execute(f'''
        SELECT j.nombre_usuario as nombre, MAX(p.puntuacion) as max_puntos
        FROM jugadores j
        JOIN partidas p ON j.id = p.jugador_id
        {filtro}
        GROUP BY j.id
        ORDER BY max_puntos DESC
        LIMIT 10
    ''', params)
    resultados = [{"nombre": r["nombre"], "puntos": r["max_puntos"]} for r in cur.fetchall()]
    return resultados


# --- ENDPOINTS PARA LA CAMPAÑA ---

@app.get("/campaign/level/{nivel_id}")
def obtener_nivel(nivel_id: int):
    cur = conn.cursor()
    cur.execute('''
        SELECT mapa_json, max_enemigos, prob_spawn, nombre, tema, objetivo
        FROM niveles WHERE nivel_id = ?
    ''', (nivel_id,))
    row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Nivel no encontrado o campaña completada")

    cur.execute("SELECT COUNT(*) FROM niveles")
    total_niveles = cur.fetchone()[0]

    # Decodificamos el JSON guardado en la BD
    mapa_layout = json.loads(row["mapa_json"])

    return {
        "level": nivel_id,
        "name": row["nombre"] or f"NIVEL {nivel_id}",
        "theme": row["tema"] or "pradera",
        "total_levels": total_niveles,
        "map_layout": mapa_layout,
        "difficulty": {
            "max_enemies": row["max_enemigos"],
            "spawn_rate": row["prob_spawn"],
            "objective": row["objetivo"] or 10
        }
    }


@app.post("/campaign/advance/{jugador_id}")
def avanzar_nivel(jugador_id: int):
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM niveles")
    total_niveles = cur.fetchone()[0]

    # Aumentar en 1 el nivel del jugador (sin pasarse del último nivel existente)
    cur.execute('''
        UPDATE progreso_campana
        SET nivel_actual = MIN(nivel_actual + 1, ?)
        WHERE jugador_id = ?
    ''', (total_niveles, jugador_id))

    if cur.rowcount == 0:
        # Si por alguna razón no existía su registro, lo creamos en nivel 2
        cur.execute("INSERT INTO progreso_campana (jugador_id, nivel_actual) VALUES (?, 2)", (jugador_id,))

    conn.commit()
    return {"status": "Progreso actualizado"}
