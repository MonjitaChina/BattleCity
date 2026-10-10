class JugadorRepository:
    def __init__(self, db_connection):
        self.conn = db_connection.connect()

    def get_or_create(self, nombre_usuario: str):
        cursor = self.conn.cursor()
        cursor.execute("SELECT id, nombre_usuario FROM jugadores WHERE nombre_usuario = ?", (nombre_usuario,))
        jugador = cursor.fetchone()
        
        if jugador:
            return {"id": jugador[0], "nombre_usuario": jugador[1]}
        
        cursor.execute("INSERT INTO jugadores (nombre_usuario) VALUES (?)", (nombre_usuario,))
        self.conn.commit()
        return {"id": cursor.lastrowid, "nombre_usuario": nombre_usuario}

class PartidaRepository:
    def __init__(self, db_connection):
        self.conn = db_connection.connect()

    def guardar_partida(self, jugador_id: int, puntuacion: int, nivel: int, dificultad: str):
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO partidas (jugador_id, puntuacion, nivel_alcanzado, dificultad, finalizada)
            VALUES (?, ?, ?, ?, 1)
        ''', (jugador_id, puntuacion, nivel, dificultad))
        self.conn.commit()
        return cursor.lastrowid