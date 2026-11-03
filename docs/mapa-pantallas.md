# Mapa de pantallas, flujos y mensajes del frontend de EcoLima

Referencia para el grupo que evalúa el sistema en las pruebas cruzadas y base del Manual de Usuario. Describe la rama `v1.0.0-ajustes` con el paquete de resultados 1.0.0 (2 242 sitios: 2 195 lugares evaluados y 47 puntos de reciclaje existentes). Las etiquetas entre «» son las que se ven en pantalla.

## 1. Pantallas

Rutas y permisos definidos en `src/router/index.ts`. Tras iniciar sesión, el analista y el administrador entran a `/analisis`; una cuenta de rol ciudadano entra a `/puntos` (`src/domains/auth/utils/rutaInicio.ts`).

| Ruta | Pantalla | Quién puede verla | Qué permite hacer |
|---|---|---|---|
| `/` | Inicio de sesión («EcoLima ML») | Público. Con sesión activa redirige a la pantalla de inicio del rol | Iniciar sesión con correo y contraseña. El enlace «¿Olvidaste tu contraseña?» lleva a `/recuperar` |
| `/recuperar` | «Recuperar contraseña» | Público. Con sesión activa redirige como el inicio de sesión | Pedir por correo un enlace para crear una contraseña nueva |
| `/restablecer?token=…` | «Nueva contraseña» | Público, con el enlace del correo. Con sesión activa redirige como el inicio de sesión | Crear una contraseña nueva que cumpla la política (la misma de «Crear usuario») |
| `/puntos` | Vista pública («EcoLima — Encuentra dónde reciclar») | Público, con o sin sesión | Buscar puntos de reciclaje registrados con «Buscar en esta zona» o «Usar mi ubicación», filtrar por material y ver el detalle de un punto. El botón «Acceso municipal» (en móvil, «Ingresar») lleva al inicio de sesión |
| `/analisis` | Análisis | Analista y administrador | Ver el orden de revisión de los lugares en el mapa y en la lista, filtrar por distrito, grupo y tipo de lugar, buscar por tipo o código y consultar el detalle de un lugar |
| `/reportes` | «Reporte de análisis» | Analista y administrador | Elegir el ámbito (provincia o distrito), ver las cifras, la tabla «Resultados por distrito» y el orden de revisión, y exportar con «Copiar resumen», «Imprimir» y «Descargar CSV» |
| `/panel-ml` | «Panel ML», pestaña «Modelo» | Solo administrador | Consultar, sin modificar, la versión activa del paquete, el estado de los datos, las métricas del modelo, las versiones registradas, la priorización (MCDA) y la integridad del paquete |
| `/panel-ml` | «Panel ML», pestaña «Datos» (gestión de datasets) | Solo administrador | Subir, validar, corregir, confirmar, eliminar y exportar datasets de puntos de reciclaje para la vista pública |
| `/admin/usuarios` | «Gestión de usuarios» | Solo administrador | Crear usuarios (analista o administrador), cambiar el rol y activar o desactivar cuentas. No hay eliminación de usuarios. Debajo de la tabla, «Lectura de la ayuda del Análisis»: por cuenta y por sección, si la leyó (con fecha) o está pendiente |
| `/analisis-v1`, `/reportes-v1` | Redirecciones | — | Llevan a `/analisis` y `/reportes`; en el despliegue responden con 301 |
| Cualquier otra ruta | Redirección | — | Lleva a `/puntos` |

**Lectura obligatoria de la ayuda del Análisis, por sección.** La ayuda con las pestañas «Cómo se ordenan», «Fuentes y limitaciones» y «Acerca del modelo» se abre desde varios lugares de Análisis y Reportes, cada uno en una pestaña. Si la sección con la que se abre (la de entrada) todavía no fue leída por esa cuenta, la ayuda no se puede cerrar (ni con la X, ni con Escape, ni tocando fuera) hasta desplazar ese texto hasta el final. Las otras pestañas no son obligatorias; si se leen completas, también se registran. Las lecturas se guardan en el servidor al cerrar la ayuda, cada sección por separado (claves `como-se-ordenan`, `fuentes-limitaciones` y `acerca-del-modelo`, en `src/domains/analisis-v1/components/avisoAyuda.ts`). Una sección ya leída no se vuelve a exigir hasta que cambie su versión. Si el servicio falla, no se exige nada.

