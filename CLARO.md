# Claro — datos durables y conciliación

## Primer uso

1. Crea tu cuenta personal desde la pantalla inicial **antes de compartir o publicar** la web. Solo puede existir una cuenta propietaria de este espacio.
2. Inicia sesión desde cualquier dispositivo. La base de datos, no el navegador, es la fuente de los movimientos, gastos fijos, metas, préstamos y meses.
3. Para registrar la universidad ya pagada, pulsa **Tu universidad, sin descontar dos veces**. Confirma fecha, monto y el saldo real de **$1.100.000 COP**. El pago no se ha registrado automáticamente.
4. La opción **Este movimiento ya está incluido en mi saldo** mantiene el gasto y registra una conciliación de caja auditable. No crea ingresos. Para compras nuevas deja la opción desactivada.
5. El Excel sigue disponible como copia descargable. Excel y Google Sheets no se sincronizan de vuelta con la base de datos.

## Datos preservados

- Un espacio con saldo real confirmado de $1.100.000, sin inferir el origen de la diferencia respecto a la configuración anterior.
- Siete gastos recurrentes, tres metas, ocho conceptos por cobrar y el plan de noviembre de 2026.
- Cien celdas originales archivadas en el espacio privado, sin reconstruir notas ambiguas como transacciones reales.
- Respaldo binario original descargable únicamente tras iniciar sesión.
- Los importes de cada mes generado quedan congelados; los cambios de gastos fijos se aplican a nuevos planes.

## Arquitectura

La portada `/` es un shell estático. `/api/finanzas` consulta Payload por solicitud, con `Cache-Control: private, no-store`, acceso por propietario y sesión de aplicación aislada de Payload Admin. Las mutaciones validan campos en servidor; los movimientos son inmutables y las versiones de gastos fijos y metas se conservan. La clave de nóminas y pagos recurrentes es determinista por espacio y referencia, protegida por unicidad en base de datos.

El saldo exportado se calcula como saldo confirmado inicial más movimientos reales y diferencias de conciliación. Las conciliaciones se separan del ingreso en la web y en la columna M de `MOVIMIENTOS`.

## Verificaciones

- `pnpm test`: 16 pruebas financieras, incluidas ambas bases de saldo ($1.000.000 y $1.100.000), gastos posteriores e identidades entre sesiones.
- `pnpm exec tsc --noEmit`.
- `figma make verify-deploy`: compilación de producción y clasificación de rutas.
- Pruebas reales de acceso anónimo: datos financieros y archivo protegidos, sin exponer registros.
- Pruebas de interfaz en Chromium con respuestas controladas: formulario de universidad, vista previa y estado recargado, navegación por los módulos, móvil sin desplazamiento horizontal y exportación del Excel.
- Evaluación independiente del Excel: 27 hojas, fórmulas sin errores, universidad $1.100.000, caja $1.100.000, ingreso real $0 e historial íntegro.

Las pruebas de interfaz autenticada usan respuestas controladas para no crear una cuenta propietaria de prueba ni movimientos ficticios en la base real. La creación e inicio de sesión de la cuenta definitiva requieren las credenciales elegidas por el usuario; no se ha inventado una cuenta ni una contraseña.

La financiación de la moto, su valor de mercado y las condiciones de Nu siguen pendientes de conciliación con documentos reales.
