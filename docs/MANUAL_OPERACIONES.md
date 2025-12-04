# 📘 Manual de Operaciones - Colecta ISF

Este documento está diseñado para el equipo de **Ingeniería Sin Fronteras Chile**. Aquí encontrarás cómo administrar la plataforma de colecta, revisar donaciones y solucionar dudas frecuentes de los donantes.

---

## 1. Acceso a las Plataformas

La colecta funciona conectando varios servicios. Como administrador, necesitarás acceso a:

### 💳 Payku (Pasarela de Pagos)
Aquí es donde **realmente llega el dinero**. Es la fuente de la verdad para conciliaciones bancarias.
- **URL:** [https://app.payku.cl](https://app.payku.cl)
- **Uso:** Ver transacciones, comprobar pagos rechazados, gestionar devoluciones.

### 🗄️ Supabase (Base de Datos)
Aquí se guardan los registros de la colecta para mostrar la barra de progreso y el ranking.
- **URL:** [https://supabase.com/dashboard](https://supabase.com/dashboard)
- **Uso:** Ver lista de donantes, corregir nombres si es necesario, exportar Excel de donantes.

---

## 2. Gestión de Donaciones

### ¿Cómo verificar si una donación fue exitosa?
Si un donante pregunta por su donación:

1. **Busca en Payku:**
   - Entra a "Transacciones".
   - Busca por el email del donante o el monto.
   - Si está "Aprobada" en Payku, el dinero lo tienen ustedes. ✅

2. **Busca en Supabase (Plataforma Colecta):**
   - Entra al proyecto en Supabase -> `Table Editor` -> tabla `donations`.
   - Busca el email.
   - Verifica la columna `estado`. Debería decir `pagado`.

### ¿Qué pasa si está pagada en Payku pero no en la Colecta?
A veces (muy rara vez) la conexión puede fallar justo en el momento del pago.
- **Solución:** Contacta al equipo técnico (ver Manual Técnico). Ellos pueden "sincronizar" la donación manualmente usando el ID de transacción de Payku.

---

## 3. Descargar Datos (Reportes)

Para enviar correos de agradecimiento o hacer análisis:

1. Entra a **Supabase**.
2. Ve al **Table Editor** (icono de tabla a la izquierda).
3. Selecciona la tabla `donations`.
4. Haz clic en el botón **"Export"** (arriba a la derecha) -> **Download CSV**.
5. Ese archivo lo puedes abrir en Excel o Google Sheets.

> **Ojo:** La columna `monto` está en pesos chilenos (CLP).

---

## 4. Preguntas Frecuentes de Donantes

**P: "Me descontaron la plata pero la página me dio error"**
R: Verifica en Payku. Si el dinero está ahí, la donación es válida. Puedes confirmarles manualmente por correo.

**P: "Puse mal mi nombre/mensaje, ¿se puede cambiar?"**
R: Sí. Un administrador puede entrar a Supabase, buscar la fila y editar el texto directamente en la tabla `donations`.

**P: "¿Es seguro poner mi tarjeta?"**
R: Sí. Nosotros no guardamos datos de tarjeta. Todo se procesa directamente en los servidores seguros de Payku (bancos chilenos).

---

## 5. Contacto de Emergencia

Si la página se cae (error 500, pantalla blanca) o el ranking no se mueve en horas:

1. **No entres en pánico.** Las donaciones suelen seguir funcionando en Payku aunque la página visual falle.
2. Contacta al voluntario técnico de turno.
3. Si es crítico, revisa el **Manual Técnico** sección "Troubleshooting".