Si un usuario entra a una ruta sin permiso, el sistema lo devuelve a su pantalla de inicio sin mostrar un error: un analista que escribe `/panel-ml` vuelve a `/analisis`, y alguien sin sesión que escribe `/analisis` va al inicio de sesión.

## 2. Flujos por rol

### Analista: ver el orden de revisión (ranking) de los lugares

1. Iniciar sesión en `/`. El sistema abre «Análisis».
2. Leer el aviso superior «Lugares para revisar, no ubicaciones aprobadas.» (se cierra con la X).
3. La lista de la izquierda muestra los lugares ordenados por su puesto en la provincia (1.º = revisar primero), 10 por página. El mapa colorea en verde los que están «Entre los 110 primeros de Lima».
4. Para ver un distrito, abrir el selector «Distrito», buscar el nombre y elegirlo. La lista pasa a mostrar el orden de revisión dentro de ese distrito.
5. Para acotar la lista, usar «Mostrar» (grupos), «Tipo de lugar» y el buscador «Buscar por tipo o código». «Restablecer filtros» vuelve al estado inicial.
6. Para cambiar de página, usar «Anterior», «Siguiente» o el selector de 10, 20 o 50 por página.

### Analista: consultar un lugar

1. En «Análisis», hacer clic en un lugar de la lista o en un punto del mapa.
2. El mapa se acerca al lugar, traza un radio de 500 m y una línea azul hasta el punto registrado más cercano.
3. El panel derecho muestra el estado de la revisión preliminar, el «Orden de revisión en {distrito}», el puesto en la provincia, «¿Por qué ocupa esta posición?», el «Punto de reciclaje registrado más cercano» y las «Verificaciones pendientes».
4. Pulsar «Ver más detalles» para ver los cuatro factores, el percentil de «Parecido con los puntos ya registrados», las contribuciones por grupo de variables, la lista «Qué falta comprobar antes de una posible instalación» y la «Revisión preliminar».
5. Cerrar el detalle con la X («Cerrar detalle»). En pantallas angostas el detalle ocupa toda la pantalla y se sale con «Volver al mapa» o «Volver a la lista».

### Analista: generar un reporte

1. Ir a «Reportes» en la barra superior.
2. En «Reporte de», elegir «Provincia de Lima (43 distritos)» o un distrito. También se puede pulsar un distrito en «Resultados por distrito».
3. Revisar las cuatro tarjetas y la tabla de orden de revisión. Al pulsar el título de una columna se ordena por ella; al pulsar una fila se abre ese lugar en «Análisis».
4. Exportar:
   - «Descargar CSV» descarga `ecolima-v1.0.0-<ámbito>-lugares-para-revisar.csv`, con todos los lugares del ámbito y sus puntos existentes;
   - «Imprimir» abre el diálogo de impresión del navegador, desde el que también se guarda como PDF;
   - «Copiar resumen» copia un resumen en texto.
5. Las exportaciones incluyen solo el ámbito elegido y respetan los filtros aplicados en «Análisis».

### Administrador

El administrador hace todo lo anterior; las vistas de «Análisis» y «Reportes» son idénticas para los dos roles. Además:

**Cargar un dataset de puntos de reciclaje**

