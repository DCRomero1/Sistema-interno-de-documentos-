# ⚠️ Guía de Instalación para Windows 8 / 8.1

Si vas a instalar este sistema en una computadora con **Windows 8 o 8.1**, hay un paso extra importante: **No puedes instalar la última versión de Node.js**, porque ya no es compatible con tu sistema.

Debes instalar una versión específica que sí funcione.

---

## 1. Descargar la versión correcta de Node.js

De las versiones que mencionas, la **mejor opción es la v16.20.2** (o v16.20.0).

> **¿Te sale un aviso de "Versión sin soporte" (End of Life)?**
> **Es normal y debes ignorarlo.**
> Windows 8.1 es un sistema operativo antiguo, por lo que las versiones "modernas" de Node.js no funcionan en él. Estamos obligados a usar esta versión antigua. **No te preocupes, el sistema funcionará perfectamente igual.**

1.  **[Descargar Node.js v16.20.2 (Recomendado)](https://nodejs.org/dist/v16.20.2/node-v16.20.2-x64.msi)**
2.  Ejecuta el archivo, dale "Next" a todo e ignora las advertencias de soporte.

Si por alguna razón la v16 no te deja instalar, tu segunda mejor opción es la **v14.21.3**. Evita la v15.

---

## 2. Verificar la instalación

Una vez instalado:
1.  Presiona la tecla `Windows` + `R`.
2.  Escribe `cmd` y dale Enter.
3.  En la ventana negra, escribe:
    ```bash
    node -v
    ```
4.  Debería salirte `v16.20.2`. Si sale eso, **ya está listo**.

---

## 3. Instalar el Sistema

Ahora ya puedes continuar con la guía normal del `README.md`:

1.  Copia la carpeta del proyecto.
2.  Abre el archivo `INSTALAR_DEPENDENCIAS.bat` (doble clic).
3.  Espera a que termine.
4.  Abre `INICIAR_SISTEMA.bat` para usarlo.

---

## ❓ Preguntas Frecuentes en Windows 8

**¿Me va a funcionar todo igual?**
Sí. El sistema ha sido verificado para funcionar con estas versiones de Node.js.

**¿Qué pasa si uso la versión nueva de Node.js?**
Windows te dará un error diciendo "Este programa no es compatible con su versión de Windows" y no te dejará instalarlo.
