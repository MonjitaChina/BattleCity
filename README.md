# BattleCity

# Descripción del proyecto

Battle City v3 es un clon web del clásico juego de tanques, en vista cenital y dibujado sobre un <canvas> de 520×520 px con mapas de 13×13 casillas. Permite jugar con nombre de usuario y elegir modo y dificultad (baja, media o alta).

Campaña: 5 niveles con escenarios distintos (Pradera, Bosque, Río, Tundra y Desierto). Cada uno tiene su mapa, su objetivo de enemigos y su dificultad, y los carga el backend desde la base de datos. Hay que defender una base; el nivel de hielo hace patinar el tanque y el agua frena a los tanques pero no a las balas.
Oleadas: modo sin base, con oleadas infinitas, arenas que cambian cada 3 oleadas y una oleada especial de blindados cada 5. Gana quien consiga más puntos.
Enemigos y power-ups: hay tres tipos de enemigo (básico, rápido y blindado, que aguanta 2 impactos). Los power-ups son bomba, casco y vida. La IA enemiga usa búsqueda BFS para acercarse al jugador.
Extras: hay sistema de combos, bonus por superar un nivel sin daño, efectos de partículas y sacudida de pantalla, y música y efectos de sonido.
Persistencia: el backend guarda jugadores, partidas, progreso de campaña y un ranking Top 10 filtrable por modo.
Stack tecnológico
Capa	Tecnología
Frontend	HTML5, CSS y JavaScript sin frameworks, con Canvas 2D y la fuente Press Start 2P (Google Fonts)
Backend	Python con FastAPI 0.143, Uvicorn 0.54 y Pydantic 2.14
Base de datos	SQLite (battle_city.db) con el módulo estándar sqlite3
Comunicación	API REST con JSON, con CORS abierto (*)

El código usa tres patrones: Singleton (DatabaseConnection), Factory (EnemyFactory) y Observer (GestorPuntuacion, que actualiza el HUD).

# Arquitectura

El frontend es estático y habla con el backend solo mediante fetch. Los endpoints son:

POST /login
POST /partida
GET /ranking?modo=
GET /campaign/level/{id}
POST /campaign/advance/{jugador_id}

database.py crea las tablas (jugadores, partidas, configuraciones, niveles y progreso_campana), migra el esquema si hace falta y siembra los 5 niveles en cada arranque. repository.py no lo importa nadie, así que hoy es código sin uso.

# Instalación y ejecución

El proyecto no trae README ni requirements.txt. Las versiones salen del entorno virtual incluido en el RAR, que es de Windows (Python 3.12), así que no sirve en otros sistemas y conviene crear uno nuevo.

Requisitos: Python 3.12 o superior y un navegador moderno. Para la fuente de Google hace falta internet.

1. Backend

bash
cd "battle city\backend"
uvicorn main:app --host 127.0.0.1 --port 8000

Hay que lanzarlo desde la carpeta backend, porque battle_city.db se crea y se lee con ruta relativa. La API queda en http://127.0.0.1:8000, con documentación automática en /docs.

Luego Abrir Index.HTML con un servidor local (live server en visual studio)

3. Jugar: escribe tu nombre, elige modo y dificultad y pulsa START. Se mueve con WASD o las flechas y se dispara con ESPACIO.

El puerto del backend está fijo en game.js (const API_URL = "http://127.0.0.1:8000"). Si lo cambias, edita esa línea.