1. Ir a «Panel ML» y abrir la pestaña «Datos».
2. Pulsar «Subir nuevo dataset (CSV)», elegir el archivo y pulsar «Subir dataset». El dataset aparece en la tabla con estado «Pendiente».
   - Columnas obligatorias: `latitude`, `longitude`, `district_id` y `source`.
   - Columnas opcionales: `point_type`, `address`, `operator`, `materials_accepted` y `verified`.
   - Límite: 20 MB. El backend acepta CSV y XLSX, aunque el selector de archivos solo ofrece CSV.
3. Pulsar «Validar». El panel de resultados muestra los errores por fila y las coordenadas repetidas.
4. Si hay errores, corregir:
   - «Editar» en cada celda y «Guardar N ediciones»;
   - o seleccionar filas, escribir un motivo y pulsar «Eliminar N filas seleccionadas»;
   - o «Limpiar», que elimina las filas sin latitud, longitud o distrito.

   Después hay que validar de nuevo.
5. Con el estado «Válido», pulsar «Confirmar» y aceptar el diálogo «Confirmar dataset». Los puntos se agregan a la vista pública; el backend omite los duplicados de puntos que ya existen.
6. Con el estado «Confirmado», exportar con «CSV» o «XLSX». «Historial» muestra la línea de tiempo del dataset. «Eliminar» solo está disponible antes de confirmar.

**Gestionar usuarios**

1. Ir a «Usuarios».
2. «Crear usuario»: correo, nombre, contraseña (8 caracteres como mínimo, con mayúscula, minúscula y número), confirmación y rol (analista o administrador).
3. En la fila de un analista, usar «→ Admin» o «Desactivar»; en una cuenta inactiva, «Activar». Cada acción pide confirmación.
4. Las filas de otros administradores muestran «—» y la propia, «Tu cuenta», sin acciones.

### Analista o administrador: leer una sección de la ayuda por primera vez

1. Abrir la ayuda desde cualquiera de sus accesos, por ejemplo «Fuentes y limitaciones» en el aviso superior de Análisis. Esa es la sección de entrada.
2. Si es la primera vez para esa sección, el pie dice «Primera vez: desplázate hasta el final de este texto para poder cerrar.» y la X no responde.
3. Desplazar el texto hasta el final, con la rueda del mouse, el dedo o el teclado (Tab para enfocar el texto; luego flechas, RePág/AvPág, Espacio o Fin). La pestaña queda marcada como leída y el pie dice «Leíste «…» hasta el final. Ya puedes cerrar la ayuda.». Si el texto cabe entero, cuenta como leído en cuanto termina de cargar. Volver a subir no lo desmarca.
4. Las otras pestañas se pueden visitar sin obligación. Si en una de ellas el pie recuerda «Primera vez: para poder cerrar, desplázate hasta el final de «…».», se refiere a la sección de entrada.
5. Cerrar la ayuda. Se registran las secciones leídas completas que seguían pendientes. La próxima vez que se abra en una sección ya leída, se cierra sin condiciones.

### Administrador: ver quién leyó la ayuda

1. Ir a «Usuarios».
2. Debajo de «Usuarios del sistema», la sección «Lectura de la ayuda del Análisis» muestra, por sección, cuántas cuentas la leyeron, y una tabla con una columna por sección («Cómo se ordenan», «Fuentes y limitaciones» y «Acerca del modelo»): «Leída» con su fecha o «Pendiente». Primero aparecen las cuentas con más secciones pendientes.
3. «Actualizar» vuelve a consultar la lista.

### Analista o administrador: recuperar la contraseña

1. En el inicio de sesión, pulsar «¿Olvidaste tu contraseña?».
2. En «Recuperar contraseña», escribir el correo de la cuenta y pulsar «Enviar enlace».
3. Aparece siempre el mismo mensaje: «Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.». No indica si la cuenta existe.
4. Abrir el enlace del correo, que lleva a `/restablecer?token=…`.
5. Escribir la nueva contraseña y su confirmación. La pantalla muestra los requisitos («8 caracteres mínimo», «Una mayúscula», «Una minúscula», «Un número») y los marca a medida que se cumplen.
6. Pulsar «Cambiar contraseña». Si todo es correcto, aparece el mensaje de éxito y a los 3 segundos se vuelve al inicio de sesión.
7. Si el enlace ya venció o se usó, la pantalla lo indica y ofrece «Pedir un enlace nuevo».

