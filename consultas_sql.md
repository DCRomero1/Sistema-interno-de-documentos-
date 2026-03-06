# Consultas SQL Utilizadas en el Sistema

A continuación se listan las consultas SQL (`SQLite`) extraídas de los distintos controladores de la aplicación, agrupadas por la sección a la que pertenecen, con una explicación breve de su funcionalidad.

## 1. Trabajadores / Personal (`workerController.js`)
Estas consultas gestionan a los docentes o personal general (distintos de los conserjes).

- **Obtener todos los trabajadores:**
  ```sql
  SELECT * FROM workers ORDER BY fullName
  ```
  _Devuelve la lista de todos los trabajadores registrados ordenados alfabéticamente por nombre._

- **Crear un nuevo trabajador:**
  ```sql
  INSERT INTO workers (fullName, dni, birthDate, position, email, phone) VALUES (?, ?, ?, ?, ?, ?)
  ```
  _Inserta un nuevo registro de trabajador en el sistema. Falla si el DNI ya existe (clave única)._

- **Obtener cumpleaños próximos:**
  ```sql
  SELECT fullName, birthDate, position FROM workers
  ```
  _Obtiene las fechas de nacimiento para calcular mediante código cuáles son próximos en los siguientes días._

- **Actualizar un trabajador:**
  ```sql
  UPDATE workers SET fullName = ?, dni = ?, birthDate = ?, position = ?, email = ?, phone = ? WHERE id = ?
  ```
  _Modifica la información de un trabajador usando su identificador (`id`)._

- **Eliminar un trabajador:**
  ```sql
  DELETE FROM workers WHERE id = ?
  ```
  _Elimina el registro de un trabajador del sistema._

---

## 2. Usuarios del Sistema (`userController.js`)
Estas consultas manejan el acceso al sistema (autenticación).

- **Listar todos los usuarios:**
  ```sql
  SELECT id, username, name, role, created_at FROM users
  ```
  _Muestra los usuarios existentes para el panel de administración, omitiendo la contraseña._

- **Crear usuario:**
  ```sql
  INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)
  ```
  _Registra un nuevo usuario con los privilegios asignados._

- **Eliminar usuario:**
  ```sql
  DELETE FROM users WHERE id = ?
  ```
  _Elimina el acceso de un usuario al sistema._

- **Actualizar contraseña:**
  ```sql
  UPDATE users SET password = ? WHERE id = ?
  ```
  _Modifica la contraseña de un usuario._

---

## 3. Configuración del Sistema (`settingsController.js`)
Consultas para la persistencia de configuraciones globales (por ejemplo, el nombre del año).

- **Obtener configuración específica:**
  ```sql
  SELECT value, updated_at FROM settings WHERE key = ?
  ```
  _Busca el valor de un parámetro de configuración mediante su clave._

- **Insertar o Actualizar configuración:**
  ```sql
  INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  ```
  _Inserta una nueva clave si no existe, o actualiza el valor si la clave ya está registrada (Upsert)._

---

## 4. Horarios y Turnos de Limpieza (`scheduleController.js`)
Manejan las celdas de horarios y asignaciones en el cronograma.

- **Obtener todas las asignaciones del cronograma:**
  ```sql
  SELECT sa.slotId, sa.cleanerId as workerId, w.fullName, w.position,
         GROUP_CONCAT(p.name, '||') as pavilion_names,
         GROUP_CONCAT(a.name, '||') as area_names
  FROM schedule_assignments sa
  INNER JOIN cleaning_staff w ON sa.cleanerId = w.id
  LEFT JOIN slot_areas sla ON sa.slotId = sla.slot_id
  LEFT JOIN areas a ON sla.area_id = a.id
  LEFT JOIN pavilions p ON a.pavilion_id = p.id
  GROUP BY sa.slotId, sa.cleanerId
  ```
  _Obtiene qué trabajador (y sus áreas) está asignado a cada turno del cronograma agrupando la información._

- **Eliminar todas las asignaciones de un turno:**
  ```sql
  DELETE FROM schedule_assignments WHERE slotId = ?
  ```
  _Limpia todo el personal de un bloque horario específico._

- **Eliminar conserje específico de un turno:**
  ```sql
  DELETE FROM schedule_assignments WHERE slotId = ? AND cleanerId = ?
  ```
  _Retira a un trabajador específico de un bloque de turno._

- **Asignar conserje a turno:**
  ```sql
  INSERT OR IGNORE INTO schedule_assignments (slotId, cleanerId) VALUES (?, ?)
  ```
  _Añade a un conserje a un turno horario determinado._

- **Reporte general de cobertura:**
  ```sql
  SELECT p.id as pavilion_id, p.name as pavilion_name, a.id as area_id, a.name as area_name,
         sa.slotId, c.id as cleaner_id, c.fullName as cleaner_name
  FROM pavilions p
  JOIN areas a ON p.id = a.pavilion_id
  LEFT JOIN slot_areas sla ON a.id = sla.area_id
  LEFT JOIN schedule_assignments sa ON sla.slot_id = sa.slotId
  LEFT JOIN cleaning_staff c ON sa.cleanerId = c.id
  ORDER BY p.name ASC, a.name ASC, sa.slotId ASC
  ```
  _Genera un reporte cruzado de qué áreas están siendo cubiertas por quién en cada turno._

---

## 5. Trámite Documentario (`documentController.js`)
Consultas relacionadas a la recepción y despacho de documentos, incluyendo soporte a subida de archivos y folios.

- **Obtener todos los documentos y su historial:**
  ```sql
  SELECT * FROM documents ORDER BY fecha DESC, id DESC
  SELECT * FROM document_history
  ```
  _La primera trae los documentos ordenados del más reciente al antiguo, la segunda extrae los estados pasados de los mismos._

