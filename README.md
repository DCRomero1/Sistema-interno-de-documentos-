# Sistema de Registro de Documentos

Esta guía te ayudará a instalar y ejecutar el sistema en una nueva computadora.

## Requisitos Previos
1.  **Node.js**: Debes tener instalado Node.js en la computadora.
    *   Descárgalo e instálalo desde: [https://nodejs.org/](https://nodejs.org/) (La versión LTS es recomendada).

## Pasos de Instalación

1.  **Copiar Archivos**
    *   Copia toda la carpeta del proyecto a la nueva computadora.

2.  **Instalar Dependencias**
    *   Abre una terminal (PowerShell o CMD) dentro de la carpeta del proyecto.
    *   Ejecuta el siguiente comando para descargar las librerías necesarias:
        ```bash
        npm install
        ```

3.  **Iniciar el Sistema**
    *   Una vez instaladas las dependencias, inicia el servidor con:
        ```bash
        npm start
        ```
    *   Verás un mensaje: `Server running at http://localhost:3000`.

4.  **Usar**
    *   Abre tu navegador (Chrome, Edge, etc.) y ve a: `http://localhost:3000`

## Sobre la Base de Datos
*   Los datos se guardan en el archivo `src/database.sqlite`.
*   **Para conservar los datos**: Asegúrate de copiar este archivo junto con el resto del proyecto.
*   **Para empezar desde cero**: Si borras este archivo (o no lo copias), el sistema creará uno nuevo y vacío automáticamente al iniciarse (con el usuario `admin` por defecto).

## Usuarios por Defecto
*   **Usuario**: `admin`
*   **Contraseña**: `admin`

## Compartir en Internet (Ngrok)

Si deseas que alguien más pruebe el sistema desde otra ubicación sin instalar nada, puedes usar **ngrok**:

1.  Descarga **ngrok** desde [ngrok.com](https://ngrok.com/).
2.  Descomprime el archivo y abre la terminal en esa carpeta.
3.  Con tu sistema ya corriendo (paso 3 de instalación), ejecuta en la terminal de ngrok:
    ```bash
    ngrok http 3000
    ```
4.  Ngrok te dará una dirección web (algo como `https://a1b2-c3d4.ngrok.io`).
5.  Envía esa dirección a la otra persona. Podrán acceder a tu sistema mientras mantengas tu computadora y la terminal encendidas.