### Ciudadano (público, sin cuenta): usar la vista pública

1. Abrir `/puntos`. El mapa empieza vacío; no se muestran puntos hasta buscar.
2. Elegir una de dos formas:
   - mover el mapa a una zona de Lima y pulsar «Buscar en esta zona», que busca alrededor del centro del mapa;
   - pulsar «Usar mi ubicación» y aceptar el permiso del navegador.
3. El frontend pide los puntos en un **radio de 2 km** (`radius_m = 2000`). El límite de 5 km y de 100 puntos por consulta existe solo en el backend; desde la interfaz no se puede pedir otro radio.
4. Filtrar por material con los botones «Papel», «Plástico», «Vidrio», «Metal» y «Cartón».
5. Hacer clic en un punto para ver su nombre, la distancia («A X m del punto de búsqueda») y lo que «Acepta:». Cerrar con la X («Cerrar detalle»).

## 3. Mensajes de error y estados vacíos

«Esperado» significa que el mensaje es el comportamiento correcto ante esa situación; no es un defecto.

| Pantalla | Mensaje en pantalla | Cuándo aparece | ¿Esperado? |
|---|---|---|---|
| Inicio de sesión | «Completa email y contraseña.» | Se envía el formulario con algún campo vacío | Sí |
| Inicio de sesión | «Credenciales inválidas. Intenta de nuevo.» | Correo o contraseña incorrectos (401) | Sí |
| Inicio de sesión | «Demasiados intentos de acceso. Intenta en N minutos.» | La cuenta quedó bloqueada por intentos fallidos (429 con detalle del backend) | Sí |
| Inicio de sesión | «Demasiados intentos de inicio de sesión. Espera un momento e intenta de nuevo.» | Se superan 5 intentos por minuto desde la misma IP (429 sin detalle) | Sí |
| Inicio de sesión | «No fue posible iniciar sesión. Verifica tus datos.» | Cualquier otro error, por ejemplo con el servidor apagado | Sí |
| Inicio de sesión | «Tu sesión expiró, vuelve a iniciar sesión.» | Se llega con un token vencido | Sí |
| Ayuda del Análisis (primera vez) | «Primera vez: desplázate hasta el final de este texto para poder cerrar.» | La sección de entrada aún no se leyó; la X no responde | Sí |
| Ayuda del Análisis (primera vez) | «Primera vez: para poder cerrar, desplázate hasta el final de «…».» | Se está en otra pestaña y falta leer la sección de entrada | Sí |
| Ayuda del Análisis (primera vez) | «Leíste «…» hasta el final. Ya puedes cerrar la ayuda.» (o sin la última frase en otras pestañas) | Se llegó al final de una sección pendiente | Sí |
| Ayuda del Análisis (primera vez) | «No se pudo guardar que leíste esta ayuda. Se te volverá a pedir la próxima vez que la abras. Puedes cerrarla.» | Falla el registro al cerrar; el siguiente intento cierra igual | Sí |
| Usuarios | «No se pudo cargar quién leyó la ayuda.» | Falla la lista de lecturas; «Actualizar» permite reintentar | Sí |
| Usuarios | «No hay cuentas que deban leer la ayuda.» | La lista llega vacía | Sí |
| Recuperar contraseña | «Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.» | Tras enviar el correo, con cualquier respuesta del servidor, exista o no la cuenta | Sí: no revela qué correos están registrados |
| Recuperar contraseña | «Ingresa tu correo electrónico.» / «Ingresa un correo electrónico válido.» | Campo vacío o con un formato inválido | Sí |
| Recuperar contraseña | «No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.» | El servidor no responde; el formulario queda disponible para reintentar | Sí |
| Nueva contraseña | «Este enlace no es válido: le falta el código de restablecimiento. Usa el enlace completo del correo o pide uno nuevo.» | Se abre `/restablecer` sin `token` en la URL | Sí |
| Nueva contraseña | «El enlace no es válido, ya venció o ya se usó. Pide uno nuevo para restablecer tu contraseña.» con «Pedir un enlace nuevo» | El servidor responde 400 | Sí |
| Nueva contraseña | El motivo que envía el servidor (por ejemplo, «La contraseña debe tener al menos un número.») | El servidor responde 422 | Sí |
| Nueva contraseña | «La contraseña no cumple los requisitos de seguridad.» / «Las contraseñas no coinciden.» | Validación antes de enviar | Sí |
| Nueva contraseña | «Tu contraseña se cambió correctamente. Te llevamos al inicio de sesión…» | El servidor responde 200; a los 3 segundos vuelve al inicio de sesión | Sí |
| Nueva contraseña | «No se pudo cambiar la contraseña. Intenta de nuevo en unos minutos.» / «No se pudo conectar con el servidor…» | Otro error del servidor, o el servidor no responde | Sí |
| Análisis y Reportes | «Cargando los resultados…» | Mientras se descargan los 2 242 sitios | Sí |
| Análisis y Reportes | «Todavía no hay resultados V1 cargados en el servidor.» | El backend no tiene un paquete activo | Sí |
| Análisis y Reportes | «No se pudo conectar con el servidor. Revisa que el backend esté encendido.» con «Reintentar» | Backend apagado o CORS rechazado | Sí |
| Análisis y Reportes | «Tu cuenta no tiene acceso a los resultados V1.» | El backend responde 403 | Sí |
| Análisis y Reportes | «No se pudieron cargar los resultados V1. Intenta de nuevo.» | Otro error de carga | Sí |
| Análisis | «Ningún lugar coincide con estos filtros.» con «Restablecer filtros» | Los filtros no dejan ningún lugar | Sí |
| Análisis | «No hay ningún tipo de lugar o grupo marcado.» | Se desmarcaron todos los tipos o grupos | Sí |
| Análisis y Reportes | «{distrito} no tiene lugares evaluados en la versión 1.0.0.» y «Sin lugares evaluados en {distrito}.» | Se elige Punta Hermosa, San Bartolo o Santa María del Mar | Sí |
| Análisis | «Selecciona un lugar en el mapa» | No hay ningún lugar elegido | Sí |
| Análisis | «No se pudo cargar el detalle de este lugar.» con «Reintentar» | Falla la petición del detalle | Sí |
| Análisis | «Mapa base no disponible: se muestran solo los límites distritales.» (en la leyenda) | No se pudo cargar OpenFreeMap en 8 segundos | Sí |
| Ayuda de Análisis | «No se pudieron cargar las fuentes.» / «No se pudo cargar la ficha del modelo.» | Falla la carga de esa pestaña de ayuda | Sí |
| Reportes | «Ningún lugar coincide con los filtros actuales.» con «Quitar filtros» | Los filtros de Análisis no dejan ningún lugar | Sí |
| Reportes | «Descargado: {archivo} (N filas)» / «Resumen de {ámbito} copiado.» | Exportación correcta (aviso temporal) | Sí |
| Reportes | «No se pudo copiar. Selecciona el texto manualmente.» | El navegador bloquea el portapapeles | Sí |
| Panel ML | «No se pudo cargar el Panel ML.» / «No se pudo cargar esta sección.» | Falla la carga de todo el panel o de un bloque | Sí |
| Panel ML | «Solo hay una versión registrada» | Hay un solo paquete importado | Sí (estado normal hoy) |
| Panel ML | «No se pudieron comparar las versiones.» | Falla la comparación (solo con dos o más versiones) | Sí |
| Panel ML › Datos | «Solo se permiten archivos CSV y XLSX.» | Se sube otro formato (lo responde el backend) | Sí |
| Panel ML › Datos | «El archivo excede el tamaño máximo permitido de 20MB.» | Archivo de más de 20 MB | Sí |
| Panel ML › Datos | «Faltan columnas: …» | Faltan columnas obligatorias | Sí |
| Panel ML › Datos | «Error al subir el archivo», «Error al validar el dataset», «Error al confirmar el dataset», etc. | Error sin mensaje propio del backend | Sí, genéricos |
| Usuarios | «Ingresa un email válido.», «La contraseña no cumple los requisitos de seguridad.», «Las contraseñas no coinciden.» | Validación del formulario «Crear usuario» | Sí |
| Usuarios | «No puedes modificar a otro administrador.», «No se puede dejar el sistema sin administradores activos.», «Activa la cuenta antes de promoverla a administrador.» | Salvaguardas del backend | Sí |
| Vista pública | «Sin puntos de reciclaje en esta zona» / «Mueve el mapa o busca en otra zona» | La búsqueda no devuelve puntos | Sí |
| Vista pública | «Geolocalización no disponible. Mueve el mapa y pulsa Buscar en esta zona.» | Se niega el permiso, falla o pasan 10 segundos | Sí |
| Vista pública | «La ubicación está fuera del área de Lima. Mueve el mapa dentro de la ciudad.» | Se busca con el centro del mapa fuera de Lima | Sí |
| Vista pública | «La ubicación está fuera del rango válido. Busca dentro de Lima.» | El backend rechaza las coordenadas (422) | Sí |
| Vista pública | «No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.» | Backend apagado o sin red | Sí |
| Cualquiera (cliente común) | «La solicitud tardó demasiado, intenta de nuevo.», «No tienes permisos para esta acción.», «Recurso no encontrado.», «Error del servidor, intenta más tarde.» | Timeout de 30 s, 403, 404 o 500 en peticiones autenticadas | Sí |

