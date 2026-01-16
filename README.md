# Sistema de Gestión Documentaria (Mesa de Partes)

Un sistema web local para la gestión, seguimiento y administración de documentos, usuarios y trabajadores.

## 📋 Requisitos Previos

- **Node.js** (Versión 18 o superior). [Descargar aquí](https://nodejs.org/es/).
- **NPM** (Viene incluido con Node.js).
- **Internet** (Solo para la instalación inicial de librerías).

---

## 💻 Guía Para Instalar en Otra PC (Paso a Paso)

Si deseas llevar este sistema a otra computadora (por ejemplo, la del cliente o secretaría), sigue estos 4 pasos exactos:

### 1. Preparar la PC Destino
Descarga e instala **Node.js (Versión LTS)** en la nueva computadora desde [nodejs.org](https://nodejs.org/es/). Instálalo con todas las opciones por defecto (Next > Next > Finish).

### 2. Copiar los Archivos
Copia toda la carpeta de tu proyecto (Ej. `Reportes`) a la nueva computadora (Mis Documentos, Escritorio, etc.).
> **Nota:** No es necesario copiar la carpeta `node_modules` si la vas a regenerar, pero asegúrate de copiar `package.json`, `src/`, `public/`, `views/` y `scripts/`.

### 3. Instalar las Librerías
1. Abre la carpeta del proyecto en la nueva PC.
2. Haz clic derecho en un espacio vacío -> **"Abrir en Terminal"** (o escribe `cmd` en la barra de direcciones).
3. Escribe el siguiente comando y presiona Enter (requiere internet):
   ```bash
   npm install
   ```
   *Esto descargará `sqlite3`, `express` y todo lo necesario automáticamente.*

### 4. Iniciar el Sistema
Una vez termine la instalación, escribe:
   ```bash
   npm start
   ```
   Listo, el sistema abrirá en la dirección local (generalmente mostrada en la consola, ej. `http://localhost:3000`).

---

## 🚀 Instalación y Configuración

### 1. Clonar o Descargar
Descarga el código fuente en tu carpeta de proyectos (Ej. `C:\Proyectos\Reportes`).

### 2. Instalar Dependencias
Abre una terminal en la carpeta del proyecto y ejecuta:
```bash
npm install
```
*Si estás en Windows y tienes problemas, puedes usar el archivo `INSTALAR_DEPENDENCIAS.bat` (doble clic).*

### 3. Configuración de Entorno (.env)
El sistema requiere un archivo `.env` en la raíz para las claves de seguridad. Se crea uno automáticamente con valores por defecto, o puedes crearlo tú mismo:

`Archivo: .env`
```env
SESSION_SECRET=clave-super-secreta-cambiar-en-produccion
MASTER_KEY=vigil2026
NODE_ENV=development
```

---

## 🏃‍♂️ Ejecución

Para iniciar el servidor, abre la terminal y ejecuta:
```bash
npm start
```
El sistema estará disponible en: **http://localhost:3000**


*Alternativamente, usa el archivo `INICIAR_SISTEMA.bat` para un arranque rápido.*

---

## 🛠️ Herramientas y Scripts (Base de Datos)

En la carpeta `scripts/` encontrarás utilidades para gestionar la base de datos sin tocar código:

### Ingesta de Datos (Relleno)
- **`node scripts/bulk_insert_documents.js`**: Crea 1000 documentos de prueba automáticamente.
- **`node scripts/seed_workers.js`**: Rellena la tabla de trabajadores con datos falsos.
- **`node scripts/seed_users.js`**: Crea usuarios por defecto.

### Mantenimiento y Consultas
- **`node scripts/consultar_datos.js`**: Muestra una tabla en consola con todos los documentos y usuarios.
- **`node scripts/limpiar_duplicados.js`**: Elimina registros duplicados en el historial.
- **`node scripts/sql_shell.js`**: Abre una consola SQL interactiva para ejecutar comandos directos (`SELECT`, `DELETE`, etc.).

### Recuperación
- **`node scripts/reset_password.js`**: Restablece la contraseña de `diego` a `1234` en caso de emergencia.

---

## 🔐 Seguridad Implementada

- **Protección XSS**: Todos los inputs están sanitizados para evitar inyección de código.
- **Sesiones Seguras**: Cookies HTTPOnly.
- **Roles**: Sistema de roles (`admin`, `user`) para restringir el acceso a la gestión de usuarios.
- **Encriptación**: Contraseñas almacenadas con Hash (Bcrypt).