- **Guardar nuevo documento (Recepción inicial):**
  ```sql
  INSERT INTO documents (id, fecha, tipo, nombre, origen, destino, ubicacion, folios, concepto, fechaDespacho, cargo, status, observaciones, pdf_path, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ```
  _Registra un documento ingresado por secretaria o mesa de partes._

- **Registrar acción en historial del documento:**
  ```sql
  INSERT INTO document_history (docId, date, action, from_area, to_area, cargo, observation) VALUES (?, ?, ?, ?, ?, ?, ?)
  ```
  _Cada vez que un folio se crea o se deriva, se guarda constancia inmutable en la tabla de historial._

- **Generar IDs automáticos para documentos del mismo año:**
  ```sql
  SELECT MAX(id) as maxId FROM documents WHERE id LIKE ?
  ```
  _Busca el último correlativo generado para un año (ej: 052-2026), para sumarle 1 en la próxima creación._

- **Lógica de correlativos retroactivos (Documentos con fecha pasada):**
  ```sql
  SELECT id FROM documents WHERE year = ? AND fecha <= ? ORDER BY fecha DESC, created_at DESC
  SELECT id FROM documents WHERE year = ? AND id LIKE ?
  SELECT MAX(fecha) as maxDate FROM documents WHERE year = ?
  ```
  _Permiten buscar IDs bases y asignarles letras (e.j: 015-A-2026) en lugar de romper el correlativo general de fechas._

- **Derivar documento a nueva ubicación:**
  ```sql
  UPDATE documents SET ubicacion = ?, fechaDespacho = ?, cargo = ?, status = ?, observaciones = ? WHERE id = ?
  ```
  _Mueve un documento de un área a otra y actualiza su estado._

- **Administrar Archivos PDF para Documentos:**
  ```sql
  UPDATE documents SET pdf_path = ? WHERE id = ?
  SELECT pdf_path FROM documents WHERE id = ?
  UPDATE documents SET pdf_path = NULL WHERE id = ?
  ```
  _Vincula, lee, o desconecta/elimina un archivo adjunto PDF al registro del documento._

---

## 6. Pabellones y Áreas de Limpieza (`pavilionsController.js`)
Maneja la estructura física del colegio/instituto.

- **Obtener catálogo estructural de áreas:**
  ```sql
  SELECT * FROM pavilions ORDER BY sort_order ASC, id ASC
  SELECT * FROM areas
  ```
  _Extrae todos los pabellones y sus subdivisiones (aulas, oficinas, etc)._

- **Obtener áreas específicas asignadas a un trabajador (Global - Legacy):**
  ```sql
  SELECT a.* FROM areas a JOIN cleaner_areas wa ON a.id = wa.area_id WHERE wa.cleaner_id = ?
  ```
  _Consulta las zonas físicas asignadas directamente a un conserje._

- **Reasignar áreas a un trabajador:**
  ```sql
  DELETE FROM cleaner_areas WHERE cleaner_id = ?
  INSERT INTO cleaner_areas (cleaner_id, area_id) VALUES (?, ?)
  ```
  _Borra las áreas previamente guardadas y graba las nuevas selecciones._

- **Obtener/Asignar áreas asociadas a un Turno (Slot):**
  ```sql
  SELECT a.* FROM areas a JOIN slot_areas sa ON a.id = sa.area_id WHERE sa.slot_id = ?
  DELETE FROM slot_areas WHERE slot_id = ?
  INSERT INTO slot_areas (slot_id, area_id) VALUES (?, ?)
  ```
  _Obtiene o modifica las áreas asignadas directamente a una celda de horario concreta (P.ej. Lunes-Mañana)._

---

## 7. Reportes Estadísticos (`reportController.js`)
Generan los cuadros del Dashboard (Vista inicial).

- **Documentos recibidos Hoy:**
  ```sql
  SELECT COUNT(*) as count FROM documents WHERE fecha = ?
  ```
- **Documentos recibidos este Mes:**
  ```sql
  SELECT COUNT(*) as count FROM documents WHERE fecha LIKE ?
  ```
- **Documentos en Proceso (pendientes):**
  ```sql
  SELECT COUNT(*) as count FROM documents WHERE status != 'Finalizado'
  ```
- **Documentos agrupados por Tipo (Gráfico de Torta):**
  ```sql
  SELECT tipo, COUNT(*) as count FROM documents GROUP BY tipo
  ```
  _Cuenta cuántos FUTs, Oficios, Informes, etc., se han ingresado._

---

## 8. Conserjes de Limpieza (`cleanersController.js`)
Administración del personal netamente obrero/limpieza.

- **Listado completo de conserjes:**
  ```sql
  SELECT * FROM cleaning_staff ORDER BY fullName
  ```

- **Agregar nuevo conserje:**
  ```sql
  INSERT INTO cleaning_staff (fullName, dni, birthDate, position, email, phone) VALUES (?, ?, ?, ?, ?, ?)
  ```

- **Actualizar datos del conserje:**
  ```sql
  UPDATE cleaning_staff SET fullName = ?, dni = ?, birthDate = ?, position = ?, email = ?, phone = ? WHERE id = ?
  ```

- **Eliminar conserje y sus horarios:**
  ```sql
  DELETE FROM schedule_assignments WHERE cleanerId = ?
  DELETE FROM cleaning_staff WHERE id = ?
  ```
  _Antes de eliminar al conserje de la BD, se borran sus apariciones en el cronograma por llave foránea._

- **Sustitución de Trabajador en Cronogramas:**
  ```sql
  UPDATE schedule_assignments SET cleanerId = ? WHERE cleanerId = ?
  ```
  _Cambia un trabajador antiguo por uno nuevo en TODOS los turnos que tenía estipulados de un solo golpe._
