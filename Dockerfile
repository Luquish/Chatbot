# Usa una imagen base de Node.js
FROM node:18-alpine

# Instala pnpm
RUN npm install -g pnpm

# Configura el directorio de trabajo en el contenedor
WORKDIR /app

# Copia el package.json y el pnpm-lock.yaml
COPY package*.json ./

# Instala las dependencias
RUN pnpm install

# Copia el resto de los archivos de la aplicación
COPY . .

# Expone el puerto que usa la aplicación
EXPOSE 3000

# Ejecuta la función de procesamiento de PDFs si la variable de entorno PROCESS_PDFS está establecida a true
RUN if [ "$PROCESS_PDFS" = "true" ]; then npm run process-pdfs-only; fi

# Comando para iniciar la aplicación
CMD ["npm", "run", "dev"]
