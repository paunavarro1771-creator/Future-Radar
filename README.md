# Future Radar FC

Plataforma de scouting y seguimiento de talento joven.

## Estadísticas de partidos de UEFA Youth League

La ficha de cada partido consulta el endpoint seguro `/api/youth-match-stats`. La clave del proveedor nunca se expone al navegador.

### Configuración en Vercel

1. Crear una cuenta de API en [FootyStats](https://footystats.org/api).
2. Elegir la competición **UEFA Youth League** para la temporada **2026/27** dentro de la configuración de ligas de la cuenta.
3. En Vercel, abrir **Project → Settings → Environment Variables**.
4. Añadir `FOOTYSTATS_API_KEY` con la clave privada de la cuenta.
5. Guardar y volver a desplegar la web.

Opcionalmente, añadir `FOOTYSTATS_SEASON_ID` si se quiere fijar manualmente el ID de temporada de FootyStats. Si no se define, la función intenta localizar la temporada 2026/27 entre las ligas activadas en la cuenta.

**Importante:** la API de FootyStats no ofrece datos en directo. Sus estadísticas suelen estar disponibles después del partido (habitualmente dentro de unos 20 minutos), y la cobertura de cada campo puede variar según el encuentro. La aplicación muestra únicamente los datos que devuelve el proveedor; no inventa valores ni rellena campos ausentes.

El plan gratuito de FootyStats está limitado a Premier League de temporadas antiguas. Para UEFA Youth League hay que comprobar el plan y activar esa competición; los planes y precios pueden cambiar.
