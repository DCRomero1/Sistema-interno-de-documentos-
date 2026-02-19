# Guía de Respaldo de PDFs y Base de Datos

Esta guía te ayudará a proteger los datos importantes de tu sistema cuando esté desplegado en la VPS.

## ⚠️ Importante: ¿Qué se guarda en la VPS?

Cuando subes tu sistema a una VPS, estos archivos **NO** están en GitHub y solo existen en el servidor:

1. **PDFs subidos** → `public/uploads/`
2. **Base de datos SQLite** → `src/database.sqlite`
3. **Variables de entorno** → `.env`

**Si pierdes la VPS o la reinsticias, perderás todos estos datos.**

---

## 📦 Opción 1: Respaldo Manual (Rápido)

### Descargar respaldo desde la VPS a tu PC

```bash
# Desde tu PC (PowerShell o CMD)
# Reemplaza 123.45.67.89 con la IP de tu VPS

# Descargar PDFs
scp -r root@123.45.67.89:/var/www/reportes/public/uploads ./backup-uploads

# Descargar base de datos
scp root@123.45.67.89:/var/www/reportes/src/database.sqlite ./backup-database.sqlite
```

### Subir respaldo desde tu PC a la VPS

```bash
# Desde tu PC (PowerShell o CMD)

# Subir PDFs
scp -r ./backup-uploads/* root@123.45.67.89:/var/www/reportes/public/uploads/

# Subir base de datos
scp ./backup-database.sqlite root@123.45.67.89:/var/www/reportes/src/database.sqlite
```

---

## 🤖 Opción 2: Respaldo Automático Diario (Recomendado)

### Crear script de respaldo en la VPS

```bash
# Conectarse a la VPS
ssh root@123.45.67.89

# Crear carpeta de respaldos
mkdir -p /root/backups

# Crear script de respaldo
nano /root/backup-script.sh
```

Pega este contenido:

```bash
#!/bin/bash
# Script de respaldo automático

# Variables
FECHA=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"
APP_DIR="/var/www/reportes"

# Crear carpeta de respaldo con fecha
mkdir -p "$BACKUP_DIR/$FECHA"

# Respaldar PDFs
echo "Respaldando PDFs..."
tar -czf "$BACKUP_DIR/$FECHA/uploads.tar.gz" "$APP_DIR/public/uploads/"

# Respaldar base de datos
echo "Respaldando base de datos..."
cp "$APP_DIR/src/database.sqlite" "$BACKUP_DIR/$FECHA/database.sqlite"

# Eliminar respaldos antiguos (mantener solo últimos 7 días)
find "$BACKUP_DIR" -type d -mtime +7 -exec rm -rf {} +

echo "Respaldo completado: $BACKUP_DIR/$FECHA"
```

Guardar (`Ctrl + O`, `Enter`, `Ctrl + X`) y dar permisos:

```bash
chmod +x /root/backup-script.sh
```

### Programar respaldo automático diario

```bash
# Editar crontab
crontab -e

# Agregar esta línea al final (respaldo diario a las 2 AM)
0 2 * * * /root/backup-script.sh >> /root/backups/backup.log 2>&1
```

---

## 📥 Opción 3: Descargar respaldos automáticos a tu PC

### Desde tu PC (Windows), crear tarea programada

Crea un archivo `descargar-respaldo.ps1`:

```powershell
# Configuración
$VPS_IP = "123.45.67.89"
$VPS_USER = "root"
$BACKUP_LOCAL = "C:\Respaldos\Sistema-Reportes"
$FECHA = Get-Date -Format "yyyyMMdd"

# Crear carpeta local
New-Item -ItemType Directory -Force -Path "$BACKUP_LOCAL\$FECHA"

# Descargar último respaldo
scp -r "${VPS_USER}@${VPS_IP}:/root/backups/*" "$BACKUP_LOCAL\$FECHA\"

Write-Host "Respaldo descargado en: $BACKUP_LOCAL\$FECHA"
```

Ejecutar manualmente o programar con **Programador de Tareas de Windows**.

---

## 🔄 Restaurar desde un respaldo

### Restaurar PDFs

```bash
# En la VPS
cd /var/www/reportes
tar -xzf /root/backups/20260217_020000/uploads.tar.gz -C /
```

### Restaurar base de datos

```bash
# En la VPS
cp /root/backups/20260217_020000/database.sqlite /var/www/reportes/src/database.sqlite

# Reiniciar aplicación
pm2 restart all
```

---

## 🌐 Opción 4: Almacenamiento en la Nube (Avanzado)

Para sistemas en producción, considera usar servicios de almacenamiento en la nube:

### Servicios recomendados:
- **AWS S3** (Amazon)
- **Cloudinary** (especializado en archivos)
- **Google Cloud Storage**
- **Backblaze B2** (económico)

### Ventajas:
✅ Los archivos no dependen del servidor  
✅ Respaldo automático  
✅ Acceso desde cualquier lugar  
✅ Escalable (sin límite de espacio)  

---

## 📋 Checklist de Seguridad

Antes de desplegar en producción:

- [ ] Agregar `public/uploads/` al `.gitignore`
- [ ] Configurar respaldo automático diario
- [ ] Probar restauración de respaldo
- [ ] Documentar contraseñas y accesos
- [ ] Considerar almacenamiento en la nube para largo plazo

---

## 🆘 Comandos Útiles

```bash
# Ver tamaño de PDFs almacenados
du -sh /var/www/reportes/public/uploads/

# Ver tamaño de base de datos
ls -lh /var/www/reportes/src/database.sqlite

# Listar respaldos disponibles
ls -lh /root/backups/

# Verificar espacio en disco
df -h
```
