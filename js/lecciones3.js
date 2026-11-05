/* Lecciones 16 a 23: Parte 5 · Avanzado */
(function () {
  window.PARTES[16] = 'Parte 5 · Avanzado';
  ['UNION', 'ALL', 'VIEW', 'INDEX', 'EXPLAIN', 'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION', 'TRIGGER', 'GRANT', 'REVOKE', 'SUBSTR', 'REPLACE', 'TRIM', 'ANY'].forEach((k) => { if (window.KEYWORDS.indexOf(k) < 0) window.KEYWORDS.push(k); });
  const idxOf = (t) => "SELECT i.name AS indice, c.name AS columna, i.\"unique\" AS unico FROM pragma_index_list('" + t + "') i JOIN pragma_index_info(i.name) c ORDER BY i.name, c.seqno";
  const more = [
    /* ------------------------------------------------------------ 16 */
    {
      id: 16, titulo: 'Subconsultas', resumen: 'Una consulta dentro de otra.',
      aprender: [
        { t: 'p', x: 'Una **subconsulta** es un `SELECT` dentro de otro, entre paréntesis. La de adentro se resuelve primero y su resultado se usa en la de afuera.' },
        { t: 'p', x: '¿Quiénes tienen una nota **mayor al promedio**? Primero hay que saber el promedio, y eso es otra consulta:' },
        { t: 'code', sql: 'SELECT AVG(nota) FROM estudiantes' },
        { t: 'p', x: 'En vez de copiar el número a mano, pones la consulta dentro del `WHERE`:' },
        { t: 'code', sql: 'SELECT nombre, nota FROM estudiantes WHERE nota > (SELECT AVG(nota) FROM estudiantes)' },
        { t: 'p', x: 'Cuando la subconsulta devuelve **varios valores**, se usa `IN`. Estudiantes que **sí tienen notas** en la tabla notas:' },
        { t: 'code', sql: 'SELECT nombre FROM estudiantes WHERE id IN (SELECT estudiante_id FROM notas)' },
        { t: 'p', x: 'Con `NOT IN` buscas lo contrario: los que **no** aparecen.' },
        { t: 'code', sql: 'SELECT nombre FROM estudiantes WHERE id NOT IN (SELECT estudiante_id FROM notas)' },
        { t: 'p', x: '💡 Una subconsulta que da un solo valor (como el promedio) se compara con `>`, `=`, etc. Si da varios, usa `IN`.' }
      ],
      ejercicios: [
        { id: '16.1', texto: 'Muestra el **nombre** y la **nota** de los estudiantes con nota **mayor al promedio** de todos. Usa una subconsulta.', pista: 'WHERE nota > (SELECT AVG(nota) FROM estudiantes)', sol: 'SELECT nombre, nota FROM estudiantes WHERE nota > (SELECT AVG(nota) FROM estudiantes)' },
        { id: '16.2', texto: 'Muestra el **nombre** del estudiante (o los estudiantes) con la **nota más alta**. Usa una subconsulta con MAX.', pista: 'WHERE nota = (SELECT MAX(nota) FROM estudiantes)', sol: 'SELECT nombre FROM estudiantes WHERE nota = (SELECT MAX(nota) FROM estudiantes)' },
        { id: '16.3', texto: 'Muestra el **nombre** de los estudiantes que **sí tienen** notas en la tabla **notas**.', pista: 'WHERE id IN (SELECT estudiante_id FROM notas)', sol: 'SELECT nombre FROM estudiantes WHERE id IN (SELECT estudiante_id FROM notas)' },
        { id: '16.4', texto: 'Muestra el **nombre** de los estudiantes que **no tienen** ninguna nota en la tabla **notas**.', pista: 'Igual que el anterior pero con NOT IN.', sol: 'SELECT nombre FROM estudiantes WHERE id NOT IN (SELECT estudiante_id FROM notas)' },
        { id: '16.5', texto: 'Muestra el **nombre** de las materias que **tienen** notas registradas en la tabla **notas**.', pista: 'WHERE id IN (SELECT materia_id FROM notas)', sol: 'SELECT nombre FROM materias WHERE id IN (SELECT materia_id FROM notas)' },
        { id: '16.6', texto: "Muestra el **nombre** de los estudiantes con nota **mayor a la de Ana**. La nota de Ana debe salir de una subconsulta.", pista: "WHERE nota > (SELECT nota FROM estudiantes WHERE nombre = 'Ana')", sol: "SELECT nombre FROM estudiantes WHERE nota > (SELECT nota FROM estudiantes WHERE nombre = 'Ana')" }
      ],
      escribe: {
        pregunta: '¿Qué es una subconsulta y cuándo se usa IN en vez de un signo como ">"?',
        ideas: [
          { n: 'Que es un SELECT dentro de otro SELECT', p: ['dentro', 'adentro', 'select', 'consulta', 'parentesis'], tip: 'Una subconsulta es un SELECT dentro de otro, entre paréntesis.' },
          { n: 'Que la de adentro se resuelve primero', p: ['primero', 'antes', 'resuelve', 'resultado'], tip: 'La consulta de adentro se resuelve primero y su resultado lo usa la de afuera.' },
          { n: 'Que IN se usa cuando devuelve varios valores', p: ['varios', 'varias', 'muchos', 'lista', 'in', 'valores'], tip: 'IN se usa cuando la subconsulta devuelve varios valores.' },
          { n: 'Que con un solo valor se compara con >, =, etc.', p: ['solo', 'uno', 'unico', 'comparar', 'compara', 'mayor', 'igual', 'promedio'], tip: 'Si devuelve un solo valor (como un promedio) se compara con >, = o <.' }
        ],
        modelo: 'Una subconsulta es un SELECT dentro de otro, entre paréntesis. La de adentro se resuelve primero y su resultado lo usa la de afuera. Si devuelve un solo valor, como un promedio, se compara con >, = o <; si devuelve varios valores, se usa IN.'
      }
    },
    /* ------------------------------------------------------------ 17 */
    {
      id: 17, titulo: 'CASE y funciones de texto', resumen: 'Clasificar con CASE y trabajar con texto y números.',
      aprender: [
        { t: 'p', x: '`CASE` es el "si… entonces…" de SQL. Crea una columna nueva según una condición:' },
        { t: 'code', sql: "SELECT nombre, nota, CASE WHEN nota >= 70 THEN 'Aprobado' ELSE 'Reprobado' END AS estado FROM estudiantes" },
        { t: 'p', x: 'Puedes poner varias condiciones. Se revisan de arriba hacia abajo y gana la primera que se cumple:' },
        { t: 'code', sql: "SELECT nombre, nota, CASE WHEN nota >= 90 THEN 'A' WHEN nota >= 80 THEN 'B' WHEN nota >= 70 THEN 'C' ELSE 'D' END AS letra FROM estudiantes" },
        { t: 'p', x: 'Funciones de texto muy usadas: `UPPER` (mayúsculas), `LOWER` (minúsculas), `LENGTH` (cuántas letras) y `SUBSTR(texto, desde, cuántas)` (un pedazo):' },
        { t: 'code', sql: 'SELECT UPPER(nombre) AS nombre, LENGTH(nombre) AS letras, SUBSTR(nombre, 1, 1) AS inicial FROM estudiantes' },
        { t: 'p', x: 'Y para números, `ROUND(número, decimales)` redondea:' },
        { t: 'code', sql: 'SELECT ROUND(AVG(nota), 1) AS promedio FROM estudiantes' },
        { t: 'p', x: '⚠️ **Diferencia con MySQL:** para pegar textos aquí se usa `||` (`nombre || \' \' || ciudad`), pero en MySQL se usa `CONCAT(nombre, \' \', ciudad)`.' }
      ],
      ejercicios: [
        { id: '17.1', texto: "Muestra **nombre**, **nota** y una columna llamada **estado** que diga **'Aprobado'** si la nota es 70 o más, y **'Reprobado'** si no.", pista: "CASE WHEN nota >= 70 THEN 'Aprobado' ELSE 'Reprobado' END AS estado", sol: "SELECT nombre, nota, CASE WHEN nota >= 70 THEN 'Aprobado' ELSE 'Reprobado' END AS estado FROM estudiantes" },
        { id: '17.2', texto: 'Muestra los nombres de los estudiantes **en mayúsculas**, con la columna llamada **nombre**.', pista: 'SELECT UPPER(nombre) AS nombre FROM estudiantes', sol: 'SELECT UPPER(nombre) AS nombre FROM estudiantes' },
        { id: '17.3', texto: 'Muestra el **nombre** y cuántas letras tiene (columna **letras**) de los estudiantes cuyo nombre tiene **más de 5 letras**.', pista: 'LENGTH(nombre) AS letras, y en el WHERE LENGTH(nombre) > 5', sol: 'SELECT nombre, LENGTH(nombre) AS letras FROM estudiantes WHERE LENGTH(nombre) > 5' },
        { id: '17.4', texto: 'Muestra el **promedio** de notas de todos los estudiantes, **redondeado a 1 decimal**, en una columna llamada **promedio**.', pista: 'ROUND(AVG(nota), 1) AS promedio', sol: 'SELECT ROUND(AVG(nota), 1) AS promedio FROM estudiantes' },
        { id: '17.5', texto: 'Muestra la **inicial** del nombre (primera letra) de cada estudiante, en una columna llamada **inicial**.', pista: 'SUBSTR(nombre, 1, 1) AS inicial', sol: 'SELECT SUBSTR(nombre, 1, 1) AS inicial FROM estudiantes' },
        { id: '17.6', texto: "Cuenta cuántos estudiantes hay de cada **estado** (**'Aprobado'** si nota >= 70, si no **'Reprobado'**). Muestra las columnas **estado** y **total**.", pista: 'Usa el mismo CASE de antes, COUNT(*) AS total y GROUP BY estado.', sol: "SELECT CASE WHEN nota >= 70 THEN 'Aprobado' ELSE 'Reprobado' END AS estado, COUNT(*) AS total FROM estudiantes GROUP BY estado" }
      ],
      escribe: {
        pregunta: '¿Para qué sirve CASE y qué funciones de texto aprendiste?',
        ideas: [
          { n: 'Que CASE crea una columna según condiciones (como un si/entonces)', p: ['case', 'si', 'condicion', 'condiciones', 'entonces', 'clasifica', 'clasificar', 'when'], tip: 'CASE crea una columna según condiciones, como un "si… entonces…".' },
          { n: 'Que UPPER y LOWER cambian mayúsculas y minúsculas', p: ['upper', 'lower', 'mayuscula', 'mayusculas', 'minuscula', 'minusculas'], tip: 'UPPER pone mayúsculas y LOWER minúsculas.' },
          { n: 'Que LENGTH cuenta las letras', p: ['length', 'letras', 'largo', 'cuenta', 'cuantas', 'longitud'], tip: 'LENGTH dice cuántas letras tiene un texto.' },
          { n: 'Que ROUND redondea o SUBSTR toma un pedazo', p: ['round', 'redondea', 'redondear', 'substr', 'pedazo', 'parte'], tip: 'ROUND redondea números y SUBSTR toma un pedazo de un texto.' }
        ],
        modelo: 'CASE crea una columna nueva según condiciones, como un "si… entonces…". UPPER y LOWER cambian a mayúsculas o minúsculas, LENGTH cuenta las letras, SUBSTR toma un pedazo del texto y ROUND redondea números.'
      }
    },
    /* ------------------------------------------------------------ 18 */
    {
      id: 18, titulo: 'UNION: unir resultados', resumen: 'Juntar los resultados de dos consultas en una sola lista.',
      aprender: [
        { t: 'p', x: 'Un `JOIN` junta **columnas** de dos tablas. `UNION` hace otra cosa: junta **filas** de dos consultas, una debajo de la otra.' },
        { t: 'p', x: 'Reglas: las dos consultas deben tener **el mismo número de columnas**, y los datos de cada columna deben ser parecidos.' },
        { t: 'p', x: 'Todos los nombres de personas del colegio (estudiantes y profesores) en una sola lista:' },
        { t: 'code', sql: 'SELECT nombre FROM estudiantes UNION SELECT nombre FROM profesores' },
        { t: 'p', x: '`UNION` **quita las filas repetidas**. Si quieres dejarlas, usa `UNION ALL`:' },
        { t: 'code', sql: "SELECT ciudad FROM estudiantes WHERE curso = '1ro' UNION ALL SELECT ciudad FROM estudiantes WHERE curso = '2do'" },
        { t: 'p', x: 'El `ORDER BY` va **una sola vez, al final**, y ordena todo el resultado:' },
        { t: 'code', sql: 'SELECT nombre FROM estudiantes UNION SELECT nombre FROM profesores ORDER BY nombre' }
      ],
      ejercicios: [
        { id: '18.1', texto: 'Muestra una sola lista con los **nombres** de **estudiantes** y de **profesores**, ordenada por nombre.', pista: 'SELECT nombre FROM estudiantes UNION SELECT nombre FROM profesores ORDER BY nombre', sol: 'SELECT nombre FROM estudiantes UNION SELECT nombre FROM profesores ORDER BY nombre' },
        { id: '18.2', texto: "Muestra los **nombres** de los estudiantes del curso **'1ro'** juntos con los que viven en **'Bonao'**, sin repetidos (usa UNION).", pista: "Dos SELECT de nombre con WHERE distinto, unidos con UNION.", sol: "SELECT nombre FROM estudiantes WHERE curso = '1ro' UNION SELECT nombre FROM estudiantes WHERE ciudad = 'Bonao'" },
        { id: '18.3', texto: "Haz lo mismo del ejercicio anterior pero **dejando los repetidos** (UNION ALL).", pista: 'Cambia UNION por UNION ALL.', sol: "SELECT nombre FROM estudiantes WHERE curso = '1ro' UNION ALL SELECT nombre FROM estudiantes WHERE ciudad = 'Bonao'" },
        { id: '18.4', texto: 'Muestra las **ciudades** de los estudiantes **sin repetir**, usando **UNION** de dos consultas: una con los de edad **13** y otra con los de edad **mayor a 13**.', pista: 'SELECT ciudad ... WHERE edad = 13 UNION SELECT ciudad ... WHERE edad > 13', sol: 'SELECT ciudad FROM estudiantes WHERE edad = 13 UNION SELECT ciudad FROM estudiantes WHERE edad > 13' },
        { id: '18.5', texto: '¿Cuál es la diferencia entre **UNION** y **UNION ALL**?', q: { opts: ['UNION ALL deja los repetidos y UNION los quita', 'UNION ALL ordena el resultado y UNION no', 'UNION junta columnas y UNION ALL junta filas', 'No hay diferencia'], ok: 0 }, fb: 'UNION quita las filas repetidas; UNION ALL las deja todas (y es más rápido).' }
      ],
      escribe: {
        pregunta: '¿Qué hace UNION, qué reglas tiene y en qué se diferencia de UNION ALL?',
        ideas: [
          { n: 'Que junta los resultados de dos consultas, filas debajo de filas', p: ['junta', 'unir', 'une', 'juntar', 'resultados', 'consultas', 'filas'], tip: 'UNION junta los resultados de dos consultas, una debajo de la otra.' },
          { n: 'Que deben tener el mismo número de columnas', p: ['mismo', 'misma', 'igual', 'columnas', 'numero', 'cantidad'], tip: 'Las dos consultas deben tener el mismo número de columnas.' },
          { n: 'Que UNION quita repetidos', p: ['quita', 'elimina', 'repetidos', 'repetidas', 'duplicados', 'duplicadas', 'repite'], tip: 'UNION quita las filas repetidas.' },
          { n: 'Que UNION ALL deja los repetidos', p: ['all', 'deja', 'mantiene', 'todos', 'todas'], tip: 'UNION ALL deja todas las filas, incluso las repetidas.' }
        ],
        modelo: 'UNION junta los resultados de dos consultas, una fila debajo de otra. Las dos consultas deben tener el mismo número de columnas. UNION quita las filas repetidas y UNION ALL las deja todas.'
      }
    },
    /* ------------------------------------------------------------ 19 */
    {
      id: 19, titulo: 'Índices: buscar más rápido', resumen: 'Qué son los índices, cuándo crearlos y cómo verlos en MySQL.',
      aprender: [
        { t: 'p', x: 'Imagina buscar una palabra en un libro de 1000 páginas **sin índice**: tienes que leer todo. Con el **índice** del final vas directo a la página. En una base de datos pasa lo mismo.' },
        { t: 'p', x: 'Un **índice** hace que las búsquedas por una columna sean mucho más rápidas, sobre todo cuando la tabla tiene miles o millones de filas. Se crea así:' },
        { t: 'code', sql: 'CREATE INDEX idx_estudiantes_nota ON estudiantes(nota)', ver: "SELECT name FROM pragma_index_list('estudiantes')" },
        { t: 'p', x: 'Un índice `UNIQUE` además **impide valores repetidos** en esa columna:' },
        { t: 'code', sql: 'CREATE UNIQUE INDEX idx_profesores_nombre ON profesores(nombre)', ver: "SELECT name, \"unique\" FROM pragma_index_list('profesores')" },
        { t: 'p', x: 'Y se borra con `DROP INDEX nombre_del_indice`.' },
        { t: 'p', x: '**¿Cuándo crear un índice?** En las columnas que usas mucho en `WHERE`, `JOIN` u `ORDER BY`. La llave primaria ya tiene índice sola.' },
        { t: 'p', x: '**¿Cuándo no?** Cada índice ocupa espacio y hace más lento `INSERT`, `UPDATE` y `DELETE`, porque hay que actualizarlo. No pongas índices en todo.' },
        { t: 'p', x: '**En MySQL:** para ver si una consulta usa un índice, escribe `EXPLAIN` antes del `SELECT`:' },
        { t: 'pre', x: "EXPLAIN SELECT * FROM estudiantes WHERE nota > 80;\n-- En la columna \"key\" aparece el índice que usó.\n-- Si key dice NULL, leyó toda la tabla.\n\n-- Ver los índices de una tabla en MySQL:\nSHOW INDEX FROM estudiantes;" }
      ],
      ejercicios: [
        { id: '19.1', texto: 'Crea un índice llamado **idx_estudiantes_nota** sobre la columna **nota** de **estudiantes**.', pista: 'CREATE INDEX idx_estudiantes_nota ON estudiantes(nota)', sol: 'CREATE INDEX idx_estudiantes_nota ON estudiantes(nota)', verify: idxOf('estudiantes') },
        { id: '19.2', texto: 'Crea un índice llamado **idx_estudiantes_ciudad** sobre la columna **ciudad** de **estudiantes**.', pista: 'CREATE INDEX idx_estudiantes_ciudad ON estudiantes(ciudad)', sol: 'CREATE INDEX idx_estudiantes_ciudad ON estudiantes(ciudad)', verify: idxOf('estudiantes') },
        { id: '19.3', texto: 'Crea un índice **UNIQUE** llamado **idx_profesores_nombre** sobre la columna **nombre** de **profesores**.', pista: 'CREATE UNIQUE INDEX idx_profesores_nombre ON profesores(nombre)', sol: 'CREATE UNIQUE INDEX idx_profesores_nombre ON profesores(nombre)', verify: idxOf('profesores') },
        { id: '19.4', texto: '¿Para qué sirve principalmente un **índice**?', q: { opts: ['Para que las búsquedas sean más rápidas', 'Para que la tabla ocupe menos espacio', 'Para proteger la tabla con contraseña', 'Para que no se pueda borrar la tabla'], ok: 0 }, fb: 'Un índice acelera las búsquedas, como el índice de un libro.' },
        { id: '19.5', texto: '¿Cuál es la **desventaja** de tener demasiados índices?', q: { opts: ['Las consultas SELECT dejan de funcionar', 'Ocupan espacio y hacen más lentos INSERT, UPDATE y DELETE', 'Cambian los datos de la tabla', 'MySQL no permite más de 3'], ok: 1 }, fb: 'Cada índice hay que mantenerlo al día cuando cambian los datos, y ocupa espacio.' },
        { id: '19.6', texto: 'En **MySQL**, ¿qué escribes **antes de un SELECT** para ver cómo lo va a ejecutar y qué índice usa?', q: { opts: ['SHOW SELECT', 'EXPLAIN', 'DESCRIBE', 'ANALYZE TABLE'], ok: 1 }, fb: 'EXPLAIN SELECT ... muestra el plan: qué índice usa (columna key) y cuántas filas revisa.' }
      ],
      escribe: {
        pregunta: '¿Qué es un índice, cuándo conviene crearlo y qué desventaja tiene?',
        ideas: [
          { n: 'Que un índice acelera las búsquedas', p: ['rapido', 'rapida', 'rapidas', 'acelera', 'acelerar', 'busqueda', 'busquedas', 'buscar', 'velocidad'], tip: 'Un índice hace las búsquedas más rápidas.' },
          { n: 'Que se crea en columnas usadas en WHERE, JOIN u ORDER BY', p: ['where', 'join', 'order', 'columna', 'columnas', 'usa', 'usan', 'mucho'], tip: 'Conviene crearlo en columnas que se usan mucho en WHERE, JOIN u ORDER BY.' },
          { n: 'Que hace más lentos INSERT, UPDATE y DELETE', p: ['lento', 'lentos', 'lenta', 'insert', 'update', 'delete', 'escribir', 'cambios'], tip: 'Hace más lentos INSERT, UPDATE y DELETE.' },
          { n: 'Que ocupa espacio', p: ['espacio', 'ocupa', 'memoria', 'disco'], tip: 'Un índice también ocupa espacio.' }
        ],
        modelo: 'Un índice hace las búsquedas más rápidas, como el índice de un libro. Conviene crearlo en columnas que se usan mucho en WHERE, JOIN u ORDER BY. Su desventaja es que ocupa espacio y hace más lentos INSERT, UPDATE y DELETE, por eso no se pone en todas las columnas.'
      }
    },
    /* ------------------------------------------------------------ 20 */
    {
      id: 20, titulo: 'Vistas', resumen: 'Guardar una consulta con nombre para usarla como si fuera una tabla.',
      aprender: [
        { t: 'p', x: 'Una **vista** es una consulta guardada con un nombre. Se usa como si fuera una tabla, pero **no guarda datos propios**: cada vez que la consultas, se vuelve a ejecutar la consulta.' },
        { t: 'p', x: 'Es útil para no repetir consultas largas, y para **mostrar solo algunas columnas** a ciertas personas.' },
        { t: 'code', sql: 'CREATE VIEW aprobados AS SELECT id, nombre, nota FROM estudiantes WHERE nota >= 70', ver: 'SELECT * FROM aprobados' },
        { t: 'p', x: 'Una vez creada, la consultas igual que una tabla:' },
        { t: 'code', sql: 'CREATE VIEW aprobados AS SELECT id, nombre, nota FROM estudiantes WHERE nota >= 70;\nSELECT nombre FROM aprobados WHERE nota > 85' },
        { t: 'p', x: 'Una vista puede tener `JOIN`, para dejar listo un resultado que usas mucho:' },
        { t: 'code', sql: 'CREATE VIEW boletin AS SELECT e.nombre AS estudiante, m.nombre AS materia, n.nota FROM notas n JOIN estudiantes e ON e.id = n.estudiante_id JOIN materias m ON m.id = n.materia_id;\nSELECT * FROM boletin LIMIT 5' },
        { t: 'p', x: 'Se borra con `DROP VIEW nombre`. Borrar la vista **no borra** los datos de las tablas.' }
      ],
      ejercicios: [
        { id: '20.1', texto: 'Crea una vista llamada **aprobados** con **id, nombre y nota** de los estudiantes con nota **70 o más**.', pista: 'CREATE VIEW aprobados AS SELECT id, nombre, nota FROM estudiantes WHERE nota >= 70', sol: 'CREATE VIEW aprobados AS SELECT id, nombre, nota FROM estudiantes WHERE nota >= 70', verify: 'SELECT * FROM aprobados ORDER BY id' },
        { id: '20.2', texto: "Crea una vista llamada **de_bonao** con **todas las columnas** de los estudiantes que viven en **'Bonao'**. Luego, en la misma ejecución, muestra solo los **nombres** de esa vista.", pista: "CREATE VIEW de_bonao AS SELECT * FROM estudiantes WHERE ciudad = 'Bonao'; y después SELECT nombre FROM de_bonao", sol: "CREATE VIEW de_bonao AS SELECT * FROM estudiantes WHERE ciudad = 'Bonao'; SELECT nombre FROM de_bonao" },
        { id: '20.3', texto: 'Crea una vista llamada **boletin** con las columnas **estudiante** (nombre del estudiante), **materia** (nombre de la materia) y **nota**, uniendo **notas**, **estudiantes** y **materias**.', pista: 'JOIN notas con estudiantes (estudiante_id = id) y con materias (materia_id = id). Usa AS para nombrar las columnas.', sol: 'CREATE VIEW boletin AS SELECT e.nombre AS estudiante, m.nombre AS materia, n.nota FROM notas n JOIN estudiantes e ON e.id = n.estudiante_id JOIN materias m ON m.id = n.materia_id', verify: 'SELECT * FROM boletin ORDER BY estudiante, materia' },
        { id: '20.4', texto: '¿Una **vista** guarda una copia de los datos?', q: { opts: ['Sí, guarda una copia que hay que actualizar a mano', 'No, guarda la consulta y calcula el resultado cada vez', 'Sí, pero solo de las primeras 100 filas', 'No, y por eso no se puede consultar'], ok: 1 }, fb: 'Una vista guarda la consulta, no los datos. Siempre muestra la información actual de las tablas.' },
        { id: '20.5', texto: '¿Qué comando **borra una vista** llamada aprobados?', q: { opts: ['DELETE VIEW aprobados', 'REMOVE VIEW aprobados', 'DROP VIEW aprobados', 'DROP TABLE aprobados'], ok: 2 }, fb: 'DROP VIEW aprobados; Borra la vista, pero no los datos de las tablas.' }
      ],
      escribe: {
        pregunta: '¿Qué es una vista y para qué sirve?',
        ideas: [
          { n: 'Que es una consulta guardada con un nombre', p: ['consulta', 'guardada', 'guarda', 'nombre', 'select'], tip: 'Una vista es una consulta guardada con un nombre.' },
          { n: 'Que se usa como una tabla', p: ['tabla', 'igual', 'como'], tip: 'Se usa como si fuera una tabla.' },
          { n: 'Que no guarda datos propios', p: ['datos', 'copia', 'propios', 'actualiza', 'actual', 'actuales'], tip: 'No guarda datos propios: siempre muestra los datos actuales de las tablas.' },
          { n: 'Que evita repetir consultas o muestra solo ciertas columnas', p: ['repetir', 'larga', 'largas', 'facil', 'simple', 'simplifica', 'columnas', 'oculta', 'seguridad'], tip: 'Sirve para no repetir consultas largas o mostrar solo algunas columnas.' }
        ],
        modelo: 'Una vista es una consulta guardada con un nombre que se usa como si fuera una tabla. No guarda datos propios, siempre muestra los datos actuales. Sirve para no repetir consultas largas y para mostrar solo algunas columnas.'
      }
    },
    /* ------------------------------------------------------------ 21 */
    {
      id: 21, titulo: 'Transacciones', resumen: 'Hacer varios cambios como una sola operación: todo o nada.',
      aprender: [
        { t: 'p', x: 'Imagina pasar dinero de la cuenta A a la B: primero se resta en A y luego se suma en B. Si falla la luz entre los dos pasos, el dinero **desaparece**. Una **transacción** evita eso: o se hacen **todos** los pasos, o **ninguno**.' },
        { t: 'p', x: '`BEGIN` empieza la transacción. `COMMIT` la **confirma** (los cambios quedan). `ROLLBACK` la **cancela** (todo vuelve a como estaba).' },
        { t: 'p', x: 'Prueba cancelar. La nota de Ana cambia dentro de la transacción, pero el `ROLLBACK` la deja como estaba:' },
        { t: 'code', sql: "BEGIN;\nUPDATE estudiantes SET nota = 0 WHERE nombre = 'Ana';\nROLLBACK;\nSELECT nombre, nota FROM estudiantes WHERE nombre = 'Ana'" },
        { t: 'p', x: 'Y ahora confirmando con `COMMIT`:' },
        { t: 'code', sql: "BEGIN;\nUPDATE estudiantes SET nota = 100 WHERE nombre = 'Ana';\nCOMMIT;\nSELECT nombre, nota FROM estudiantes WHERE nombre = 'Ana'" },
        { t: 'p', x: '⚠️ **Diferencia con MySQL:** en MySQL se escribe `START TRANSACTION;` (aunque `BEGIN` también funciona), y las tablas deben ser **InnoDB** (el tipo normal hoy). Con `SET autocommit = 0;` MySQL no confirma solo.' },
        { t: 'p', x: 'Las transacciones cumplen las propiedades **ACID**: Atomicidad (todo o nada), Consistencia (no rompe las reglas), Aislamiento (no se mezclan con las de otros) y Durabilidad (lo confirmado no se pierde).' }
      ],
      ejercicios: [
        { id: '21.1', texto: "Empieza una transacción, cambia la nota de **Ana** a **0**, y **cancela** todo con ROLLBACK. La nota de Ana debe quedar como estaba.", pista: "BEGIN; UPDATE ... WHERE nombre = 'Ana'; ROLLBACK;", sol: "BEGIN; UPDATE estudiantes SET nota = 0 WHERE nombre = 'Ana'; ROLLBACK", must: [[/\b(begin|start\s+transaction)\b/i, 'BEGIN'], [/\brollback\b/i, 'ROLLBACK']], verify: allEstSql() },
        { id: '21.2', texto: "Empieza una transacción, cambia la nota de **Ana** a **100** y **confirma** con COMMIT.", pista: "BEGIN; UPDATE ... WHERE nombre = 'Ana'; COMMIT;", sol: "BEGIN; UPDATE estudiantes SET nota = 100 WHERE nombre = 'Ana'; COMMIT", must: [[/\b(begin|start\s+transaction)\b/i, 'BEGIN'], [/\bcommit\b/i, 'COMMIT']], verify: allEstSql() },
        { id: '21.3', texto: '¿Qué comando **confirma** los cambios de una transacción?', q: { opts: ['ROLLBACK', 'COMMIT', 'SAVE', 'END TRANSACTION'], ok: 1 }, fb: 'COMMIT confirma: los cambios quedan guardados. ROLLBACK es el que cancela.' },
        { id: '21.4', texto: 'Si en una transferencia falla el segundo paso, ¿qué haces para que el primer paso **no quede hecho**?', q: { opts: ['COMMIT', 'ROLLBACK', 'DROP', 'Nada, se arregla solo'], ok: 1 }, fb: 'ROLLBACK cancela todos los cambios de la transacción, como si nada hubiera pasado.' },
        { id: '21.5', texto: 'En **MySQL**, ¿cómo se empieza una transacción normalmente?', q: { opts: ['OPEN TRANSACTION;', 'START TRANSACTION;', 'INIT;', 'TRANSACTION ON;'], ok: 1 }, fb: 'START TRANSACTION; (BEGIN; también funciona). Se confirma con COMMIT; y se cancela con ROLLBACK;.' },
        { id: '21.6', texto: 'La **A** de ACID significa **Atomicidad**. ¿Qué quiere decir?', q: { opts: ['Que la transacción es muy rápida', 'Que se hacen todos los pasos o ninguno', 'Que solo un usuario puede entrar', 'Que los datos se encriptan'], ok: 1 }, fb: 'Atomicidad: la transacción es "indivisible". O se aplican todos sus cambios o no se aplica ninguno.' }
      ],
      escribe: {
        pregunta: '¿Qué es una transacción y para qué sirven COMMIT y ROLLBACK?',
        ideas: [
          { n: 'Que agrupa varios cambios como una sola operación (todo o nada)', p: ['todo', 'nada', 'varios', 'varias', 'pasos', 'cambios', 'grupo', 'agrupa', 'una'], tip: 'Una transacción agrupa varios cambios: o se hacen todos o no se hace ninguno.' },
          { n: 'Que COMMIT confirma los cambios', p: ['commit', 'confirma', 'confirmar', 'guarda', 'guardar'], tip: 'COMMIT confirma y guarda los cambios.' },
          { n: 'Que ROLLBACK cancela los cambios', p: ['rollback', 'cancela', 'cancelar', 'deshace', 'deshacer', 'vuelve', 'revierte'], tip: 'ROLLBACK cancela y deshace los cambios.' },
          { n: 'Un ejemplo, como una transferencia de dinero', p: ['dinero', 'transferencia', 'cuenta', 'cuentas', 'banco', 'ejemplo', 'falla', 'error'], tip: 'Da un ejemplo, como una transferencia de dinero entre cuentas.' }
        ],
        modelo: 'Una transacción agrupa varios cambios como una sola operación: o se hacen todos o no se hace ninguno. COMMIT confirma y guarda los cambios, y ROLLBACK los cancela. Por ejemplo, en una transferencia de dinero, si falla un paso se cancela todo.'
      }
    },
    /* ------------------------------------------------------------ 22 */
    {
      id: 22, titulo: 'Triggers y procedimientos', resumen: 'Código que vive dentro de la base de datos (MySQL).',
      aprender: [
        { t: 'p', x: 'Hasta ahora tú escribías cada consulta. Pero una base de datos también puede **guardar código** y ejecutarlo sola. Esta lección es sobre todo para **MySQL**, así que léela con calma y pruébala en MySQL Workbench.' },
        { t: 'p', x: 'Un **trigger** (disparador) es código que se ejecuta **solo** cuando ocurre algo: un `INSERT`, un `UPDATE` o un `DELETE`. Por ejemplo, guardar un registro cada vez que se borra un estudiante:' },
        { t: 'copy', x: "CREATE TABLE auditoria (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  mensaje VARCHAR(100),\n  fecha DATETIME DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TRIGGER antes_de_borrar\nBEFORE DELETE ON estudiantes\nFOR EACH ROW\nINSERT INTO auditoria (mensaje)\nVALUES (CONCAT('Se borró a ', OLD.nombre));" },
        { t: 'p', x: '`OLD` es la fila **antes** del cambio y `NEW` es la fila **después**. `BEFORE` o `AFTER` dice cuándo se dispara.' },
        { t: 'p', x: 'Un **procedimiento almacenado** es un conjunto de instrucciones con nombre, que ejecutas cuando quieras con `CALL`:' },
        { t: 'copy', x: "DELIMITER //\nCREATE PROCEDURE aprobados_de(IN curso_buscado VARCHAR(10))\nBEGIN\n  SELECT nombre, nota\n  FROM estudiantes\n  WHERE curso = curso_buscado AND nota >= 70;\nEND //\nDELIMITER ;\n\nCALL aprobados_de('1ro');" },
        { t: 'p', x: '`DELIMITER //` es un truco para que MySQL no se confunda con los `;` que están **dentro** del procedimiento.' },
        { t: 'p', x: 'Para ver o borrar: `SHOW TRIGGERS;`, `DROP TRIGGER nombre;`, `SHOW PROCEDURE STATUS;`, `DROP PROCEDURE nombre;`.' }
      ],
      ejercicios: [
        { id: '22.1', texto: '¿Cuándo se ejecuta un **trigger**?', q: { opts: ['Cuando tú lo llamas con CALL', 'Solo una vez al día', 'Solo cuando ocurre un INSERT, UPDATE o DELETE en su tabla', 'Cuando abres MySQL'], ok: 2 }, fb: 'Un trigger se dispara solo cuando ocurre el evento para el que se creó (INSERT, UPDATE o DELETE).' },
        { id: '22.2', texto: 'En un trigger de MySQL, ¿qué es **OLD**?', q: { opts: ['La fila antes del cambio', 'La fila después del cambio', 'La tabla más vieja', 'El usuario anterior'], ok: 0 }, fb: 'OLD es la fila como estaba antes del cambio y NEW como queda después.' },
        { id: '22.3', texto: '¿Con qué comando **ejecutas** un procedimiento almacenado?', q: { opts: ['RUN', 'EXEC', 'CALL', 'START'], ok: 2 }, fb: 'En MySQL se ejecuta con CALL nombre(...);' },
        { id: '22.4', texto: '¿Para qué se usa **DELIMITER //** al crear un procedimiento?', q: { opts: ['Para que MySQL no termine la instrucción en los ; de adentro', 'Para dividir la tabla en dos', 'Para comentar código', 'Para ejecutarlo dos veces'], ok: 0 }, fb: 'Cambia temporalmente el símbolo que termina una instrucción, así los ; internos no cortan el procedimiento.' },
        { id: '22.5', texto: '¿Cuál es una **ventaja** de un procedimiento almacenado?', q: { opts: ['Se reutiliza con una sola llamada en vez de repetir las consultas', 'Hace que no se necesiten tablas', 'Convierte MySQL en SQLite', 'Borra los datos viejos solo'], ok: 0 }, fb: 'Guardas la lógica una vez en la base de datos y la reutilizas con CALL.' }
      ],
      escribe: {
        pregunta: 'Explica qué es un trigger y qué es un procedimiento almacenado.',
        ideas: [
          { n: 'Que un trigger se ejecuta solo cuando ocurre un INSERT, UPDATE o DELETE', p: ['trigger', 'solo', 'automatico', 'automatica', 'automaticamente', 'dispara', 'insert', 'update', 'delete', 'evento'], tip: 'Un trigger se ejecuta solo cuando ocurre un INSERT, UPDATE o DELETE.' },
          { n: 'Que un procedimiento es un conjunto de instrucciones con nombre', p: ['procedimiento', 'conjunto', 'instrucciones', 'nombre', 'guardado', 'guardadas'], tip: 'Un procedimiento almacenado es un conjunto de instrucciones guardadas con un nombre.' },
          { n: 'Que el procedimiento se ejecuta con CALL', p: ['call', 'llama', 'llamar', 'ejecuta', 'ejecutar'], tip: 'El procedimiento se ejecuta con CALL.' },
          { n: 'Que se guardan dentro de la base de datos y se reutilizan', p: ['reutiliza', 'reutilizar', 'repetir', 'dentro', 'guardan', 'base'], tip: 'Ambos se guardan dentro de la base de datos y se pueden reutilizar.' }
        ],
        modelo: 'Un trigger es código que se ejecuta solo cuando ocurre un INSERT, UPDATE o DELETE en una tabla. Un procedimiento almacenado es un conjunto de instrucciones guardadas con un nombre que se ejecuta con CALL. Los dos viven dentro de la base de datos y se reutilizan.'
      }
    },
    /* ------------------------------------------------------------ 23 */
    {
      id: 23, titulo: 'Usuarios, permisos y respaldos', resumen: 'Quién puede hacer qué, y cómo no perder tus datos (MySQL).',
      aprender: [
        { t: 'p', x: 'Una base de datos real **no se usa siempre como root**. Cada persona o programa tiene su **usuario**, con solo los **permisos** que necesita. Así un error (o un ataque) hace menos daño.' },
        { t: 'p', x: 'En MySQL, como root, creas un usuario y le das permisos con `GRANT`:' },
        { t: 'copy', x: "CREATE USER 'maestra'@'localhost' IDENTIFIED BY 'una_clave_segura';\n\n-- Solo puede LEER la base colegio:\nGRANT SELECT ON colegio.* TO 'maestra'@'localhost';\n\n-- Puede leer y también agregar y cambiar:\nGRANT SELECT, INSERT, UPDATE ON colegio.* TO 'secretaria'@'localhost';\n\n-- Quitar un permiso:\nREVOKE UPDATE ON colegio.* FROM 'secretaria'@'localhost';\n\n-- Ver los permisos:\nSHOW GRANTS FOR 'maestra'@'localhost';" },
        { t: 'p', x: '**Regla de oro:** da siempre el **mínimo permiso necesario**. Una aplicación que solo muestra notas no necesita `DELETE` ni `DROP`.' },
        { t: 'p', x: 'Los **respaldos** (copias de seguridad) son lo más importante: los discos fallan, se borran tablas por error. En MySQL se hacen con `mysqldump`, desde la terminal (no desde Workbench):' },
        { t: 'copy', x: "mysqldump -u root -p colegio > colegio_respaldo.sql\n\n# Para restaurarlo:\nmysql -u root -p colegio < colegio_respaldo.sql" },
        { t: 'p', x: 'Un buen respaldo es el que **probaste restaurar**. Hazlos con frecuencia y guarda una copia **fuera** de tu computadora (en una memoria USB o en la nube).' },
        { t: 'p', x: '🎓 Esta es la última lección. En **Mis bases** puedes crear las tuyas y descargarlas como `.sql` para MySQL.' }
      ],
      ejercicios: [
        { id: '23.1', texto: '¿Qué comando **da un permiso** a un usuario en MySQL?', q: { opts: ['ALLOW', 'GRANT', 'GIVE', 'PERMIT'], ok: 1 }, fb: 'GRANT da permisos y REVOKE los quita.' },
        { id: '23.2', texto: 'Una aplicación solo **muestra** las notas. ¿Qué permisos le das?', q: { opts: ['ALL PRIVILEGES', 'SELECT', 'SELECT, DELETE, DROP', 'Ninguno, usa root'], ok: 1 }, fb: 'El mínimo necesario: solo SELECT. Usar root o permisos de más es un riesgo de seguridad.' },
        { id: '23.3', texto: '¿Qué comando **quita** un permiso?', q: { opts: ['REVOKE', 'REMOVE', 'DROP GRANT', 'DENY'], ok: 0 }, fb: 'REVOKE quita permisos que se habían dado con GRANT.' },
        { id: '23.4', texto: '¿Con qué herramienta de MySQL haces una **copia de seguridad** en un archivo .sql?', q: { opts: ['mysqldump', 'mysqlcopy', 'SELECT BACKUP', 'EXPORT TABLE'], ok: 0 }, fb: 'mysqldump genera un archivo .sql que se restaura con el comando mysql.' },
        { id: '23.5', texto: '¿Cuál es la **mejor práctica** con los respaldos?', q: { opts: ['Hacer uno al año', 'Guardarlo en el mismo disco de la base de datos', 'Hacerlos seguido, guardarlos en otro lugar y probar que se pueden restaurar', 'No hacerlos si la base es pequeña'], ok: 2 }, fb: 'Un respaldo que nunca probaste restaurar no es de fiar, y debe estar en otro lugar distinto al original.' }
      ],
      escribe: {
        pregunta: '¿Por qué se usan usuarios con permisos limitados y por qué son importantes los respaldos?',
        ideas: [
          { n: 'Que cada usuario recibe solo los permisos que necesita', p: ['minimo', 'necesita', 'necesarios', 'necesario', 'limitados', 'limitado', 'solo', 'permisos', 'usuario', 'usuarios'], tip: 'Cada usuario debe tener solo los permisos que necesita (el mínimo).' },
          { n: 'Que GRANT da permisos y REVOKE los quita', p: ['grant', 'revoke', 'da', 'quita', 'dar', 'quitar'], tip: 'GRANT da permisos y REVOKE los quita.' },
          { n: 'Que así un error o ataque hace menos daño', p: ['seguridad', 'daño', 'dano', 'error', 'ataque', 'proteger', 'protege', 'riesgo'], tip: 'Así un error o un ataque hace menos daño: es por seguridad.' },
          { n: 'Que los respaldos evitan perder datos y deben probarse', p: ['respaldo', 'respaldos', 'copia', 'copias', 'perder', 'pierde', 'perdida', 'mysqldump', 'restaurar'], tip: 'Los respaldos evitan perder los datos; hay que hacerlos seguido y probar que se pueden restaurar.' }
        ],
        modelo: 'Cada usuario debe tener solo los permisos que necesita, que se dan con GRANT y se quitan con REVOKE; así un error o un ataque hace menos daño. Los respaldos, hechos con mysqldump, evitan perder los datos si algo falla, y hay que hacerlos seguido, guardarlos en otro lugar y probar que se pueden restaurar.'
      }
    }
  ];
  function allEstSql() { return 'SELECT * FROM estudiantes ORDER BY id'; }
  more.forEach((l) => window.LECCIONES.push(l));
}());
