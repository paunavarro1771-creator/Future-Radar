# API-Football: Mundial Sub-17 2026

Integración opcional del endpoint `/api/u17-world-cup-live`.

## Configuración en Vercel
1. Crear cuenta gratuita en https://dashboard.api-football.com/ (100 peticiones/día).
2. En el dashboard consultar `GET /leagues?search=World Cup U17`, identificar **la competición correcta de 2026** y confirmar `coverage.fixtures.statistics`, `coverage.fixtures.lineups`, `coverage.fixtures.events` y que la temporada 2026 está disponible en el plan gratuito.
3. Añadir las variables **solo en Vercel**, nunca en GitHub:
   - `API_FOOTBALL_KEY` = clave privada del dashboard
   - `API_FOOTBALL_U17_LEAGUE_ID` = ID confirmado de esa competición
4. Volver a desplegar. La web priorizará API-Football para los partidos cubiertos y mantendrá LiveScore como alternativa.

## Limitaciones
- La clave no se expone al navegador.
- El adaptador consulta fixtures por liga y temporada, estadísticas, alineaciones y eventos por fixture.
- La caché en memoria limita solicitudes (fixtures 60 minutos, alineaciones 60 minutos, otras 15 minutos), pero **Vercel puede crear múltiples instancias**; no garantiza cumplir el límite de 100/día con tráfico alto. Se recomienda caché persistente/cron centralizado antes de un despliegue público de alto tráfico.
- El plan gratuito puede limitar las temporadas disponibles. La cobertura real del torneo **no se ha confirmado** sin credenciales. La configuración no garantiza que todos los encuentros incluyan estadísticas.
- El refresco de la interfaz cada minuto no implica que el proveedor entregue nuevos datos cada minuto.
- Nunca insertar estadísticas o alineaciones ficticias.
