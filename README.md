# 🏆 Torneo Familiar — Mundial 2026

App de prode familiar para el Mundial FIFA 2026. Sistema de puntos por partido con detección automática del no favorito vía ranking FIFA.

## Setup (10 minutos)

### 1. Supabase (base de datos gratis)

1. Ir a [supabase.com](https://supabase.com) → crear cuenta → New Project
2. Esperar que se cree (~2 min)
3. Ir a **SQL Editor** → pegar el contenido de `supabase-schema.sql` → Run
4. Ir a **Settings → API** → copiar:
   - `Project URL` → va en `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → va en `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Variables de entorno

Editar `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. Deploy en Vercel (gratis)

1. Subir este proyecto a GitHub
2. Ir a [vercel.com](https://vercel.com) → Import → elegir el repo
3. En **Environment Variables** agregar las dos variables de arriba
4. Deploy → listo ✓

### 4. Correr localmente

```bash
npm install
npm run dev
```

---

## Cómo usar

### Admin (`/admin`)
- **Jugadores**: agrega a cada participante del torneo
- **Partidos**: carga los partidos. El sistema consulta el ranking FIFA y define automáticamente el no favorito
- **Resultados**: ingresa el resultado real de cada partido → calcula puntos automáticamente
- **Apuestas globales**: al final del mundial, ingresa campeón, goleador, arquero y MVP para resolver esas apuestas
- **Puntos**: configura todos los valores del sistema de puntos

### Jugadores (`/jugador`)
- Cada persona selecciona su nombre
- Hace sus predicciones por partido (quién gana + marcador exacto opcional)
- Hace sus apuestas globales antes del torneo
- Ve sus puntos acumulados

### Tabla (`/`)
- Posiciones en tiempo real
- Detalle de cada partido jugado

---

## Sistema de puntos (por defecto)

| Situación | Favorito | No favorito ⚡ |
|-----------|----------|----------------|
| Marcador exacto | 5 pts | 10 pts |
| Ganador correcto | 2 pts | 5 pts |
| Empate exacto | 5 pts | 8 pts |
| Empate correcto | 2 pts | 4 pts |

| Apuesta global | Puntos |
|----------------|--------|
| Campeón del mundo | 20 pts |
| Goleador del torneo | 15 pts |
| Mejor arquero | 10 pts |
| Balón de Oro | 10 pts |

El no favorito se determina automáticamente por el ranking FIFA: el equipo con **peor posición en el ranking** es el no favorito.

---

## Ranking FIFA

El ranking está hardcodeado en `lib/fifa.ts` basado en la actualización oficial de abril 2026. La próxima actualización es el 11 de junio (día del Mundial). Se puede actualizar manualmente antes del torneo si cambia.
