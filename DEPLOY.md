# Guía de Despliegue en VPS (Ubuntu 20.04/22.04)

Esta guía te llevará paso a paso desde un servidor vacío hasta tener tu aplicación corriendo con un dominio seguro (HTTPS).

## 1. Preparación de tu Código (En tu PC)
Antes de entrar al servidor, asegúrate de que tu código esté listo.
1.  Sube tu código a GitHub (si no lo has hecho).
2.  Asegúrate de que archivos como `node_modules`, `.env`, y `database.sqlite` **NO** se suban (deben estar en `.gitignore`).

## 2. Acceder al VPS
Usa el programa "PowerShell" o "CMD" en tu Windows.
Reemplaza `123.45.67.89` por la IP que te dio tu proveedor de VPS.

```bash
ssh root@123.45.67.89
```
*(Te pedirá la contraseña, escríbela y presiona Enter. No verás los caracteres mientras escribes, es normal).*

## 3. Instalación de Programas Necesarios
Copia y pega estos comandos uno por uno en la consola del servidor.

### Actualizar el sistema
```bash
apt update && apt upgrade -y
```

### Instalar Node.js (Versión 18 LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs
```

### Instalar Git, Nginx y Certbot
```bash
apt install -y git nginx certbot python3-certbot-nginx
```

### Instalar PM2 (Gestor de Procesos)
```bash
npm install -g pm2
```

## 4. Descargar tu Código
Vamos a guardar tu código en la carpeta `/var/www/reportes`.

```bash
# Crear carpeta y entrar
mkdir -p /var/www/reportes
cd /var/www/reportes

# Clonar tu repositorio (CAMBIA ESTA URL POR LA TUYA)
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git .

# Instalar dependencias
npm install
```

## 5. Configuración del Entorno
Aquí crearemos el archivo `.env` con tus contraseñas reales.

```bash
# Copiar el ejemplo
cp .env.example .env

# Editar el archivo
nano .env
```
*   Dentro del editor `nano`, cambia las variables.
*   Para guardar: `Ctrl + O`, `Enter`.
*   Para salir: `Ctrl + X`.

## 6. Configurar la Base de Datos
Como usas SQLite, el archivo se creará solo, pero necesitamos asegurarnos de que la carpeta tenga permisos de escritura.

```bash
# Dar permisos al usuario (asumiendo que corres como root por ahora)
# En producción idealmente se usa un usuario sin privilegios, pero para empezar está bien.
```

## 7. Iniciar la Aplicación con PM2
PM2 mantendrá tu aplicación viva por siempre.

```bash
# Iniciar usando el archivo de configuración
pm2 start ecosystem.config.js

# Guardar la lista de procesos para que revivan si reinicias el servidor
pm2 save
pm2 startup
```
*(Copia y pega el comando que te pida `pm2 startup` si te sale alguno).*

## 8. Configurar Nginx (El portero web)
Haremos que Nginx reciba las visitas y se las pase a tu app en el puerto 3000.

1.  Borrar configuración por defecto:
    ```bash
    rm /etc/nginx/sites-enabled/default
    ```

2.  Crear nueva configuración:
    ```bash
    nano /etc/nginx/sites-available/reportes
    ```

3.  Pega esto dentro (CAMBIA `tu-dominio.com` POR TU DOMINIO REAL):
    ```nginx
    server {
        listen 80;
        server_name tu-dominio.com www.tu-dominio.com;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

4.  Activar el sitio y reiniciar Nginx:
    ```bash
    ln -s /etc/nginx/sites-available/reportes /etc/nginx/sites-enabled/
    nginx -t
    systemctl restart nginx
    ```

## 9. Activar Candadito Verde (SSL/HTTPS)
Certbot configurará todo automáticamente.

```bash
certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```
*   Te pedirá un correo (pon el tuyo).
*   Acepta los términos (`Y`).
*   Si pregunta sobre redirigir HTTP a HTTPS, elige `2` (Redirect).

## ¡LISTO!
Tu sistema debería estar accesible en `https://tu-dominio.com`.

---

## Comandos Útiles para el Futuro

### Ver si la app está corriendo
```bash
pm2 status
```

### Ver los logs (errores, consolas)
```bash
pm2 logs
```

### Actualizar el código
```bash
cd /var/www/reportes
git pull
npm install
pm2 restart all
```
