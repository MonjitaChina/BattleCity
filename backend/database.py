import sqlite3
from sqlite3 import Error
import json

# ---------------------------------------------------------------------------
# TIPOS DE CASILLA (mapas 13x13)
#   0 vacio | 1 ladrillo | 2 acero | 3 bosque (se cruza y oculta)
#   4 base  | 5 agua (bloquea tanques, no balas) | 6 hielo (el jugador patina)
#
# REGLAS PARA AGREGAR NIVELES NUEVOS:
#   - La base (4) va en la fila 12, columna 6, rodeada de ladrillos.
#   - Las casillas (0,0), (0,6) y (0,12) deben ser transitables: ahi aparecen los enemigos.
#   - La casilla (12,4) debe ser transitable: ahi aparece el jugador.
# ---------------------------------------------------------------------------
NIVELES_CAMPANA = [
    {
        "id": 1,
        "nombre": "PRADERA",
        "tema": "pradera",
        "objetivo": 10,      # enemigos a destruir para pasar de nivel
        "max_enemigos": 4,   # maximo de enemigos simultaneos en pantalla
        "prob_spawn": 0.015,    # probabilidad de aparicion por frame
        # Campo abierto con ladrillos: ideal para calentar.
        "mapa": [
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,1,1,0,1,1,0,1,1,0,1,1,0],
            [0,1,1,0,1,1,0,1,1,0,1,1,0],
            [0,1,1,0,0,0,0,0,0,0,1,1,0],
            [0,0,0,0,1,1,2,1,1,0,0,0,0],
            [3,3,0,0,0,0,0,0,0,0,0,3,3],
            [3,3,0,1,1,0,0,0,1,1,0,3,3],
            [0,0,0,1,0,0,2,0,0,1,0,0,0],
            [0,1,0,0,0,0,0,0,0,0,0,1,0],
            [0,1,0,1,1,0,0,0,1,1,0,1,0],
            [0,0,0,0,0,0,2,0,0,0,0,0,0],
            [0,1,1,0,0,1,1,1,0,0,1,1,0],
            [0,1,1,0,0,1,4,1,0,0,1,1,0]
        ],
    },
    {
        "id": 2,
        "nombre": "BOSQUE",
        "tema": "bosque",
        "objetivo": 14,      # enemigos a destruir para pasar de nivel
        "max_enemigos": 5,   # maximo de enemigos simultaneos en pantalla
        "prob_spawn": 0.02,    # probabilidad de aparicion por frame
        # Mucho bosque: los enemigos se esconden entre los arboles.
        "mapa": [
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,3,3,0,1,0,0,0,1,0,3,3,0],
            [0,3,3,0,1,0,3,0,1,0,3,3,0],
            [0,0,0,0,0,0,3,0,0,0,0,0,0],
            [3,3,0,1,1,0,0,0,1,1,0,3,3],
            [3,3,0,0,0,0,2,0,0,0,0,3,3],
            [0,0,0,1,0,3,3,3,0,1,0,0,0],
            [0,3,0,1,0,0,0,0,0,1,0,3,0],
            [0,3,0,0,0,1,1,1,0,0,0,3,0],
            [0,0,0,3,0,0,0,0,0,3,0,0,0],
            [1,1,0,3,0,1,2,1,0,3,0,1,1],
            [0,0,0,0,0,1,1,1,0,0,0,0,0],
            [0,0,0,0,0,1,4,1,0,0,0,0,0]
        ],
    },
    {
        "id": 3,
        "nombre": "RIO",
        "tema": "rio",
        "objetivo": 16,      # enemigos a destruir para pasar de nivel
        "max_enemigos": 6,   # maximo de enemigos simultaneos en pantalla
        "prob_spawn": 0.025,    # probabilidad de aparicion por frame
        # Rios con pocos puentes: el agua frena tanques pero no balas.
        "mapa": [
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,1,0,1,0,3,0,3,0,1,0,1,0],
            [0,1,0,1,0,3,0,3,0,1,0,1,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [5,5,5,0,5,5,5,5,5,0,5,5,5],
            [5,5,5,0,5,5,5,5,5,0,5,5,5],
            [0,0,0,0,0,1,0,1,0,0,0,0,0],
            [0,1,1,0,3,0,0,0,3,0,1,1,0],
            [0,0,0,0,0,0,2,0,0,0,0,0,0],
            [5,5,0,5,5,0,0,0,5,5,0,5,5],
            [5,5,0,5,5,0,1,0,5,5,0,5,5],
            [0,0,0,0,0,1,1,1,0,0,0,0,0],
            [0,0,0,0,0,1,4,1,0,0,0,0,0]
        ],
    },
    {
        "id": 4,
        "nombre": "TUNDRA",
        "tema": "tundra",
        "objetivo": 20,      # enemigos a destruir para pasar de nivel
        "max_enemigos": 6,   # maximo de enemigos simultaneos en pantalla
        "prob_spawn": 0.03,    # probabilidad de aparicion por frame
        # Suelo helado: tu tanque patina al soltar las teclas.
        "mapa": [
            [0,6,6,6,6,6,0,6,6,6,6,6,0],
            [6,2,2,6,1,1,6,1,1,6,2,2,6],
            [6,2,2,6,1,1,6,1,1,6,2,2,6],
            [6,6,6,6,6,6,6,6,6,6,6,6,6],
            [0,1,1,0,0,2,2,2,0,0,1,1,0],
            [0,0,0,0,6,6,6,6,6,0,0,0,0],
            [2,2,0,1,6,0,0,0,6,1,0,2,2],
            [0,0,0,1,6,0,2,0,6,1,0,0,0],
            [6,6,6,6,6,6,6,6,6,6,6,6,6],
            [6,1,1,6,1,0,0,0,1,6,1,1,6],
            [6,6,6,6,0,0,2,0,0,6,6,6,6],
            [0,1,0,0,0,1,1,1,0,0,0,1,0],
            [0,1,0,0,0,1,4,1,0,0,0,1,0]
        ],
    },
    {
        "id": 5,
        "nombre": "DESIERTO",
        "tema": "desierto",
        "objetivo": 25,      # enemigos a destruir para pasar de nivel
        "max_enemigos": 7,   # maximo de enemigos simultaneos en pantalla
        "prob_spawn": 0.035,    # probabilidad de aparicion por frame
        # Fortaleza de acero con oasis: el nivel final, el mas duro.
        "mapa": [
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,2,0,1,1,0,0,0,1,1,0,2,0],
            [0,2,0,0,0,0,2,0,0,0,0,2,0],
            [0,0,0,1,0,2,2,2,0,1,0,0,0],
            [1,1,0,1,0,0,0,0,0,1,0,1,1],
            [0,0,0,0,0,1,5,1,0,0,0,0,0],
            [2,0,1,1,0,5,5,5,0,1,1,0,2],
            [0,0,0,0,0,1,5,1,0,0,0,0,0],
            [1,1,0,1,0,0,0,0,0,1,0,1,1],
            [0,0,0,1,0,3,0,3,0,1,0,0,0],
            [0,2,0,0,0,0,0,0,0,0,0,2,0],
            [0,2,0,1,0,1,1,1,0,1,0,2,0],
            [0,0,0,1,0,1,4,1,0,1,0,0,0]
        ],
    },
]


