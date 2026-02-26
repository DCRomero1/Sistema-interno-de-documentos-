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
El sistema utiliza variables de entorno para la seguridad. Crea un archivo `.env` en la raíz (puedes usar el `.env.example` como base) y configura los siguientes valores:

**Campos requeridos en `.env`:**
```env
# Clave para encriptar sesiones de usuario (¡Cambiar por una clave larga y aleatoria!)
SESSION_SECRET=tu-clave-secreta-aqui

# Clave Maestra para funciones administrativas críticas
MASTER_KEY=tu-clave-maestra-aqui

# Entorno de ejecución (development o production)
NODE_ENV=production

# Puerto del servidor (Opcional, por defecto 3000)
# PORT=3000
```

---

## 💾 Respaldo y Seguridad

Para mantener la integridad de los datos en el servidor, asegúrese de respaldar periódicamente:

1.  📄 **`src/database.sqlite`**: La base de datos completa.
2.  📂 **`public/uploads/`**: Los archivos PDF subidos al sistema.

---

## 🏃‍♂️ Ejecución del Sistema

### Producción (Recomendado)
Para mantener el sistema activo 24/7 en un servidor, se recomienda usar **PM2**:
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

### Desarrollo
```bash
npm start
```

### 🔑 Credenciales por Defecto (Primer inicio)
Al ejecutarse por primera vez, se crea un usuario administrador:

*   **Usuario:** `admin`
*   **Contraseña:** `admin`

*(Cámbiala inmediatamente después de ingresar)*

---

## 🛠️ Gestión de Base de Datos

El sistema utiliza **SQLite**. No requiere servidores externos.

### Scripts de Utilidad
Ejecútalos desde la terminal en la raíz del proyecto para tareas de mantenimiento:

| Acción | Comando | Descripción |
| :--- | :--- | :--- |
| **Resetear DATOS** | `node scripts/clear_data_keep_workers.js` | Limpia documentos e historia pero mantiene los catálogos. |
| **Resetear TODO** | `node scripts/reset_db.js` | Borra toda la base de datos y la recrea desde cero. |
| **Restaurar Clave Admin** | `node scripts/reset_admin_password.js` | Resetea el usuario `admin` a sus valores por defecto. |

---

## 📂 Estructura del Proyecto

*   **`src/`**: Backend (Express + SQLite).
*   **`public/`**: Frontend estático (CSS, JS, Imágenes).
*   **`views/`**: Interfaces HTML.
*   **`uploads/`**: PDFs adjuntos de documentos.

