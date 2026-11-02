# KiroChaos 3D

Simulador de Resiliencia de Internet Planetario y Despacho Espacial en AWS desarrollado para el AWS Builder Center Spatial Challenge.

[English](README.md) | [Versión en Español](README.es.md)

URL de Producción: [https://dmioezmtwljpo.cloudfront.net](https://dmioezmtwljpo.cloudfront.net)  
API de Incidentes en Vivo: [https://u81plwceve.execute-api.us-east-2.amazonaws.com](https://u81plwceve.execute-api.us-east-2.amazonaws.com)

---

## Descripción General

Los cables de fibra óptica submarinos y las troncales terrestres transportan más del 95 por ciento del tráfico internacional de internet. Los cortes físicos provocados por actividad sísmica, anclas de embarcaciones y fallas de infraestructura exigen un desvío de tráfico inmediato y la movilización de cuadrillas de reparación.

KiroChaos 3D modela esta infraestructura crítica en un entorno interactivo 3D WebGL. Simula rupturas físicas de fibra y movimientos sísmicos, calcula conmutaciones BGP Dijkstra en tiempo real y coordina el despacho multimodal de reparación mediante Amazon Location Service, AWS Lambda, Amazon DynamoDB y Apache Iceberg sobre Amazon S3. Toda la infraestructura en la nube opera dentro de los límites de la capa Always Free Tier de AWS ($0.00 USD de costo total).

---

## Arquitectura en AWS

La aplicación implementa ocho servicios de AWS organizados en capas de ejecución espacial, persistencia y entrega de contenido.

```
                           +------------------------+
                           |  Navegador del Cliente |
                           +-----------+------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
        +---------------------+                 +---------------------+
        |  Amazon CloudFront  |                 | Amazon API Gateway  |
        |  (Global Edge CDN)  |                 |     (HTTP API)      |
        +----------+----------+                 +----------+----------+
                   |                                       |
                   v                                       v
        +---------------------+                 +---------------------+
        |      Amazon S3      |                 |     AWS Lambda      |
        |  (Hosting Frontend) |                 |   (Chaos Logger)    |
        +---------------------+                 +-----+---------+-----+
                                                      |         |
                                                      v         v
                                            +-----------+     +------------+
                                            | DynamoDB  |     |  Bedrock   |
                                            | (Storage) |     | Nova-Micro |
                                            +-----------+     +------------+

   +-----------------------------------------------------------------------+
   |                    Capa Espacial y Data Lakehouse                     |
   |                                                                       |
   |  Amazon Location Service:                                             |
   |    - Place Index (KiroNocPlaceIndex) -> Geocodificación Inversa       |
   |    - Route Calculator (KiroNocRouteCalculator) -> Desvíos Viales      |
   |                                                                       |
   |  Amazon S3 + AWS Glue + Amazon Athena:                                |
   |    - Tablas Iceberg (s3://kirochaos-telemetry-*)                      |
   |    - Base de Datos: kiro_spatial_db                                   |
   +-----------------------------------------------------------------------+
```

### Servicios Desplegados

1. **Amazon Location Service:**
   - Place Index (`KiroNocPlaceIndex`): Geocodifica las coordenadas del corte para identificar la municipalidad y el país más cercanos.
   - Route Calculator (`KiroNocRouteCalculator`): Calcula rutas de emergencia para camiones de reparación desde el depósito más próximo hacia el punto de ruptura, trazando desvíos viales alrededor de zonas de peligro.
   - API Key (`KiroNocWebKey`): Credencial acotada con permisos de solo lectura para geocodificación y cálculo de rutas.
2. **Amazon CloudFront:**
   - Distribución `E139QIZAFN8Z17` que entrega los activos de la aplicación web sobre HTTPS con TLS 1.3, compresión y redirección de rutas SPA (errores 403 y 404 dirigidos a `index.html`).
3. **Amazon S3:**
   - Bucket de frontend (`kirochaos-frontend-*`) con bloqueo de acceso público y Origin Access Control (OAC).
   - Bucket de telemetría (`kirochaos-telemetry-*`) que almacena la topología GeoJSON global y las particiones Apache Iceberg.
4. **Amazon API Gateway:**
   - HTTP API (`kirochaos-api`) para la ingesta de eventos de caos con baja latencia y CORS habilitado.
5. **AWS Lambda:**
   - Función en Node.js 20.x (`kirochaos-incident-logger`) para registrar incidentes en DynamoDB y generar reportes de diagnóstico.
6. **Amazon DynamoDB:**
   - Tabla `kirochaos-incidents` en modo On-Demand (`PAY_PER_REQUEST`) para almacenar identificadores de incidente, cables afectados, métricas de latencia y coordenadas de despacho.
7. **AWS Glue Data Catalog:**
   - Base de datos `kiro_spatial_db` que registra los esquemas de tablas Apache Iceberg alojadas en S3.
8. **Amazon Bedrock:**
   - Generación de resúmenes de incidentes SRE con formato basado en el modelo `amazon.nova-micro-v1:0`.

---

## Capacidades Técnicas

- **Globo 3D Vectorial Procedural:** Desarrollado con la proyección de globo de MapLibre GL JS v6 y Three.js. Integra capas de elevación ráster DEM Terrarium desde AWS S3 para renderizar el relieve montañoso en 3D.
- **Motor de Grafos BGP Dijkstra:** Algoritmo que recalcula en tiempo real las rutas más cortas, la secuencia de saltos y el incremento de latencia cuando un enlace se interrumpe.
- **Despacho Multimodal de Campo:**
  - En cortes terrestres, el punto se ajusta a la geometría exacta del cable, se identifica el depósito más cercano por distancia geodésica y se traza la ruta vial del camión de reparación esquivando el área de peligro.
  - En cortes submarinos, se coordina el personal de la estación de amarre en tierra y el buque cablero CS-Kiro para desplegar unidades ROV de empalme óptico en altamar.
- **Consultas Espaciales en Data Lakehouse:** Interfaz de Amazon Athena para ejecutar consultas SQL `ST_Intersects` sobre archivos Parquet con Apache Iceberg.
- **Modo Portada (Cover Mode):** Ocultamiento de la interfaz (`tecla H`) para capturas de pantalla limpias de 1200x675 con tipografía Orbitron y renderizado 3D continuo.

---

## Estructura del Repositorio

```
kirochaos-3d/
├── aws-pipeline/
│   ├── 01_create_iceberg_tables.sql       # DDL de Athena para tablas Iceberg
│   ├── 02_export_topology_query.sql       # Consultas espaciales de exportación
│   ├── lambda_chaos_logger.mjs            # Manejador de la función Lambda
│   ├── spatial_iceberg_etl.ipynb          # Cuaderno Jupyter para ETL de Iceberg
│   ├── README_AWS_SETUP.md                # Guía de referencia de despliegue
│   └── *.template.json                    # Plantillas de políticas y configuración
├── public/
│   ├── data/
│   │   └── network_topology.geojson       # Topología de cables y nodos
│   └── kiros_escondite.webp               # Icono de marca de Kiro
├── src/
│   ├── components/
│   │   ├── TopHudBar.tsx                  # Barra de estado superior y navegación
│   │   ├── ChaosControlDeck.tsx           # Panel de escenarios y trazador de ping
│   │   ├── GlobeMapCanvas.tsx             # Globo 3D en MapLibre y capas de rutas
│   │   ├── GiantKiroStage.tsx             # Mascota 3D en Three.js y animación de sismos
│   │   ├── AwsTelemetryDrawer.tsx         # Panel de telemetría con pestañas de AWS
│   │   ├── ArchitectureModal.tsx          # Diagrama de arquitectura de AWS
│   │   └── CoverShowcaseBadge.tsx         # Distintivo visual del modo portada
│   ├── services/
│   │   ├── awsLocationClient.ts           # Integración con el SDK de Location Service
│   │   ├── networkGraphEngine.ts          # Implementación del algoritmo de grafos Dijkstra
│   │   └── soundEffects.ts                # Sintetizador procedural con Web Audio API
│   ├── types/
│   │   └── spatial.ts                     # Definiciones de tipos en TypeScript
│   ├── App.tsx                            # Coordinador de estado principal
│   ├── main.tsx                           # Punto de entrada
│   └── index.css                          # Estilos y animaciones CSS
├── .env.example                           # Plantilla de variables de entorno
├── package.json
└── vite.config.ts
```

---

## Ejecución en Entorno Local

### Requisitos Previos

- Node.js 18+ o Bun 1.0+
- Navegador moderno con soporte para WebGL

### Pasos de Instalación

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/Marce0c0/kirochaos-3D.git
   cd kirochaos-3D
   ```

2. Instalar dependencias:
   ```bash
   bun install
   # o: npm install
   ```

3. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   ```
   La aplicación funciona en modo de simulación completa sin necesidad de credenciales de AWS.

4. Iniciar el servidor de desarrollo:
   ```bash
   bun run dev
   # o: npm run dev
   ```

5. Abrir `http://localhost:5173` en el navegador.

---

## Uso de la Capa Gratuita (Free Tier)

Todos los servicios implementados se encuentran cubiertos por la capa Always Free Tier o Free Tier de 12 meses de AWS:

- Amazon Location Service: Hasta 10,000 cálculos de ruta y solicitudes de geocodificación gratuitas al mes.
- Amazon CloudFront: 1 TB de transferencia de datos de salida y 10,000,000 de solicitudes gratuitas al mes.
- Amazon S3: 5 GB de almacenamiento estándar en la capa de 12 meses.
- AWS Lambda: 1,000,000 de invocaciones y 3,200,000 segundos de cómputo gratuitos al mes.
- Amazon DynamoDB: 25 GB de almacenamiento y costo cero en modo on-demand inactivo.
- Amazon API Gateway: 1,000,000 de llamadas a HTTP API gratuitas al mes.
- AWS Glue Data Catalog: 1,000,000 de objetos y solicitudes gratuitas al mes.

---

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

