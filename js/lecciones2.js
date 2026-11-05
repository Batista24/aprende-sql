/* Lecciones 8 a 15: crear y modificar, relaciones, diseño, proyecto y MySQL real */
(function () {
  const colsOf = (t) => "SELECT name, pk, CASE WHEN upper(type) LIKE 'INT%' THEN 'ENTERO' WHEN upper(type) LIKE 'VARCHAR%' OR upper(type) IN ('TEXT','CHAR') THEN 'TEXTO' WHEN upper(type) LIKE 'DECIMAL%' OR upper(type) IN ('REAL','FLOAT','DOUBLE') THEN 'DECIMAL' ELSE upper(type) END AS tipo FROM pragma_table_info('" + t + "')";
  const namesOf = (t) => "SELECT name FROM pragma_table_info('" + t + "')";
  const allEst = 'SELECT * FROM estudiantes ORDER BY id';

  const MYSQL_SCRIPT = [
    'CREATE DATABASE colegio;',
    'USE colegio;',
    '',
    'CREATE TABLE estudiantes (',
    '  id INT AUTO_INCREMENT PRIMARY KEY,',
    '  nombre VARCHAR(50) NOT NULL,',
    '  edad INT,',
    '  curso VARCHAR(10),',
    '  nota INT,',
    '  ciudad VARCHAR(40)',
    ');',
    '',
    "INSERT INTO estudiantes (nombre, edad, curso, nota, ciudad) VALUES",
    "('Ana',13,'1ro',85,'Bonao'),('Luis',14,'2do',72,'La Vega'),('María',13,'1ro',91,'Bonao'),",
    "('Carlos',15,'3ro',65,'Santiago'),('Sofía',14,'2do',88,'Bonao'),('Pedro',15,'3ro',54,'La Vega'),",
    "('Laura',13,'1ro',77,'Santo Domingo'),('Juan',14,'2do',95,'Bonao'),('Rosa',15,'3ro',82,'Santiago'),",
    "('Miguel',13,'1ro',60,'La Vega'),('Carmen',14,'2do',69,'Santo Domingo'),('Pablo',15,'3ro',90,'Bonao'),",
    "('Elena',13,'1ro',73,'Santiago'),('José',14,'2do',58,'Bonao'),('Daniela',15,'3ro',79,'La Vega');",
    '',
    'CREATE TABLE profesores (',
    '  id INT AUTO_INCREMENT PRIMARY KEY,',
    '  nombre VARCHAR(50) NOT NULL',
    ');',
    "INSERT INTO profesores (nombre) VALUES ('Prof. Ramírez'),('Prof. Gómez'),('Prof. Peña');",
    '',
    'CREATE TABLE materias (',
    '  id INT AUTO_INCREMENT PRIMARY KEY,',
    '  nombre VARCHAR(50) NOT NULL,',
    '  profesor_id INT,',
    '  FOREIGN KEY (profesor_id) REFERENCES profesores(id)',
    ');',
    "INSERT INTO materias (nombre, profesor_id) VALUES ('Matemática',1),('Lengua',2),('Ciencias',3),('Inglés',2);",
    '',
    'CREATE TABLE notas (',
    '  estudiante_id INT,',
    '  materia_id INT,',
    '  nota INT,',
    '  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),',
    '  FOREIGN KEY (materia_id) REFERENCES materias(id)',
    ');',
    'INSERT INTO notas VALUES',
    '(1,1,85),(1,2,90),(1,3,78),(2,1,72),(2,2,68),(2,3,80),(3,1,91),(3,2,88),(3,3,95),',
    '(4,1,65),(4,2,70),(5,1,88),(5,2,92),(5,3,84),(6,1,54),(6,3,60);'
  ].join('\n');

  const more = [
    /* ------------------------------------------------------------ 8 */
    {
      id: 8, titulo: 'Crear tablas', resumen: 'CREATE TABLE, tipos de dato, ALTER y DROP.',
      aprender: [
        { t: 'p', x: 'Hasta ahora consultaste tablas que ya existían. Ahora vas a **crear las tuyas**.' },
        { t: 'p', x: '**Importante:** en esta app, cada vez que tocas Ejecutar, la base de datos **empieza de nuevo** con las tablas originales. Si creas una tabla y la quieres usar, escribe todo junto en el mismo bloque.' },
        { t: 'p', x: '`CREATE TABLE` crea una tabla: el nombre, y entre paréntesis cada columna con su **tipo de dato**, separadas por coma.' },
        { t: 'code', sql: 'CREATE TABLE cursos (\n  id INTEGER PRIMARY KEY,\n  nombre TEXT,\n  aula TEXT\n)', ver: "SELECT name AS columna, type AS tipo, pk AS llave FROM pragma_table_info('cursos')" },
        { t: 'p', x: 'Los tipos de dato más usados: `INT` o `INTEGER` (números enteros), `VARCHAR(50)` o `TEXT` (texto), `DECIMAL(8,2)` (números con decimales, como precios) y `DATE` (fechas, como \'2026-11-05\').' },
        { t: 'code', sql: 'CREATE TABLE productos (\n  id INTEGER PRIMARY KEY,\n  nombre VARCHAR(50),\n  precio DECIMAL(8,2),\n  creado DATE\n)', ver: "SELECT name AS columna, type AS tipo, pk AS llave FROM pragma_table_info('productos')" },
        { t: 'p', x: '`PRIMARY KEY` marca la **llave primaria**: la columna que identifica cada fila y que nunca se repite. En **MySQL** el número se pone solo con `id INT AUTO_INCREMENT PRIMARY KEY`. En esta app también funciona así.' },
        { t: 'p', x: '`ALTER TABLE` cambia una tabla que ya existe. Por ejemplo, agregar una columna:' },
        { t: 'code', sql: 'ALTER TABLE estudiantes ADD COLUMN telefono TEXT', ver: 'SELECT * FROM estudiantes LIMIT 3' },
        { t: 'p', x: '`DROP TABLE` borra una tabla completa, con todos sus datos. ¡Cuidado!' },
        { t: 'code', sql: 'DROP TABLE notas', ver: "SELECT name AS tablas FROM sqlite_master WHERE type = 'table'" }
      ],
      ejercicios: [
        { id: '8.1', texto: 'Crea la tabla **cursos** con las columnas **id** (llave primaria) y **nombre** (texto).', pista: 'CREATE TABLE cursos (id INTEGER PRIMARY KEY, nombre TEXT)', sol: 'CREATE TABLE cursos (id INTEGER PRIMARY KEY, nombre TEXT)', verify: colsOf('cursos') },
        { id: '8.2', texto: 'Crea la tabla **libros** con: **id** (llave primaria), **titulo** (texto) y **paginas** (entero).', pista: 'Tres columnas separadas por coma. paginas es INTEGER.', sol: 'CREATE TABLE libros (id INTEGER PRIMARY KEY, titulo TEXT, paginas INTEGER)', verify: colsOf('libros') },
        { id: '8.3', texto: 'Crea la tabla **productos** con: **id** (llave primaria), **nombre** (texto) y **precio** (decimal).', pista: 'precio puede ser DECIMAL(8,2).', sol: 'CREATE TABLE productos (id INTEGER PRIMARY KEY, nombre TEXT, precio DECIMAL(8,2))', verify: colsOf('productos') },
        { id: '8.4', texto: 'A la tabla **estudiantes** agrégale la columna **telefono** (texto).', pista: 'ALTER TABLE estudiantes ADD COLUMN telefono TEXT', sol: 'ALTER TABLE estudiantes ADD COLUMN telefono TEXT', verify: namesOf('estudiantes') },
        { id: '8.5', texto: 'Borra la tabla **notas**.', pista: 'DROP TABLE y el nombre de la tabla.', sol: 'DROP TABLE notas', verify: "SELECT COUNT(*) FROM sqlite_master WHERE name = 'notas'" }
      ],
      escribe: {
        pregunta: '¿Cómo se crea una tabla y qué significa PRIMARY KEY?',
        ideas: [
          { n: 'Que se usa CREATE TABLE para crear una tabla', p: ['create', 'crear', 'crea'], tip: 'Una tabla se crea con CREATE TABLE.' },
          { n: 'Que cada columna lleva un tipo de dato', p: ['tipo', 'tipos', 'integer', 'varchar', 'texto', 'entero', 'decimal'], tip: 'Cada columna lleva un nombre y un tipo de dato (entero, texto, decimal, fecha…).' },
          { n: 'Que la llave primaria identifica cada fila y no se repite', p: ['identifica', 'identificar', 'unica', 'unico', 'repite', 'repetir', 'primaria'], tip: 'La llave primaria identifica cada fila y no se puede repetir.' },
          { n: 'Que ALTER cambia y DROP borra una tabla', p: ['alter', 'drop', 'borra', 'borrar', 'agrega', 'agregar', 'cambia', 'cambiar'], tip: 'ALTER TABLE cambia una tabla y DROP TABLE la borra.' }
        ],
        modelo: 'Se crea con CREATE TABLE, poniendo el nombre y cada columna con su tipo de dato. PRIMARY KEY es la llave primaria: identifica cada fila y no se puede repetir. ALTER TABLE cambia una tabla existente y DROP TABLE la borra.'
      }
    },
    /* ------------------------------------------------------------ 9 */
    {
      id: 9, titulo: 'Llaves y restricciones', resumen: 'NOT NULL, UNIQUE, DEFAULT y llaves foráneas.',
      aprender: [
        { t: 'p', x: 'Las **restricciones** son reglas que la base de datos hace cumplir para que los datos sean correctos. Si las rompes, te da un error.' },
        { t: 'p', x: '• `NOT NULL`: la columna no puede quedar vacía • `UNIQUE`: no se puede repetir • `DEFAULT`: valor automático si no pones nada • `PRIMARY KEY`: único y no vacío, identifica la fila' },
        { t: 'code', sql: "CREATE TABLE alumnos (\n  id INTEGER PRIMARY KEY,\n  nombre TEXT NOT NULL,\n  correo TEXT UNIQUE,\n  estado TEXT DEFAULT 'activo'\n);\nINSERT INTO alumnos (nombre) VALUES ('Ana');", ver: 'SELECT * FROM alumnos' },
        { t: 'p', x: 'La **llave foránea** (`FOREIGN KEY`) conecta una tabla con otra: dice que el valor de una columna debe existir en la llave primaria de otra tabla.' },
        { t: 'code', sql: 'CREATE TABLE inscripciones (\n  id INTEGER PRIMARY KEY,\n  estudiante_id INTEGER,\n  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id)\n)', ver: 'SELECT "from" AS columna, "table" AS apunta_a, "to" AS columna_destino FROM pragma_foreign_key_list(\'inscripciones\')' },
        { t: 'p', x: 'Prueba a romper las reglas y mira los errores (cada una es una consulta aparte). **Llave primaria repetida:**' },
        { t: 'code', sql: "INSERT INTO estudiantes (id, nombre) VALUES (1, 'Repetido')" },
        { t: 'p', x: '**Columna NOT NULL vacía:**' },
        { t: 'code', sql: 'INSERT INTO profesores (id) VALUES (10)' },
        { t: 'p', x: '**Llave foránea que no existe** (el estudiante 99 no existe):' },
        { t: 'code', sql: 'INSERT INTO notas VALUES (99, 1, 80)' }
      ],
      ejercicios: [
        { id: '9.1', texto: 'Crea la tabla **alumnos** con: **id** (llave primaria), **nombre** (texto, **no vacío**) y **correo** (texto, **único**).', pista: 'nombre TEXT NOT NULL, correo TEXT UNIQUE', sol: 'CREATE TABLE alumnos (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, correo TEXT UNIQUE)', verify: 'SELECT name, "notnull", pk, (SELECT COUNT(*) FROM pragma_index_list(\'alumnos\') WHERE "unique" = 1 AND origin = \'u\') FROM pragma_table_info(\'alumnos\')' },
        { id: '9.2', texto: 'Crea la tabla **inscripciones** con **id** (llave primaria), **estudiante_id** y **materia_id** (enteros). **estudiante_id** debe apuntar a **estudiantes(id)** y **materia_id** a **materias(id)**.', pista: 'Al final agrega dos líneas FOREIGN KEY (columna) REFERENCES tabla(id), separadas por coma.', sol: 'CREATE TABLE inscripciones (id INTEGER PRIMARY KEY, estudiante_id INTEGER, materia_id INTEGER, FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id), FOREIGN KEY (materia_id) REFERENCES materias(id))', verify: 'SELECT "from", "table", "to" FROM pragma_foreign_key_list(\'inscripciones\')' },
        { id: '9.3', texto: "Crea la tabla **tareas** con **id** (llave primaria), **titulo** (texto) y **estado** (texto, con valor por defecto **'pendiente'**).", pista: "estado TEXT DEFAULT 'pendiente'", sol: "CREATE TABLE tareas (id INTEGER PRIMARY KEY, titulo TEXT, estado TEXT DEFAULT 'pendiente')", verify: "SELECT name, dflt_value FROM pragma_table_info('tareas')" }
      ],
      escribe: {
        pregunta: '¿Qué es una llave foránea y para qué sirven NOT NULL y UNIQUE?',
        ideas: [
          { n: 'Que la llave foránea conecta o apunta a otra tabla', p: ['foranea', 'foreign', 'apunta', 'referencia', 'conecta', 'relaciona', 'enlaza', 'otra'], tip: 'La llave foránea conecta una tabla con otra: apunta a la llave primaria de la otra.' },
          { n: 'Que protege que el dato exista en la otra tabla', p: ['existe', 'existir', 'existan', 'correcto', 'correctos', 'valida', 'coincide'], tip: 'Obliga a que el valor exista en la otra tabla, para que los datos sean correctos.' },
          { n: 'Que NOT NULL no deja la columna vacía', p: ['vacio', 'vacia', 'null', 'obligatorio', 'obligatoria'], tip: 'NOT NULL no deja que la columna quede vacía (es obligatoria).' },
          { n: 'Que UNIQUE no permite valores repetidos', p: ['repite', 'repetir', 'repetido', 'repetidos', 'unico', 'unica', 'unique'], tip: 'UNIQUE no permite valores repetidos en la columna.' }
        ],
        modelo: 'La llave foránea conecta una tabla con otra: su valor debe existir en la llave primaria de la otra tabla, así los datos se mantienen correctos. NOT NULL no deja que la columna quede vacía y UNIQUE no permite valores repetidos.'
      }
    },
    /* ------------------------------------------------------------ 10 */
    {
      id: 10, titulo: 'INSERT, UPDATE y DELETE', resumen: 'Agregar, cambiar y borrar datos.',
      aprender: [
        { t: 'p', x: '`INSERT INTO` agrega una fila nueva. Puedes poner **todos** los valores en el orden de las columnas:' },
        { t: 'code', sql: "INSERT INTO estudiantes VALUES (16, 'Marta', 13, '1ro', 80, 'Bonao')", ver: 'SELECT * FROM estudiantes ORDER BY id DESC LIMIT 3' },
        { t: 'p', x: 'O indicar **solo las columnas** que quieres llenar. Las que no pongas quedan vacías (NULL) o toman su valor automático, como el id:' },
        { t: 'code', sql: "INSERT INTO estudiantes (nombre, edad, curso) VALUES ('Beto', 14, '2do')", ver: 'SELECT * FROM estudiantes ORDER BY id DESC LIMIT 3' },
        { t: 'p', x: '`UPDATE` cambia datos que ya existen. **SET** dice qué cambiar y **WHERE** a cuáles filas:' },
        { t: 'code', sql: "UPDATE estudiantes SET nota = 70 WHERE nombre = 'Pedro'", ver: "SELECT nombre, nota FROM estudiantes WHERE nombre = 'Pedro'" },
        { t: 'p', x: '`DELETE` borra filas:' },
        { t: 'code', sql: 'DELETE FROM estudiantes WHERE id = 15', ver: 'SELECT COUNT(*) AS estudiantes FROM estudiantes' },
        { t: 'p', x: '⚠️ **El error más peligroso:** `UPDATE` o `DELETE` **sin WHERE** afectan **todas** las filas. Pruébalo aquí, que es seguro (la base se restaura sola):' },
        { t: 'code', sql: 'UPDATE estudiantes SET nota = 0', ver: 'SELECT nombre, nota FROM estudiantes LIMIT 5' }
      ],
      ejercicios: [
        { id: '10.1', texto: "Inserta un estudiante nuevo con todos sus datos: id **16**, nombre **'Marta'**, edad **13**, curso **'1ro'**, nota **80**, ciudad **'Bonao'**.", pista: "INSERT INTO estudiantes VALUES (16, 'Marta', 13, '1ro', 80, 'Bonao')", sol: "INSERT INTO estudiantes VALUES (16, 'Marta', 13, '1ro', 80, 'Bonao')", verify: allEst },
        { id: '10.2', texto: "Inserta a **Beto**, de **14** años, del curso **'2do'**, indicando **solo** las columnas nombre, edad y curso.", pista: "INSERT INTO estudiantes (nombre, edad, curso) VALUES ('Beto', 14, '2do')", sol: "INSERT INTO estudiantes (nombre, edad, curso) VALUES ('Beto', 14, '2do')", verify: allEst },
        { id: '10.3', texto: 'Cambia la nota de **Pedro** a **60**. Que no cambie la de nadie más.', pista: "UPDATE estudiantes SET nota = 60 WHERE nombre = 'Pedro'", sol: "UPDATE estudiantes SET nota = 60 WHERE nombre = 'Pedro'", verify: allEst },
        { id: '10.4', texto: "Cambia la ciudad de **Luis** a **'Bonao'** y su curso a **'3ro'**, en una sola instrucción.", pista: "Dos cambios en el mismo SET, separados por coma: SET ciudad = ..., curso = ...", sol: "UPDATE estudiantes SET ciudad = 'Bonao', curso = '3ro' WHERE nombre = 'Luis'", verify: allEst },
        { id: '10.5', texto: 'Borra al estudiante con **id 15**.', pista: 'DELETE FROM estudiantes WHERE id = 15', sol: 'DELETE FROM estudiantes WHERE id = 15', verify: allEst },
        { id: '10.6', texto: "Borra a los estudiantes que viven en **'Santo Domingo'**.", pista: "DELETE FROM estudiantes WHERE ciudad = 'Santo Domingo'", sol: "DELETE FROM estudiantes WHERE ciudad = 'Santo Domingo'", verify: allEst }
      ],
      escribe: {
        pregunta: '¿Para qué sirven INSERT, UPDATE y DELETE, y por qué hay que tener cuidado con el WHERE?',
        ideas: [
          { n: 'Que INSERT agrega filas', p: ['insert', 'agrega', 'agregar', 'inserta', 'insertar', 'nueva', 'nuevo', 'nuevas', 'anade'], tip: 'INSERT agrega filas nuevas.' },
          { n: 'Que UPDATE cambia datos', p: ['update', 'cambia', 'cambiar', 'modifica', 'modificar', 'actualiza', 'actualizar'], tip: 'UPDATE cambia (actualiza) datos que ya existen.' },
          { n: 'Que DELETE borra filas', p: ['delete', 'borra', 'borrar', 'elimina', 'eliminar'], tip: 'DELETE borra filas.' },
          { n: 'Que sin WHERE se afectan todas las filas', p: ['todas', 'todos', 'toda', 'where', 'cuidado', 'peligro', 'peligroso'], tip: 'Sin WHERE, UPDATE y DELETE afectan todas las filas. ¡Cuidado!' }
        ],
        modelo: 'INSERT agrega filas nuevas, UPDATE cambia datos que ya existen y DELETE borra filas. Si se te olvida el WHERE, el cambio o el borrado se aplica a todas las filas de la tabla, por eso hay que tener cuidado.'
      }
    },
    /* ------------------------------------------------------------ 11 */
    {
      id: 11, titulo: 'Relaciones entre tablas', resumen: 'Uno a muchos y muchos a muchos.',
      aprender: [
        { t: 'p', x: 'Un colegio no cabe en una sola tabla. Si guardaras el nombre del profesor en cada materia, lo repetirías muchas veces, y si cambia habría que corregirlo en todos lados. La solución: **tablas separadas, conectadas por llaves**.' },
        { t: 'p', x: '**Uno a muchos:** un profesor da varias materias, pero cada materia tiene un solo profesor. En la tabla del lado "muchos" (**materias**) va la **llave foránea** `profesor_id`, que apunta al `id` del profesor.' },
        { t: 'code', sql: 'SELECT * FROM profesores' },
        { t: 'code', sql: 'SELECT * FROM materias' },
        { t: 'p', x: 'Fíjate: Lengua e Inglés tienen `profesor_id = 2`. Es el mismo profesor (Prof. Gómez), guardado **una sola vez**.' },
        { t: 'p', x: '**Muchos a muchos:** un estudiante tiene notas en varias materias, y cada materia tiene notas de varios estudiantes. Se resuelve con una **tabla intermedia**, aquí `notas`, que guarda `estudiante_id` y `materia_id`.' },
        { t: 'code', sql: 'SELECT * FROM notas' },
        { t: 'p', x: '**Regla de oro:** nunca guardes una lista en una celda (como "1,2,3"). Si hay muchos a muchos, usa una tabla intermedia.' }
      ],
      ejercicios: [
        { id: '11.1', texto: 'Muestra todas las filas de la tabla **notas** del estudiante con **estudiante_id = 1**.', pista: 'SELECT * FROM notas WHERE estudiante_id = 1', sol: 'SELECT * FROM notas WHERE estudiante_id = 1' },
        { id: '11.2', texto: 'Muestra el **nombre** de las materias que da el profesor con **id 2**.', pista: 'Mira la columna profesor_id de la tabla materias.', sol: 'SELECT nombre FROM materias WHERE profesor_id = 2' },
        { id: '11.3', texto: 'Muestra cada **materia_id** y **cuántas notas** tiene, usando la tabla notas.', pista: 'SELECT materia_id, COUNT(*) FROM notas GROUP BY materia_id', sol: 'SELECT materia_id, COUNT(*) FROM notas GROUP BY materia_id' },
        { id: '11.4', texto: 'Muestra cada **estudiante_id** y su **nota promedio**, usando la tabla notas.', pista: 'AVG(nota) y GROUP BY estudiante_id', sol: 'SELECT estudiante_id, AVG(nota) FROM notas GROUP BY estudiante_id' }
      ],
      escribe: {
        pregunta: 'Explica qué es una llave foránea y la diferencia entre una relación uno a muchos y una muchos a muchos.',
        ideas: [
          { n: 'Que la llave foránea apunta a la llave primaria de otra tabla', p: ['foranea', 'foreign', 'apunta', 'referencia', 'conecta', 'relaciona', 'enlaza', 'otra'], tip: 'La llave foránea es una columna que apunta a la llave primaria de otra tabla.' },
          { n: 'Que en uno a muchos un registro se relaciona con varios', p: ['uno', 'varios', 'varias', 'profesor', 'ejemplo'], tip: 'En uno a muchos, un registro se relaciona con varios (un profesor tiene varias materias).' },
          { n: 'Que muchos a muchos usa una tabla intermedia', p: ['intermedia', 'puente', 'union', 'medio'], tip: 'En muchos a muchos se usa una tabla intermedia (como notas).' },
          { n: 'Que se evita repetir datos', p: ['repetir', 'repite', 'repetidos', 'repetido', 'duplicados', 'duplicar', 'separadas', 'separar', 'una vez'], tip: 'Se separan las tablas para no repetir datos.' }
        ],
        modelo: 'Una llave foránea es una columna que apunta a la llave primaria de otra tabla. En uno a muchos, un registro se relaciona con varios (un profesor da varias materias). En muchos a muchos se usa una tabla intermedia, como notas. Así no se repiten datos.'
      }
    },
    /* ------------------------------------------------------------ 12 */
    {
      id: 12, titulo: 'JOIN: juntar tablas', resumen: 'INNER JOIN, LEFT JOIN y varias tablas a la vez.',
      aprender: [
        { t: 'p', x: '`JOIN` junta filas de dos tablas usando sus llaves. Después de `ON` dices cuáles columnas se corresponden: `tabla1.columna = tabla2.columna`.' },
        { t: 'code', sql: 'SELECT materias.nombre, profesores.nombre\nFROM materias\nJOIN profesores ON materias.profesor_id = profesores.id' },
        { t: 'p', x: 'Para no escribir tanto, le pones un **alias** corto a cada tabla (`m`, `p`) y a las columnas con `AS`:' },
        { t: 'code', sql: 'SELECT m.nombre AS materia, p.nombre AS profesor\nFROM materias m\nJOIN profesores p ON m.profesor_id = p.id' },
        { t: 'p', x: 'Puedes juntar **tres tablas**, una detrás de otra. Aquí, cada nota con el nombre del estudiante y de la materia:' },
        { t: 'code', sql: 'SELECT e.nombre AS estudiante, m.nombre AS materia, n.nota\nFROM notas n\nJOIN estudiantes e ON e.id = n.estudiante_id\nJOIN materias m ON m.id = n.materia_id' },
        { t: 'p', x: '`JOIN` (o `INNER JOIN`) solo muestra las filas que **tienen pareja** en la otra tabla. `LEFT JOIN` muestra **todas** las de la tabla de la izquierda, y lo que no tiene pareja sale como `NULL`. Inglés no tiene notas:' },
        { t: 'code', sql: 'SELECT m.nombre, n.nota\nFROM materias m\nLEFT JOIN notas n ON m.id = n.materia_id\nWHERE m.id = 4' }
      ],
      ejercicios: [
        { id: '12.1', texto: 'Muestra el **nombre de cada materia** y el **nombre de su profesor**.', pista: 'materias JOIN profesores ON materias.profesor_id = profesores.id', sol: 'SELECT materias.nombre, profesores.nombre FROM materias JOIN profesores ON materias.profesor_id = profesores.id' },
        { id: '12.2', texto: 'Muestra el **nombre del estudiante** y su **nota** en la materia con **id 1** (Matemática).', pista: 'estudiantes JOIN notas ON estudiantes.id = notas.estudiante_id, y WHERE notas.materia_id = 1', sol: 'SELECT estudiantes.nombre, notas.nota FROM estudiantes JOIN notas ON estudiantes.id = notas.estudiante_id WHERE notas.materia_id = 1' },
        { id: '12.3', texto: 'Muestra, para cada nota, el **nombre del estudiante**, el **nombre de la materia** y la **nota** (tres tablas).', pista: 'Parte de notas y haz dos JOIN: uno con estudiantes y otro con materias.', sol: 'SELECT e.nombre, m.nombre, n.nota FROM notas n JOIN estudiantes e ON e.id = n.estudiante_id JOIN materias m ON m.id = n.materia_id' },
        { id: '12.4', texto: 'Muestra el **nombre de cada estudiante** y **cuántas notas tiene**. Los que no tienen ninguna deben salir con **0**.', pista: 'Usa LEFT JOIN desde estudiantes hacia notas, COUNT(notas.nota) y GROUP BY.', sol: 'SELECT e.nombre, COUNT(n.nota) FROM estudiantes e LEFT JOIN notas n ON e.id = n.estudiante_id GROUP BY e.id' },
        { id: '12.5', texto: 'Muestra el **nombre de cada materia** y su **nota promedio**.', pista: 'materias JOIN notas, AVG(nota) y GROUP BY el nombre de la materia.', sol: 'SELECT m.nombre, AVG(n.nota) FROM materias m JOIN notas n ON m.id = n.materia_id GROUP BY m.nombre' }
      ],
      escribe: {
        pregunta: '¿Qué hace JOIN y cuál es la diferencia entre INNER JOIN y LEFT JOIN?',
        ideas: [
          { n: 'Que JOIN junta o une tablas', p: ['junta', 'juntar', 'une', 'unir', 'combina', 'combinar', 'relaciona'], tip: 'JOIN junta (une) filas de dos o más tablas.' },
          { n: 'Que se une usando las llaves con ON', p: ['on', 'llave', 'llaves', 'columna', 'columnas', 'condicion', 'coinciden', 'igual'], tip: 'Se unen con ON, comparando las llaves de las tablas.' },
          { n: 'Que INNER JOIN solo muestra las filas con pareja', p: ['pareja', 'coinciden', 'coincidencia', 'ambas', 'solo', 'inner'], tip: 'INNER JOIN solo muestra las filas que tienen pareja en la otra tabla.' },
          { n: 'Que LEFT JOIN muestra todas las de la izquierda aunque no tengan pareja', p: ['left', 'izquierda', 'todas', 'null', 'vacio', 'aunque'], tip: 'LEFT JOIN muestra todas las filas de la tabla izquierda, aunque no tengan pareja (salen NULL).' }
        ],
        modelo: 'JOIN junta filas de dos o más tablas usando sus llaves en la condición ON. INNER JOIN solo muestra las filas que tienen pareja en la otra tabla. LEFT JOIN muestra todas las filas de la tabla izquierda aunque no tengan pareja, y lo que falta sale como NULL.'
      }
    },
    /* ------------------------------------------------------------ 13 */
    {
      id: 13, titulo: 'Diseñar una base de datos', resumen: 'Cómo pensar las tablas antes de crearlas.',
      aprender: [
        { t: 'p', x: 'Una buena base de datos se **diseña antes de escribir SQL**. Estos son los pasos:' },
        { t: 'p', x: '**1.** Haz una lista de las "cosas" de las que guardas datos (estudiantes, profesores, materias…). Cada cosa será una **tabla**.' },
        { t: 'p', x: '**2.** A cada tabla ponle una **llave primaria** (`id`).' },
        { t: 'p', x: '**3.** Cada dato se guarda **una sola vez**, en la tabla de la cosa a la que pertenece (el teléfono del profesor va en profesores, no en materias).' },
        { t: 'p', x: '**4.** Conecta las tablas con **llaves foráneas**: uno a muchos con una columna, muchos a muchos con una tabla intermedia.' },
        { t: 'p', x: '**Normalización** es el nombre de estas reglas. Las más importantes: no guardes listas en una celda, y que cada dato dependa solo de la llave de su tabla. Mira un diseño **malo**:' },
        { t: 'pre', x: 'pedidos\nid | cliente        | telefono   | productos\n1  | Rosa Pérez     | 809-555-1  | lápiz, cuaderno\n2  | Rosa Pérez     | 809-555-1  | regla' },
        { t: 'p', x: 'Problemas: el nombre y teléfono de Rosa se **repiten** (si cambia, hay que corregir varios lugares) y los productos están en una **lista** dentro de una celda. El diseño **bueno** separa en tablas:' },
        { t: 'pre', x: 'clientes (id, nombre, telefono)\npedidos (id, cliente_id → clientes, fecha)\nproductos (id, nombre)\ndetalle_pedido (pedido_id → pedidos, producto_id → productos, cantidad)' },
        { t: 'p', x: 'Cada dato vive en un solo lugar y las tablas se conectan con llaves. Ahora lo vas a construir.' }
      ],
      ejercicios: [
        { id: '13.1', texto: 'Crea la tabla **clientes** con: **id** (llave primaria), **nombre** (texto, no vacío) y **telefono** (texto).', pista: 'nombre TEXT NOT NULL', sol: 'CREATE TABLE clientes (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, telefono TEXT)', verify: 'SELECT name, "notnull", pk FROM pragma_table_info(\'clientes\')' },
        { id: '13.2', texto: 'Crea las **dos tablas**: **clientes** (id llave primaria, nombre) y **pedidos** (id llave primaria, cliente_id entero, fecha texto), donde **cliente_id** apunta a **clientes(id)**. Escribe todo en el mismo bloque, separado por punto y coma.', pista: 'Primero CREATE TABLE clientes (...); y después CREATE TABLE pedidos (..., FOREIGN KEY (cliente_id) REFERENCES clientes(id));', sol: 'CREATE TABLE clientes (id INTEGER PRIMARY KEY, nombre TEXT); CREATE TABLE pedidos (id INTEGER PRIMARY KEY, cliente_id INTEGER, fecha TEXT, FOREIGN KEY (cliente_id) REFERENCES clientes(id))', verify: "SELECT 'col', t.name, c.name, c.pk FROM sqlite_master t, pragma_table_info(t.name) c WHERE t.name IN ('clientes','pedidos') UNION ALL SELECT 'fk', t.name, f.\"from\", f.\"table\" || '.' || ifnull(f.\"to\", '') FROM sqlite_master t, pragma_foreign_key_list(t.name) f WHERE t.name = 'pedidos'" },
        { id: '13.3', texto: "Escribe un **script completo**: crea **clientes** (id, nombre) y **pedidos** (id, cliente_id con llave foránea, fecha); inserta el cliente **1, 'Rosa'** y el pedido **1** de ese cliente con fecha **'2026-11-05'**.", pista: 'Cuatro instrucciones separadas por punto y coma: dos CREATE TABLE y dos INSERT. Inserta primero el cliente y después el pedido.', sol: "CREATE TABLE clientes (id INTEGER PRIMARY KEY, nombre TEXT); CREATE TABLE pedidos (id INTEGER PRIMARY KEY, cliente_id INTEGER, fecha TEXT, FOREIGN KEY (cliente_id) REFERENCES clientes(id)); INSERT INTO clientes VALUES (1, 'Rosa'); INSERT INTO pedidos VALUES (1, 1, '2026-11-05')", verify: 'SELECT c.nombre, p.fecha FROM pedidos p JOIN clientes c ON c.id = p.cliente_id' }
      ],
      escribe: {
        pregunta: 'Explica los pasos para diseñar una base de datos y por qué no se deben repetir datos.',
        ideas: [
          { n: 'Que cada cosa o entidad es una tabla', p: ['tabla', 'tablas', 'cosas', 'entidades', 'entidad', 'lista'], tip: 'Primero se lista cada cosa de la que se guardan datos: cada una será una tabla.' },
          { n: 'Que cada tabla tiene llave primaria', p: ['primaria', 'llave', 'identificador', 'id'], tip: 'Cada tabla lleva una llave primaria (id).' },
          { n: 'Que se conectan con llaves foráneas', p: ['foranea', 'foraneas', 'foreign', 'relaciona', 'relacionan', 'conecta', 'conectan', 'relaciones', 'referencia'], tip: 'Las tablas se conectan con llaves foráneas.' },
          { n: 'Que no se repiten datos (un dato en un solo lugar)', p: ['repetir', 'repite', 'repetidos', 'repetido', 'duplicados', 'duplicar', 'una vez', 'lugar', 'normalizacion'], tip: 'Cada dato se guarda una sola vez, para no repetirlo ni tener que corregirlo en varios lugares.' }
        ],
        modelo: 'Primero se hace la lista de las cosas de las que se guardan datos y cada una es una tabla. Cada tabla lleva una llave primaria y las tablas se conectan con llaves foráneas. Cada dato se guarda una sola vez para no repetirlo ni tener que corregirlo en muchos lugares.'
      }
    },
    /* ------------------------------------------------------------ 14 */
    {
      id: 14, titulo: 'Proyecto final: el colegio', resumen: 'Pon todo en práctica: diseña, crea, llena y consulta.',
      aprender: [
        { t: 'p', x: 'Este es el proyecto final. Vas a usar **todo** lo aprendido: crear tablas con llaves, insertar datos, juntar tablas con JOIN y sacar resúmenes.' },
        { t: 'p', x: 'Recuerda: **cada vez que ejecutas, la base empieza de nuevo**, así que en los ejercicios de crear tablas escribe el script completo en un solo bloque.' },
        { t: 'p', x: 'La base de práctica ya trae estas tablas conectadas, mírala:' },
        { t: 'pre', x: 'estudiantes (id, nombre, edad, curso, nota, ciudad)\nprofesores  (id, nombre)\nmaterias    (id, nombre, profesor_id → profesores)\nnotas       (estudiante_id → estudiantes, materia_id → materias, nota)' },
        { t: 'p', x: 'Un consejo para resolver consultas difíciles: **ve paso a paso**. Primero junta las tablas y mira el resultado, luego agrega el `GROUP BY`, y al final el `ORDER BY` y el `LIMIT`.' },
        { t: 'code', sql: 'SELECT p.nombre, m.nombre\nFROM profesores p\nJOIN materias m ON m.profesor_id = p.id' }
      ],
      ejercicios: [
        { id: '14.1', texto: 'Crea la tabla **aulas** con: **id** (llave primaria), **nombre** (texto, no vacío) y **capacidad** (entero).', pista: 'nombre TEXT NOT NULL, capacidad INTEGER', sol: 'CREATE TABLE aulas (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, capacidad INTEGER)', verify: 'SELECT name, "notnull", pk FROM pragma_table_info(\'aulas\')' },
        { id: '14.2', texto: 'Escribe un script que cree **aulas** (id, nombre, capacidad) y **docentes** (id, nombre, aula_id con llave foránea a aulas), e inserte el aula **1, \'Salón A\', capacidad 30** y el docente **1, \'Prof. Díaz\'** en el aula 1.', pista: 'Dos CREATE TABLE y dos INSERT, separados por punto y coma. Inserta primero el aula.', sol: "CREATE TABLE aulas (id INTEGER PRIMARY KEY, nombre TEXT, capacidad INTEGER); CREATE TABLE docentes (id INTEGER PRIMARY KEY, nombre TEXT, aula_id INTEGER, FOREIGN KEY (aula_id) REFERENCES aulas(id)); INSERT INTO aulas VALUES (1, 'Salón A', 30); INSERT INTO docentes VALUES (1, 'Prof. Díaz', 1)", verify: "SELECT d.nombre, a.nombre, a.capacidad FROM docentes d JOIN aulas a ON a.id = d.aula_id UNION ALL SELECT name, type, pk FROM pragma_table_info('docentes') UNION ALL SELECT name, type, pk FROM pragma_table_info('aulas')" },
        { id: '14.3', texto: 'Muestra el **nombre de cada profesor** y el **promedio de las notas** de sus materias (une profesores, materias y notas).', pista: 'profesores JOIN materias JOIN notas, AVG(nota) y GROUP BY el nombre del profesor.', sol: 'SELECT p.nombre, AVG(n.nota) FROM profesores p JOIN materias m ON m.profesor_id = p.id JOIN notas n ON n.materia_id = m.id GROUP BY p.nombre' },
        { id: '14.4', texto: 'Muestra los **3 estudiantes con mejor promedio**: su **nombre** y su promedio, con el nombre de columna **promedio**, del más alto al más bajo.', pista: 'JOIN estudiantes con notas, AVG(nota) AS promedio, GROUP BY, ORDER BY promedio DESC y LIMIT 3.', sol: 'SELECT e.nombre, AVG(n.nota) AS promedio FROM estudiantes e JOIN notas n ON e.id = n.estudiante_id GROUP BY e.id ORDER BY promedio DESC LIMIT 3' },
        { id: '14.5', texto: 'Muestra el **nombre de cada materia** y **cuántos estudiantes** tienen nota en ella, incluyendo las materias sin notas (con 0).', pista: 'LEFT JOIN de materias hacia notas, COUNT(notas.nota) y GROUP BY.', sol: 'SELECT m.nombre, COUNT(n.nota) FROM materias m LEFT JOIN notas n ON m.id = n.materia_id GROUP BY m.id' }
      ],
      escribe: {
        pregunta: 'Describe cómo diseñarías la base de datos de un colegio: qué tablas tendría y cómo se relacionan.',
        ideas: [
          { n: 'Que hay tablas para estudiantes, profesores o materias', p: ['estudiantes', 'alumnos', 'profesores', 'docentes', 'materias', 'cursos', 'aulas'], tip: 'Menciona las tablas principales: estudiantes, profesores, materias…' },
          { n: 'Que cada tabla tiene una llave primaria', p: ['primaria', 'llave', 'identificador', 'id'], tip: 'Cada tabla tiene su llave primaria (id).' },
          { n: 'Que se relacionan con llaves foráneas', p: ['foranea', 'foraneas', 'foreign', 'relaciona', 'relacionan', 'relacion', 'relaciones', 'conecta', 'conectan', 'referencia'], tip: 'Las tablas se relacionan con llaves foráneas (por ejemplo, materias apunta al profesor).' },
          { n: 'Que muchos a muchos usa una tabla intermedia (notas)', p: ['intermedia', 'notas', 'inscripciones', 'matriculas', 'muchos', 'puente'], tip: 'La relación muchos a muchos entre estudiantes y materias necesita una tabla intermedia, como notas.' }
        ],
        modelo: 'Tendría tablas de estudiantes, profesores y materias, cada una con su llave primaria. La materia tiene una llave foránea hacia el profesor (uno a muchos). Como un estudiante tiene muchas materias y una materia muchos estudiantes, uso una tabla intermedia, notas, con las llaves de ambos.'
      }
    },
    /* ------------------------------------------------------------ 15 */
    {
      id: 15, titulo: 'MySQL de verdad', resumen: 'Pasa lo aprendido a un servidor MySQL real en tu computadora.',
      aprender: [
        { t: 'p', x: 'Lo que aprendiste aquí funciona casi igual en **MySQL**. Las diferencias principales:' },
        { t: 'pre', x: 'MySQL                           EN ESTA APP\nid INT AUTO_INCREMENT PRIMARY KEY   igual (se traduce)\nCREATE DATABASE colegio;      igual (lecciones)\nUSE colegio;                  igual (lecciones)\nSHOW TABLES;                  igual (lecciones)\nDESCRIBE estudiantes;         igual (lecciones)' },
        { t: 'p', x: 'Para practicar en MySQL real necesitas instalarlo en tu computadora (gratis):' },
        { t: 'p', x: '**1.** Descarga **MySQL Installer** de https://dev.mysql.com/downloads/installer/ (Windows). Elige la opción **Developer Default** (trae el servidor y **MySQL Workbench**).' },
        { t: 'p', x: '**2.** Durante la instalación te pide una **contraseña para el usuario root**. Anótala.' },
        { t: 'p', x: '**3.** Abre **MySQL Workbench**, entra a la conexión **Local instance** con tu contraseña.' },
        { t: 'p', x: '**4.** Abre una pestaña de consultas (**File → New Query Tab**), pega el siguiente script y toca el rayo ⚡ para ejecutarlo. Crea la misma base de datos del colegio que usaste aquí, en MySQL:' },
        { t: 'copy', x: MYSQL_SCRIPT },
        { t: 'p', x: '**5.** Ahora repite en MySQL los ejercicios que hiciste aquí. Prueba también `SHOW TABLES;` y `DESCRIBE estudiantes;`.' }
      ],
      ejercicios: [
        { id: '15.1', texto: 'En **MySQL**, ¿cómo haces que el **id se numere solo**?', q: { opts: ['id INT AUTO_INCREMENT PRIMARY KEY', 'id INT AUTONUMBER PRIMARY KEY', 'id INT SERIAL PRIMARY KEY', 'id INT NUMERAR PRIMARY KEY'], ok: 0 }, fb: 'En MySQL se escribe AUTO_INCREMENT. (SERIAL es de PostgreSQL.)' },
        { id: '15.2', texto: '¿Qué comando de MySQL **muestra las tablas** de la base de datos activa?', q: { opts: ['LIST TABLES;', 'SHOW TABLES;', 'SELECT TABLES;', 'DISPLAY TABLES;'], ok: 1 }, fb: 'SHOW TABLES; muestra la lista de tablas.' },
        { id: '15.3', texto: '¿Qué comando **elige la base de datos** con la que vas a trabajar?', q: { opts: ['OPEN colegio;', 'GO colegio;', 'USE colegio;', 'SELECT DATABASE colegio;'], ok: 2 }, fb: 'USE colegio; deja esa base de datos activa.' },
        { id: '15.4', texto: '¿Qué comando muestra **las columnas de una tabla**?', q: { opts: ['LIST estudiantes;', 'COLUMNS estudiantes;', 'INFO estudiantes;', 'DESCRIBE estudiantes;'], ok: 3 }, fb: 'DESCRIBE estudiantes; muestra columnas, tipos y llaves.' },
        { id: '15.5', texto: '¿Qué tipo de dato usas en MySQL para un **nombre de hasta 50 letras**?', q: { opts: ['VARCHAR(50)', 'STRING(50)', 'NAME(50)', 'TEXTO(50)'], ok: 0 }, fb: 'VARCHAR(50) guarda texto de hasta 50 caracteres.' }
      ],
      escribe: {
        pregunta: 'Cuenta qué cosas cambian entre lo que practicaste aquí y MySQL, y cómo empiezas a trabajar en MySQL.',
        ideas: [
          { n: 'Que en MySQL el id se numera con AUTO_INCREMENT', p: ['auto', 'increment', 'autoincrement', 'numera', 'automatico', 'automatica'], tip: 'En MySQL el id se numera solo con AUTO_INCREMENT.' },
          { n: 'Que se crea la base de datos con CREATE DATABASE', p: ['database', 'create', 'crear', 'crea', 'base'], tip: 'Primero se crea la base de datos con CREATE DATABASE.' },
          { n: 'Que se elige con USE', p: ['use', 'usar', 'elige', 'elegir', 'activa', 'activar'], tip: 'Se elige la base de datos con USE.' },
          { n: 'Que SHOW TABLES y DESCRIBE sirven para ver tablas y columnas', p: ['show', 'tables', 'describe', 'ver', 'muestra', 'mostrar'], tip: 'SHOW TABLES muestra las tablas y DESCRIBE muestra las columnas de una tabla.' }
        ],
        modelo: 'En MySQL el id se numera con AUTO_INCREMENT y el texto se define con VARCHAR(50). Se crea la base de datos con CREATE DATABASE y se elige con USE. SHOW TABLES muestra las tablas y DESCRIBE muestra las columnas de una tabla.'
      }
    }
  ];
  more.forEach((l) => window.LECCIONES.push(l));
}());
