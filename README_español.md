# Vercel AI SDK RAG Guide Starter Project

Este es la guia para el proyecto de [Generación Aumentada por Recuperación (RAG)](https://sdk.vercel.ai/docs/guides/rag-chatbot) del SDK de Vercel AI.

En este proyecto, se creará un chatbot que responderá únicamente con información que se encuentre dentro de su base de conocimiento. El chatbot podrá tanto almacenar como recuperar información. Este proyecto ofrece numerosos casos de uso interesantes, desde soporte al cliente hasta la creación de tu propio "segundo cerebro".

En caso de seguir el instructivo y el mismo no sea sufiente para su funcionamiento o se necesiten claves particulares contactarse con: 
- lucamazza02@gmail.com 

## Tech Stack

El proyecto usa las siguientes tecnologias:

- [Next.js](https://nextjs.org) 14 (App Router)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [OpenAI](https://openai.com)
- [Drizzle ORM](https://orm.drizzle.team)
- [Postgres](https://www.postgresql.org/) with [pgvector](https://github.com/pgvector/pgvector)
- [shadcn-ui](https://ui.shadcn.com) and [TailwindCSS](https://tailwindcss.com) for styling

## Requistios previos a su uso

- Node.js 18+ instalado
- pnpm instalado (código para la terminal en caso de que no este instalado: `npm install -g pnpm`)
- PostgreSQL con las extensiones pgvector instaladas
- Una clave de la API de OpenAI 
- Credenciales de Google OAuth (para la autenticación)

## Para comenzar

1. Clonar el repositorio:
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. Instalar las dependencias:
   ```bash
   pnpm install
   ```

3. Setear las variables de entorno:
   ```bash
   cp .env.example .env
   ```
   Completar sus variables de entorno en `.env`:
   - `DATABASE_URL`: Su PostgreSQL connection string
   - `OPENAI_API_KEY`: Su OpenAI API key
   - `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`: Las credenciales de Google OAuth 

4. Inicializar su base de datos:
   ```bash
   pnpm db:generate   
   pnpm db:migrate    
   ```

5. Procesar su base de conocimiento:
   - Ubicar los  archivos PDF en `data/pdfs/`
   - Ubicar los archivos CSV en `data/csvs/`
   ```bash
   pnpm process-pdfs  
   pnpm process-csvs  
   ```

6. Inicia el servidor de desarrollo
   ```bash
   pnpm dev
   ```

## Scripts Disponibles

- `pnpm dev`: Inicia el servidor de desarrollo:
- `pnpm build`: Build para producción
- `pnpm start`: Inicia el production server
- `pnpm lint`: Corre linting
- `pnpm type-check`: Check TypeScript types
- `pnpm test`: Corre tests
- `pnpm db:generate`: Genera database schemas
- `pnpm db:migrate`: Corre migraciones en el database 
- `pnpm process-pdfs`: Procesa documentos PDF ubicados en data/pdfs/
- `pnpm process-csvs`: Proces documentos CSV  ubicados en data/csvs/

## Estructura del Proyecto 

```
.
├── app/                 # Next.js app directory
├── components/         # React components
├── lib/               # Core functionality
│   ├── actions/      # Database actions
│   ├── ai/           # AI-related functionality
│   ├── auth/         # Authentication
│   ├── db/           # Database configuration
│   └── utils/        # Utility functions
├── data/             # Data directory for PDFs and CSVs
│   ├── pdfs/        # PDF files for knowledge base
│   └── csvs/        # CSV files for knowledge base
└── extension/        # Browser extension files
```

## Features

- **RAG-powered Chatbot**: 
  - Responde utilizando información de tu base de conocimiento  
  - Admite conversaciones con conciencia de contexto  
  - Proporciona citas y fuentes relevantes  

- **Procesamiento de Documentos**:
  - Procesamiento de PDF con soporte OCR  
  - Integración de datos CSV  
  - Segmentación automática de texto y generación de incrustaciones  
  
- **Autenticación y Seguridad**:
  - Integración con Google OAuth  
  - Gestión segura de sesiones  
  - Control de acceso basado en roles  

- **Extensiones en el buscador**:
  - Accede al chatbot desde cualquier página web  
  - Búsqueda rápida de información  
  - Integración fluida con la aplicación principal  

- **Integración con el Calendario**:
  - Asistencia para la preparación de reuniones  
  - Conciencia del calendario  
  - Recordatorios proactivos de reuniones

- **Experiencia de Usuario**:
  - Diseño adaptable  
  - Soporte para modo oscuro  
  - Renderizado de Markdown  
  - Sistema de retroalimentación en tiempo real

## Directrices de Desarrollo

### Añadiendo a la Base de Conocimiento

1. **Documentos PDF**:
  - Coloca los archivos PDF en `data/pdfs/`  
  - Los archivos deben ser buscables por texto (se usará OCR como respaldo)  
  - Ejecuta `pnpm process-pdfs` para procesar los archivos nuevos

2. **CSV Data**:
  - Coloca los archivos CSV en `data/csvs/`  
  - Asegúrate de que los encabezados de las columnas sean correctos  
  - Ejecuta `pnpm process-csvs` para procesar los archivos nuevos

### Gestión de Base de Datos

  - Usa `pnpm db:generate` después de realizar cambios en el esquema  
  - Ejecuta `pnpm db:migrate` para aplicar las migraciones  
  - Realiza copias de seguridad de tu base de datos regularmente

### Variables de Entorno

Variables de Entorno necesarias (ejemplo): 

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
OPENAI_API_KEY="your-openai-api-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
```

## Configuración de la Extensión del Navegador

### Instalación

1. Construye la extensión:
   ```bash
   pnpm generate-icons  
   pnpm build-extension 
   ```

2. Carga la extensión en Chrome:  
  - Abre Chrome y navega a `chrome://extensions/`  
  - Habilita el modo "Desarrollador" en la parte superior derecha  
  - Haz clic en "Cargar descomprimida"  
  - Selecciona la carpeta `extension` desde tu directorio del proyecto

### Usar la Extensión

1. **Acceder al Chatbot**:
  - Haz clic en el icono de Onwy en la barra de herramientas de Chrome  
  - La interfaz del chatbot se abrirá en una ventana emergente

2. **Características**:
   - **Acceso Rápido**: Chatea con Onwy desde cualquier página web
   - **Integración con Calendar**: 
      - Haz clic en el icono del calendario para:  
       - Programar reuniones  
       - Verificar disponibilidad  
       - Obtener asistencia para la preparación de reuniones  
   - **Meeting Tools**:
      - Usa el menú de reuniones para:  
       - Programar nuevas reuniones  
       - Obtener ayuda con la preparación de reuniones  
   - **Course Information**:
      - Haz clic en el botón "Cursos" para consultas relacionadas con cursos  

3. **Asistencia Proactiva**:
  La extensión incluye un sistema inteligente que ofrecerá ayuda de manera proactiva:  
  - Recordatorios de reuniones  
  - Sugerencias de tareas  
  - Conciencia del calendario  
  - Consejos de productividad  

4. **Interface Elements**:
  - Campo de entrada de mensajes en la parte inferior  
  - Botón de enviar (o presiona Enter)  
  - Indicadores de carga para las respuestas  
  - Soporte para Markdown para formateo de texto enriquecido  
  - Soporte para modo oscuro para una visualización cómoda  

### Troubleshooting the Extension

1. **Extensiones que no Cargan**:
  - Verifica que la extensión esté habilitada en Chrome  
  - Asegúrate de que todos los archivos de la extensión estén correctamente construidos  
  - Intenta quitar y volver a agregar la extensión  

2. **Problemas de Conexión**:
  - Asegúrate de que la aplicación principal esté en ejecución  
  - Verifica tu conexión a Internet  
  - Verifica la configuración de CORS en `next.config.js`  

3. **Problemas de autenticación**:
  - Asegúrate de que hayas iniciado sesión en la aplicación principal  
  - Borra las cookies del navegador si experimentas problemas con la sesión  
  - Verifica que Google OAuth esté correctamente configurado  

### Notas de Seguridad

  - La extensión se comunica únicamente con tu instancia desplegada  
  - Todos los datos están cifrados durante la transmisión  
  - Los tokens de autenticación se almacenan de forma segura  
  - La extensión solicita solo los permisos necesarios  

## Contribución

1. Haz un fork del repositorio  
2. Crea tu rama de características (`git checkout -b feature/AmazingFeature`)  
3. Realiza el commit de tus cambios (`git commit -m 'Añadir AmazingFeature'`)  
4. Haz push a la rama (`git push origin feature/AmazingFeature`)  
5. Abre un Pull Request

## Troubleshooting

Problemas comunes y soluciones:

1. **Problemas de Conexión a la Base de Datos:**:
   - Verifica que PostgreSQL esté en ejecución
   - Revisa el formato de DATABASE_URL
   - Asegúrate de que la extensión pgvector esté instalado

2. **Errores en el Procesamiento de PDFs:**:
   - Verifica que los archivos PDF no estén corruptos
   - Revisa que las dependencias de OCR estén instaladas
   - Asegúrate de tener suficiente espacio en disco

3. **Problemas de Autenticación**:
   - Verifica las credenciales de Google OAuth
   - Revisa que NEXTAUTH_URL coincida con tu dominio
   - Asegúrate de que todas las variables de entorno requeridas estén configuradas
   
## Agradecimientos

- [Vercel AI SDK](https://sdk.vercel.ai/docs) team
- [OpenAI](https://openai.com) for their API
- All contributors who have helped shape this project