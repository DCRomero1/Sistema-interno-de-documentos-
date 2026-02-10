# Sistema de Gestión Documentaria (Mesa de Partes)

Sistema web completo para la **gestión, seguimiento y administración de documentos** (Mesa de Partes Virtual/Local), incluyendo gestión de usuarios, trabajadores y reportes.

---

## 📋 Requisitos Previos

Para ejecutar este sistema necesitas instalar:

1.  **Node.js** (Versión 18 o superior recomedado).
    *   [Descargar Node.js](https://nodejs.org/es/)
2.  **Git** (Opcional, para clonar el repositorio).
3.  **Navegador Web** (Chrome, Edge, Firefox).

---

## 🚀 Instalación Paso a Paso

### 1. Obtener el Proyecto
Si tienes el código comprimido, descomprímelo. Si usas Git:
```bash
git clone <url-del-repo>
cd Reportes
```

### 2. Instalar Dependencias
Abre una terminal en la carpeta raíz del proyecto y ejecuta:
```bash
npm install
```
*Esto instalará automáticamente todas las librerías necesarias (`express`, `sqlite3`, `bcrypt`, etc.).*

### 3. Configuración Inicial (.env)
El sistema incluye configuración por defecto, pero para mayor seguridad, verifica el archivo `.env` en la raíz. Si no existe, crea uno copiando este contenido:

**Archivo `.env`:**
```env
# Clave para encriptar sesiones de usuario (¡Cambiar en producción!)
SESSION_SECRET=secret-key-change-this-in-prod-secure-random

# Clave Maestra para recuperación de contraseñas de administrador
MASTER_KEY=vigil2026

# Entorno de ejecución (development o production)
NODE_ENV=development

# Puerto del servidor (Opcional, por defecto 3000)
# PORT=3000
```

> [!WARNING]
> **¿Usas Windows 8 o Windows 7?**
> Las versiones nuevas de Node.js NO funcionan en tu PC.
> 👉 **[LEE PRIMERO ESTA GUÍA DE INSTALACIÓN (Clic aquí)](INSTALACION_WINDOWS_ANTIGUO.md)**

---

## 💾 Respaldo y Seguridad (¡Importante!)

Si la computadora falla, roban el equipo o el sistema se daña, **perderás toda la información** si no tienes una copia de seguridad.

### ¿Qué archivos debo guardar?
Para salvar todo el sistema, solo necesitas copiar y guardar en un USB o nube (Google Drive) estos 3 elementos claves de la carpeta del proyecto:

1.  📄 **`src/database.sqlite`**: Aquí está TODA la información (documentos, usuarios, historial). **Es el archivo más importante.**
2.  📂 **`public/uploads/`**: Esta carpeta contiene todos los **PDFs** que se han subido.
3.  📄 **`.env`**: Contiene tus claves de seguridad.

### ¿Cómo hacer una copia de seguridad?
1.  Detén el sistema (Cierra la ventana negra).
2.  Copia toda la carpeta `Reportes` a una memoria USB externa.
3.  ¡Listo! Con eso tienes todo a salvo.

### ¿Cómo restauro mi copia en otra PC?
1.  Instala el sistema en la nueva PC (puedes volver a descargar el código o usar tu copia).
2.  **Sobreescribe** el archivo `src/database.sqlite` y la carpeta `public/uploads/` con los que guardaste en tu USB.
3.  Arranca el sistema. Todo estará exactamente como lo dejaste.

---

## 🏃‍♂️ Ejecución del Sistema

### Opción A: Desde Terminal
```bash
npm start
```

### Opción B: Acceso Directo (Windows)
Haz doble clic en el archivo **`INICIAR_SISTEMA.bat`** incluido en la carpeta raíz.

### Acceso Web
Una vez iniciado, abre tu navegador y visita:
👉 **http://localhost:3000**

### 🔑 Credenciales por Defecto (Admin)
Si es la primera vez que inicias el sistema, se creará un usuario administrador automáticamente:

*   **Usuario:** `admin`
*   **Contraseña:** `admin`

*(Se recomienda cambiar la contraseña inmediatamente desde el panel de perfil)*

---

## 🛠️ Gestión y Mantenimiento de Base de Datos

El sistema utiliza **SQLite** (`src/database.sqlite`). No requiere instalación de servidores de base de datos externos.

### Scripts de Utilidad (Carpeta `scripts/`)
Encontrarás herramientas útiles para gestionar la data sin saber SQL. Ejecútalos desde la terminal en la raíz del proyecto:

| Acción | Comando | Descripción |
| :--- | :--- | :--- |
| **Resetear DATOS** | `node scripts/clear_database.js` | Borra documentos, historial y trabajadores. **Mantiene usuarios**. Ideal para limpiar pruebas. |
| **Resetear TODO** | `node scripts/reset_db.js` | **¡PELIGRO!** Borra TODO (Usuarios, Documentos, etc.). Restaura el usuario `admin` por defecto. |
| **Restaurar Clave Admin** | `node scripts/reset_admin_password.js` | Si olvidaste la clave, esto resetea al usuario `admin` con clave `admin`. |
| **Relleno Datos (Workers)** | `node scripts/seed_workers.js` | Rellena la tabla de trabajadores con datos de prueba aleatorios. |
| **Carga Masiva Docs** | `node scripts/manual_insert.js` | Inserta documentos de prueba para verificar el sistema. |

---

## 📂 Estructura del Proyecto

*   **`src/`**: Código fuente del servidor (Backend).
    *   `app.js`: Punto de entrada.
    *   `database.js`: Configuración y creación de tablas SQLite.
    *   `routes/` y `controllers/`: Lógica del sistema.
*   **`public/`**: Archivos estáticos (Frontend).
    *   `css/`, `js/`, `img/`: Estilos y scripts del cliente.
    *   `uploads/`: Carpeta donde se guardan los **PDFs adjuntos**.
*   **`views/`**: Archivos HTML de las interfaces.
*   **`scripts/`**: Herramientas de mantenimiento de BD.

---

## ❓ Solución de Problemas Comunes

1.  **Error: "EADDRINUSE: address already in use :::3000"**
    *   El puerto 3000 está ocupado.
    *   **Solución:** Cierra otras terminales de Node.js o cambia el puerto en el archivo `.env` (ej. `PORT=3001`).

2.  **No puedo iniciar sesión / Olvidé la contraseña**
    *   **Solución:** Ejecuta `node scripts/reset_admin_password.js` y entra con `admin` / `admin`.

3.  **La base de datos parece corrupta**
    *   **Solución:** Borra el archivo `src/database.sqlite` y reinicia el servidor. El sistema creará una nueva base de datos vacía automáticamente.

4.  **No cargan los estilos o scripts**
    *   Asegúrate de ejecutar el comando `npm start` desde la **raíz** del proyecto (donde está `package.json`), no desde una subcarpeta.