## 4. Funcionalidades del prototipo que ya no existen

Sirven para marcar como «no aplica» las historias de usuario del prototipo. Ninguna tiene código en la rama `v1.0.0-ajustes`.

| Funcionalidad del prototipo | Dónde estaba | Retirada en |
|---|---|---|
| Ejecutar inferencia del modelo con barra de progreso | Panel ML (`/api/v1/ml/run-inference`) | e70ab98 |
| Activar una versión de modelo desde la interfaz | Panel ML (`/api/v1/ml/models`) | e70ab98 |
| Recalcular cobertura | Panel ML (`/api/v1/geo/recalculate`) | e70ab98 |
| «Actualizar recomendaciones» y zonas recomendadas | Panel ML (botón) y mapa de Análisis (zonas) | e70ab98 y f37a780 |
| Gráfico SHAP de ejemplo | Panel ML (`ShapChart.vue`) | e70ab98 |
| Tarjetas de métricas del modelo de demostración (por ejemplo, accuracy) | Panel ML | e70ab98 |
| Indicadores de «datos de demostración» | Análisis y Panel ML | f37a780 y e70ab98 |
| Prioridad Alta, Media o Baja (`Badge`, `PriorityBar`) y filtros por NSE y prioridad | Análisis | f37a780 |
| Herramienta de medición de distancias | Mapa de Análisis | f37a780 |
| Capa de mapa de calor con métrica seleccionable | Mapa de Análisis | f37a780 |
| Filtro por material en el mapa interno | Mapa de Análisis | f37a780 (sigue existiendo en la vista pública) |
| Semáforo de redundancia de cobertura por distrito | Reportes | f37a780 |
| Mapa con Leaflet | Análisis | 818886a (reemplazado por MapLibre GL JS) |

Siguen existiendo, aunque vienen del prototipo: la gestión de datasets (pestaña «Datos» del Panel ML), la comparación de versiones (visible solo con dos o más versiones) y la gestión de usuarios.
