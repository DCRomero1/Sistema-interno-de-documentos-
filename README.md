# Sistema de Gestión Documentaria (Mesa de Partes)

Un sistema web local para la gestión, seguimiento y administración de documentos, usuarios y trabajadores.

## 📋 Requisitos Previos

- **Node.js** (Versión 18 o superior).
- **NPM** (Viene incluido con Node.js).
- **SQLite3** (La base de datos se crea automáticamente, no requiere instalación externa).

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

## 🛡️ Credenciales (Por Defecto)

El sistema viene con un usuario administrador preconfigurado si usas los scripts de inicio:

- **Usuario:** `diego`
- **Contraseña:** `1234`
- **Rol:** `admin` (Acceso total)

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