class DatabaseConnection:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabaseConnection, cls).__new__(cls)
            cls._instance.connection = None
        return cls._instance

    def connect(self):
        if self.connection is None:
            try:
                self.connection = sqlite3.connect("battle_city.db", check_same_thread=False)
                # row_factory permite acceder a las columnas por nombre como si fueran diccionarios
                self.connection.row_factory = sqlite3.Row
                self.create_tables()
            except Error as e:
                print(f"Error BD: {e}")
        return self.connection

    def create_tables(self):
        cursor = self.connection.cursor()

        # Tablas originales
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS jugadores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_usuario VARCHAR(50) UNIQUE NOT NULL,
            fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            avatar_url VARCHAR(255)
        )''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS partidas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            jugador_id INTEGER,
            puntuacion INTEGER NOT NULL DEFAULT 0,
            nivel_alcanzado INTEGER DEFAULT 1,
            duracion_segundos INTEGER,
            dificultad VARCHAR(20) DEFAULT 'medio',
            fecha_partida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            finalizada BOOLEAN DEFAULT FALSE,
            modo VARCHAR(20) DEFAULT 'campana',
            FOREIGN KEY(jugador_id) REFERENCES jugadores(id)
        )''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS configuraciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            jugador_id INTEGER,
            dificultad_preferida VARCHAR(20) DEFAULT 'medio',
            sonido_activo BOOLEAN DEFAULT TRUE,
            controles_personalizados TEXT,
            FOREIGN KEY(jugador_id) REFERENCES jugadores(id)
        )''')

        # Tablas de la campana
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS niveles (
            nivel_id INTEGER PRIMARY KEY,
            mapa_json TEXT NOT NULL,
            max_enemigos INTEGER NOT NULL,
            prob_spawn REAL NOT NULL,
            nombre TEXT DEFAULT '',
            tema TEXT DEFAULT 'pradera',
            objetivo INTEGER DEFAULT 10
        )''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS progreso_campana (
            jugador_id INTEGER PRIMARY KEY,
            nivel_actual INTEGER DEFAULT 1,
            FOREIGN KEY(jugador_id) REFERENCES jugadores(id)
        )''')

        self.connection.commit()
        self._migrar_esquema(cursor)
        self._seed_levels(cursor)

    def _columnas(self, cursor, tabla):
        cursor.execute(f"PRAGMA table_info({tabla})")
        return [fila[1] for fila in cursor.fetchall()]

    def _migrar_esquema(self, cursor):
        """Agrega las columnas nuevas a bases de datos creadas con versiones anteriores."""
        cols_niveles = self._columnas(cursor, "niveles")
        if "nombre" not in cols_niveles:
            cursor.execute("ALTER TABLE niveles ADD COLUMN nombre TEXT DEFAULT ''")
        if "tema" not in cols_niveles:
            cursor.execute("ALTER TABLE niveles ADD COLUMN tema TEXT DEFAULT 'pradera'")
        if "objetivo" not in cols_niveles:
            cursor.execute("ALTER TABLE niveles ADD COLUMN objetivo INTEGER DEFAULT 10")

        if "modo" not in self._columnas(cursor, "partidas"):
            cursor.execute("ALTER TABLE partidas ADD COLUMN modo VARCHAR(20) DEFAULT 'campana'")

        self.connection.commit()

    def _seed_levels(self, cursor):
        """Inserta o actualiza los niveles de la campana en cada arranque.

        Se usa INSERT OR REPLACE (y no 'solo si esta vacia') para que las bases de datos
        antiguas, que ya tenian 2 niveles, reciban los nuevos mapas y escenarios.
        """
        filas = [
            (
                n["id"], json.dumps(n["mapa"]), n["max_enemigos"], n["prob_spawn"],
                n["nombre"], n["tema"], n["objetivo"],
            )
            for n in NIVELES_CAMPANA
        ]
        cursor.executemany(
            '''INSERT OR REPLACE INTO niveles
               (nivel_id, mapa_json, max_enemigos, prob_spawn, nombre, tema, objetivo)
               VALUES (?, ?, ?, ?, ?, ?, ?)''',
            filas,
        )
        self.connection.commit()


db_instance = DatabaseConnection()
