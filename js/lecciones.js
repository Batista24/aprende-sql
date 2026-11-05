/* Lecciones de "Aprende bases de datos" - contenido */
window.SEED = [
  "CREATE TABLE estudiantes (id INTEGER PRIMARY KEY, nombre TEXT, edad INTEGER, curso TEXT, nota INTEGER, ciudad TEXT);",
  "INSERT INTO estudiantes VALUES",
  "(1,'Ana',13,'1ro',85,'Bonao'),(2,'Luis',14,'2do',72,'La Vega'),(3,'María',13,'1ro',91,'Bonao'),",
  "(4,'Carlos',15,'3ro',65,'Santiago'),(5,'Sofía',14,'2do',88,'Bonao'),(6,'Pedro',15,'3ro',54,'La Vega'),",
  "(7,'Laura',13,'1ro',77,'Santo Domingo'),(8,'Juan',14,'2do',95,'Bonao'),(9,'Rosa',15,'3ro',82,'Santiago'),",
  "(10,'Miguel',13,'1ro',60,'La Vega'),(11,'Carmen',14,'2do',69,'Santo Domingo'),(12,'Pablo',15,'3ro',90,'Bonao'),",
  "(13,'Elena',13,'1ro',73,'Santiago'),(14,'José',14,'2do',58,'Bonao'),(15,'Daniela',15,'3ro',79,'La Vega');",
  "CREATE TABLE profesores (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL);",
  "INSERT INTO profesores VALUES (1,'Prof. Ramírez'),(2,'Prof. Gómez'),(3,'Prof. Peña');",
  "CREATE TABLE materias (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, profesor_id INTEGER, FOREIGN KEY (profesor_id) REFERENCES profesores(id));",
  "INSERT INTO materias VALUES (1,'Matemática',1),(2,'Lengua',2),(3,'Ciencias',3),(4,'Inglés',2);",
  "CREATE TABLE notas (estudiante_id INTEGER, materia_id INTEGER, nota INTEGER, FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id), FOREIGN KEY (materia_id) REFERENCES materias(id));",
  "INSERT INTO notas VALUES (1,1,85),(1,2,90),(1,3,78),(2,1,72),(2,2,68),(2,3,80),(3,1,91),(3,2,88),(3,3,95),(4,1,65),(4,2,70),(5,1,88),(5,2,92),(5,3,84),(6,1,54),(6,3,60);"
].join('\n');

window.SCHEMA = {
  estudiantes: ['id', 'nombre', 'edad', 'curso', 'nota', 'ciudad'],
  profesores: ['id', 'nombre'],
  materias: ['id', 'nombre', 'profesor_id'],
  notas: ['estudiante_id', 'materia_id', 'nota']
};
window.PARTES = { 1: 'Parte 1 · Consultar datos', 8: 'Parte 2 · Crear y modificar', 11: 'Parte 3 · Relaciones y diseño', 15: 'Parte 4 · MySQL de verdad' };

window.KEYWORDS = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'LIKE', 'BETWEEN', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT',
  'DISTINCT', 'AS', 'COUNT', 'AVG', 'MAX', 'MIN', 'SUM', 'ASC', 'DESC', 'IN', 'IS', 'NULL', 'INSERT', 'INTO', 'VALUES',
  'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'JOIN', 'ON', 'LEFT', 'INNER', 'ROUND',
  'ALTER', 'ADD', 'COLUMN', 'DROP', 'VARCHAR', 'INT', 'INTEGER', 'TEXT', 'DECIMAL', 'REAL', 'DATE', 'PRIMARY', 'KEY', 'FOREIGN',
  'REFERENCES', 'UNIQUE', 'DEFAULT', 'AUTO_INCREMENT', 'OUTER', 'BOOLEAN', 'DATETIME', 'UPPER', 'LOWER', 'LENGTH', 'COALESCE',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CONSTRAINT', 'CHECK', 'EXISTS', 'DATABASE', 'USE', 'SHOW', 'TABLES', 'DESCRIBE'];

window.LECCIONES = [
  {
    id: 1, titulo: 'Tablas y datos', resumen: 'Qué es una base de datos y cómo ver lo que guarda.',
    aprender: [
      { t: 'p', x: 'Una **base de datos** es un lugar donde se guarda información de forma ordenada, para poder buscarla rápido.' },
      { t: 'p', x: 'La información se guarda en **tablas**. Una tabla es como una hoja de Excel: tiene **columnas** (los tipos de dato: nombre, edad…) y **filas** (cada fila es un **registro**, por ejemplo un estudiante).' },
      { t: 'p', x: 'Para hablar con una base de datos se usa un lenguaje llamado **SQL**. Con él haces **consultas**: preguntas a la base de datos.' },
      { t: 'p', x: 'Tu primera consulta. `SELECT *` significa "muestra todas las columnas" y `FROM estudiantes` dice de qué tabla. Toca **Ejecutar**:' },
      { t: 'code', sql: 'SELECT * FROM estudiantes' },
      { t: 'p', x: 'Si solo quieres ver unas pocas filas, agrega `LIMIT` y el número de filas:' },
      { t: 'code', sql: 'SELECT * FROM estudiantes LIMIT 3' }
    ],
    ejercicios: [
      { id: '1.1', texto: 'Muestra todo lo que hay en la tabla **estudiantes**.', pista: 'Empieza con SELECT, luego * y después FROM estudiantes.', sol: 'SELECT * FROM estudiantes' },
      { id: '1.2', texto: 'Muestra todo de la tabla **estudiantes**, pero solo las primeras **5** filas.', pista: 'Al final de la consulta agrega LIMIT 5.', sol: 'SELECT * FROM estudiantes LIMIT 5' }
    ],
    escribe: {
      pregunta: 'Con tus palabras: ¿qué es una base de datos y qué es una tabla?',
      ideas: [
        { n: 'Que una base de datos guarda y organiza información', p: ['guarda', 'guardar', 'almacena', 'almacenar', 'organiza', 'organizar', 'informacion', 'ordenada'], tip: 'Di que una base de datos guarda y organiza información (datos).' },
        { n: 'Que una tabla tiene filas y columnas', p: ['filas', 'fila', 'columnas', 'columna'], tip: 'Menciona que una tabla tiene filas y columnas, como una hoja de Excel.' },
        { n: 'Que cada fila es un registro', p: ['registro', 'registros'], tip: 'Cada fila es un registro (por ejemplo, un estudiante).' },
        { n: 'Que una base de datos puede tener varias tablas', p: ['tablas', 'varias', 'conjunto'], tip: 'Una base de datos puede tener varias tablas, no solo una.' }
      ],
      modelo: 'Una base de datos guarda y organiza información. Está formada por tablas. Cada tabla tiene columnas (el tipo de dato) y filas; cada fila es un registro, por ejemplo un estudiante.'
    }
  },
  {
    id: 2, titulo: 'SELECT: elegir columnas', resumen: 'Pedir solo las columnas que necesitas.',
    aprender: [
      { t: 'p', x: 'En vez de `*` puedes escribir los nombres de las columnas que quieres, **separados por coma**:' },
      { t: 'code', sql: 'SELECT nombre, nota FROM estudiantes' },
      { t: 'p', x: 'El orden en que las escribes es el orden en que salen. La consulta siempre sigue este patrón: **SELECT** (qué columnas) **FROM** (de qué tabla).' },
      { t: 'p', x: '`DISTINCT` quita los repetidos. Por ejemplo, las ciudades sin repetir:' },
      { t: 'code', sql: 'SELECT DISTINCT ciudad FROM estudiantes' },
      { t: 'p', x: '`AS` le pone otro nombre a una columna en el resultado:' },
      { t: 'code', sql: 'SELECT nombre AS estudiante FROM estudiantes' }
    ],
    ejercicios: [
      { id: '2.1', texto: 'Muestra solo la columna **nombre** de todos los estudiantes.', pista: 'SELECT nombre FROM estudiantes', sol: 'SELECT nombre FROM estudiantes' },
      { id: '2.2', texto: 'Muestra el **nombre** y la **nota** de todos los estudiantes.', pista: 'Separa las dos columnas con una coma.', sol: 'SELECT nombre, nota FROM estudiantes' },
      { id: '2.3', texto: 'Muestra el **nombre**, el **curso** y la **ciudad**, en ese orden.', pista: 'Tres columnas separadas por comas.', sol: 'SELECT nombre, curso, ciudad FROM estudiantes' },
      { id: '2.4', texto: 'Muestra las **ciudades sin repetir**.', pista: 'Usa DISTINCT justo antes del nombre de la columna.', sol: 'SELECT DISTINCT ciudad FROM estudiantes' }
    ],
    escribe: {
      pregunta: 'Explica: ¿para qué sirve SELECT y qué va después de FROM?',
      ideas: [
        { n: 'Que SELECT sirve para elegir o mostrar datos', p: ['elegir', 'elige', 'mostrar', 'muestra', 'consultar', 'consulta', 'seleccionar', 'selecciona', 'traer', 'trae', 'pedir', 'pide', 'ver'], tip: 'SELECT sirve para elegir qué datos quieres ver.' },
        { n: 'Que se eligen columnas', p: ['columna', 'columnas', 'campos', 'campo'], tip: 'Con SELECT eliges columnas, separadas por coma.' },
        { n: 'Que después de FROM va la tabla', p: ['tabla', 'tablas'], tip: 'Después de FROM va el nombre de la tabla de donde salen los datos.' },
        { n: 'Que el asterisco significa todas las columnas', p: ['asterisco', 'estrella', 'todas', 'todo', 'todos'], tip: 'El * (asterisco) significa todas las columnas.' }
      ],
      modelo: 'SELECT sirve para elegir qué columnas quiero ver. Después de FROM se escribe el nombre de la tabla de donde salen los datos. Si uso * (asterisco) traigo todas las columnas.'
    }
  },
  {
    id: 3, titulo: 'WHERE: filtrar filas', resumen: 'Quedarte solo con las filas que cumplen una condición.',
    aprender: [
      { t: 'p', x: '`WHERE` filtra las filas: solo salen las que cumplen la condición. Va **después de FROM**.' },
      { t: 'code', sql: "SELECT * FROM estudiantes WHERE curso = '1ro'" },
      { t: 'p', x: 'Fíjate: el **texto va entre comillas simples** (`\'1ro\'`). Los **números no llevan comillas**.' },
      { t: 'code', sql: 'SELECT nombre, nota FROM estudiantes WHERE nota > 80' },
      { t: 'p', x: 'Los símbolos de comparación: `=` igual, `<>` diferente, `>` mayor, `<` menor, `>=` mayor o igual, `<=` menor o igual.' },
      { t: 'code', sql: "SELECT nombre FROM estudiantes WHERE ciudad <> 'Bonao'" }
    ],
    ejercicios: [
      { id: '3.1', texto: 'Muestra todas las columnas de los estudiantes del curso **1ro**.', pista: "WHERE curso = '1ro' (el texto va entre comillas simples).", sol: "SELECT * FROM estudiantes WHERE curso = '1ro'" },
      { id: '3.2', texto: 'Muestra todas las columnas de los estudiantes con nota **mayor que 80**.', pista: 'Los números no llevan comillas: WHERE nota > 80', sol: 'SELECT * FROM estudiantes WHERE nota > 80' },
      { id: '3.3', texto: 'Muestra el **nombre** y la **edad** de los que viven en **Bonao**.', pista: "SELECT nombre, edad FROM estudiantes WHERE ciudad = 'Bonao'", sol: "SELECT nombre, edad FROM estudiantes WHERE ciudad = 'Bonao'" },
      { id: '3.4', texto: 'Muestra el **nombre** de los estudiantes que **no** están en **3ro**.', pista: "Usa <> (diferente): WHERE curso <> '3ro'", sol: "SELECT nombre FROM estudiantes WHERE curso <> '3ro'" }
    ],
    escribe: {
      pregunta: 'Explica: ¿para qué sirve WHERE? Da un ejemplo.',
      ideas: [
        { n: 'Que WHERE filtra', p: ['filtra', 'filtrar', 'filtro', 'filtrado'], tip: 'WHERE sirve para filtrar.' },
        { n: 'Que filtra filas o registros', p: ['filas', 'fila', 'registros', 'registro'], tip: 'Filtra filas (registros): solo salen las que cumplen.' },
        { n: 'Que usa una condición', p: ['condicion', 'condiciones', 'cumplen', 'cumple', 'igual', 'mayor', 'menor', 'diferente'], tip: 'Usa una condición: igual, mayor, menor, diferente…' },
        { n: 'Que el texto va entre comillas', p: ['comillas', 'comilla'], tip: "El texto va entre comillas simples ('Bonao') y los números no." }
      ],
      modelo: "WHERE sirve para filtrar filas: solo salen las que cumplen una condición. Por ejemplo WHERE nota > 80. El texto va entre comillas simples, como 'Bonao', y los números no llevan comillas."
    }
  },
  {
    id: 4, titulo: 'AND, OR, LIKE y BETWEEN', resumen: 'Combinar condiciones y buscar texto parecido.',
    aprender: [
      { t: 'p', x: '`AND` exige que se cumplan **las dos** condiciones a la vez:' },
      { t: 'code', sql: "SELECT nombre, nota FROM estudiantes WHERE curso = '2do' AND nota >= 80" },
      { t: 'p', x: '`OR` basta con que se cumpla **una de las dos**:' },
      { t: 'code', sql: "SELECT nombre, ciudad FROM estudiantes WHERE ciudad = 'Bonao' OR ciudad = 'La Vega'" },
      { t: 'p', x: '`LIKE` busca texto parecido. El símbolo `%` es un comodín que significa "cualquier cosa". `\'M%\'` = empieza con M.' },
      { t: 'code', sql: "SELECT nombre FROM estudiantes WHERE nombre LIKE 'M%'" },
      { t: 'p', x: '`BETWEEN` busca dentro de un rango (incluye los dos extremos):' },
      { t: 'code', sql: 'SELECT nombre, nota FROM estudiantes WHERE nota BETWEEN 70 AND 85' }
    ],
    ejercicios: [
      { id: '4.1', texto: 'Muestra **nombre** y **nota** de los del curso **2do** con nota **mayor o igual a 80**.', pista: "WHERE curso = '2do' AND nota >= 80", sol: "SELECT nombre, nota FROM estudiantes WHERE curso = '2do' AND nota >= 80" },
      { id: '4.2', texto: 'Muestra **nombre** y **ciudad** de los que viven en **Bonao** o en **La Vega**.', pista: "Repite la columna en cada condición: ciudad = 'Bonao' OR ciudad = 'La Vega'", sol: "SELECT nombre, ciudad FROM estudiantes WHERE ciudad = 'Bonao' OR ciudad = 'La Vega'" },
      { id: '4.3', texto: 'Muestra el **nombre** de los estudiantes cuyo nombre **empieza con M**.', pista: "Usa LIKE 'M%'", sol: "SELECT nombre FROM estudiantes WHERE nombre LIKE 'M%'" },
      { id: '4.4', texto: 'Muestra **nombre** y **nota** de los que tienen nota **entre 70 y 85**.', pista: 'WHERE nota BETWEEN 70 AND 85', sol: 'SELECT nombre, nota FROM estudiantes WHERE nota BETWEEN 70 AND 85' }
    ],
    escribe: {
      pregunta: 'Explica la diferencia entre AND y OR, y para qué sirve LIKE.',
      ideas: [
        { n: 'Que AND exige que se cumplan las dos condiciones', p: ['ambas', 'ambos', 'dos', 'todas', 'ademas', 'deben', 'tiene'], tip: 'Con AND se deben cumplir las dos condiciones a la vez.' },
        { n: 'Que OR basta con que se cumpla una', p: ['alguna', 'cualquiera', 'basta', 'menos', 'una'], tip: 'Con OR basta con que se cumpla una de las condiciones.' },
        { n: 'Que LIKE busca texto parecido', p: ['like', 'parecido', 'patron', 'busca', 'buscar', 'empieza', 'termina', 'contiene'], tip: 'LIKE busca texto parecido (que empiece, termine o contenga algo).' },
        { n: 'Que % es un comodín', p: ['comodin', 'porcentaje', 'cualquier'], tip: "El % es un comodín: 'M%' significa que empieza con M." }
      ],
      modelo: "Con AND se deben cumplir las dos condiciones a la vez; con OR basta con que se cumpla una. LIKE busca texto parecido, y el % es un comodín: 'M%' encuentra lo que empieza con M."
    }
  },
  {
    id: 5, titulo: 'ORDER BY y LIMIT', resumen: 'Ordenar los resultados y quedarte con los primeros.',
    aprender: [
      { t: 'p', x: '`ORDER BY` ordena el resultado. Por defecto va de menor a mayor (**ASC**). Con **DESC** va de mayor a menor.' },
      { t: 'code', sql: 'SELECT nombre, nota FROM estudiantes ORDER BY nota DESC' },
      { t: 'p', x: 'También ordena texto, de la A a la Z:' },
      { t: 'code', sql: 'SELECT nombre FROM estudiantes ORDER BY nombre' },
      { t: 'p', x: 'Si juntas `ORDER BY` con `LIMIT` sacas "los mejores" o "los últimos". Por ejemplo, los 3 con mejor nota:' },
      { t: 'code', sql: 'SELECT nombre, nota FROM estudiantes ORDER BY nota DESC LIMIT 3' },
      { t: 'p', x: 'El orden de las partes importa: **SELECT, FROM, WHERE, ORDER BY, LIMIT**.' }
    ],
    ejercicios: [
      { id: '5.1', texto: 'Muestra **nombre** y **nota**, de la **nota más alta a la más baja**.', pista: 'ORDER BY nota DESC', sol: 'SELECT nombre, nota FROM estudiantes ORDER BY nota DESC' },
      { id: '5.2', texto: 'Muestra el **nombre** de todos, ordenados de la **A a la Z**.', pista: 'ORDER BY nombre (por defecto va de A a Z).', sol: 'SELECT nombre FROM estudiantes ORDER BY nombre' },
      { id: '5.3', texto: 'Muestra **nombre** y **nota** de los **3 estudiantes con mejor nota**.', pista: 'ORDER BY nota DESC y después LIMIT 3.', sol: 'SELECT nombre, nota FROM estudiantes ORDER BY nota DESC LIMIT 3' },
      { id: '5.4', texto: 'Muestra **nombre** y **nota** de los **3 estudiantes con la nota más baja**.', pista: 'ORDER BY nota (de menor a mayor) y LIMIT 3.', sol: 'SELECT nombre, nota FROM estudiantes ORDER BY nota ASC LIMIT 3' }
    ],
    escribe: {
      pregunta: '¿Cómo ordenas los resultados de mayor a menor y cómo limitas cuántas filas salen?',
      ideas: [
        { n: 'Que ORDER BY ordena', p: ['order', 'ordenar', 'ordena', 'ordenan', 'orden'], tip: 'ORDER BY sirve para ordenar el resultado.' },
        { n: 'Que DESC es de mayor a menor', p: ['desc', 'descendente', 'mayor'], tip: 'DESC ordena de mayor a menor.' },
        { n: 'Que ASC (o el orden por defecto) es de menor a mayor', p: ['asc', 'ascendente', 'defecto', 'menor'], tip: 'ASC (el orden por defecto) va de menor a mayor.' },
        { n: 'Que LIMIT limita cuántas filas salen', p: ['limit', 'limitar', 'limita', 'cantidad', 'primeras', 'primeros', 'cuantas', 'cuantos'], tip: 'LIMIT sirve para limitar cuántas filas salen.' }
      ],
      modelo: 'ORDER BY ordena el resultado. Con DESC va de mayor a menor y con ASC (por defecto) de menor a mayor. LIMIT limita cuántas filas salen, por ejemplo LIMIT 3.'
    }
  },
  {
    id: 6, titulo: 'Contar y calcular', resumen: 'COUNT, AVG, MAX y MIN: resumir muchas filas en un número.',
    aprender: [
      { t: 'p', x: 'Las **funciones de resumen** convierten muchas filas en **un solo resultado**:' },
      { t: 'p', x: '• `COUNT(*)` cuenta filas • `AVG(col)` promedio • `MAX(col)` el mayor • `MIN(col)` el menor • `SUM(col)` la suma' },
      { t: 'code', sql: 'SELECT COUNT(*) FROM estudiantes' },
      { t: 'code', sql: 'SELECT AVG(nota) FROM estudiantes' },
      { t: 'p', x: 'Puedes pedir varias a la vez y combinarlas con `WHERE`:' },
      { t: 'code', sql: "SELECT MAX(nota), MIN(nota) FROM estudiantes WHERE curso = '3ro'" }
    ],
    ejercicios: [
      { id: '6.1', texto: 'Cuenta **cuántos estudiantes** hay en la tabla.', pista: 'SELECT COUNT(*) FROM estudiantes', sol: 'SELECT COUNT(*) FROM estudiantes' },
      { id: '6.2', texto: 'Calcula el **promedio** de la columna **nota**.', pista: 'SELECT AVG(nota) FROM estudiantes', sol: 'SELECT AVG(nota) FROM estudiantes' },
      { id: '6.3', texto: 'Muestra la nota **más alta** y la nota **más baja** (en ese orden).', pista: 'SELECT MAX(nota), MIN(nota) FROM estudiantes', sol: 'SELECT MAX(nota), MIN(nota) FROM estudiantes' },
      { id: '6.4', texto: 'Cuenta **cuántos estudiantes viven en Bonao**.', pista: "COUNT(*) con WHERE ciudad = 'Bonao'", sol: "SELECT COUNT(*) FROM estudiantes WHERE ciudad = 'Bonao'" }
    ],
    escribe: {
      pregunta: '¿Qué hacen COUNT, AVG, MAX y MIN?',
      ideas: [
        { n: 'Que COUNT cuenta', p: ['cuenta', 'contar', 'cuantas', 'cuantos', 'cantidad'], tip: 'COUNT cuenta cuántas filas hay.' },
        { n: 'Que AVG calcula el promedio', p: ['promedio', 'media', 'avg'], tip: 'AVG calcula el promedio.' },
        { n: 'Que MAX y MIN dan el mayor y el menor', p: ['maximo', 'minimo', 'mayor', 'menor', 'max', 'min'], tip: 'MAX da el valor más alto y MIN el más bajo.' },
        { n: 'Que resumen muchas filas en un solo resultado', p: ['resumen', 'resume', 'resumir', 'resultado', 'solo', 'unico'], tip: 'Estas funciones resumen muchas filas en un solo resultado.' }
      ],
      modelo: 'COUNT cuenta filas, AVG calcula el promedio, MAX da el valor más alto y MIN el más bajo. Todas resumen muchas filas en un solo resultado.'
    }
  },
  {
    id: 7, titulo: 'GROUP BY y HAVING', resumen: 'Calcular por grupos: por curso, por ciudad…',
    aprender: [
      { t: 'p', x: '`GROUP BY` agrupa las filas que tienen el mismo valor y calcula **un resultado por grupo**. Por ejemplo, cuántos estudiantes hay en cada curso:' },
      { t: 'code', sql: 'SELECT curso, COUNT(*) FROM estudiantes GROUP BY curso' },
      { t: 'p', x: 'Y el promedio de nota de cada curso:' },
      { t: 'code', sql: 'SELECT curso, AVG(nota) FROM estudiantes GROUP BY curso' },
      { t: 'p', x: '`HAVING` filtra los **grupos** ya calculados. (`WHERE` filtra filas **antes** de agrupar; `HAVING` filtra grupos **después**.)' },
      { t: 'code', sql: 'SELECT curso, AVG(nota) FROM estudiantes GROUP BY curso HAVING AVG(nota) > 75' }
    ],
    ejercicios: [
      { id: '7.1', texto: 'Muestra cada **curso** y **cuántos estudiantes** tiene.', pista: 'SELECT curso, COUNT(*) FROM estudiantes GROUP BY curso', sol: 'SELECT curso, COUNT(*) FROM estudiantes GROUP BY curso' },
      { id: '7.2', texto: 'Muestra cada **curso** y el **promedio de nota** de ese curso.', pista: 'Usa AVG(nota) y GROUP BY curso.', sol: 'SELECT curso, AVG(nota) FROM estudiantes GROUP BY curso' },
      { id: '7.3', texto: 'Muestra cada **ciudad** y **cuántos estudiantes** viven ahí, de la ciudad con más a la que tiene menos.', pista: 'GROUP BY ciudad y después ORDER BY COUNT(*) DESC', sol: 'SELECT ciudad, COUNT(*) FROM estudiantes GROUP BY ciudad ORDER BY COUNT(*) DESC' },
      { id: '7.4', texto: 'Muestra los **cursos** (con su promedio) que tienen un **promedio mayor que 75**.', pista: 'Después de GROUP BY curso agrega HAVING AVG(nota) > 75', sol: 'SELECT curso, AVG(nota) FROM estudiantes GROUP BY curso HAVING AVG(nota) > 75' }
    ],
    escribe: {
      pregunta: '¿Qué hace GROUP BY y qué diferencia hay entre WHERE y HAVING?',
      ideas: [
        { n: 'Que GROUP BY agrupa filas', p: ['agrupa', 'agrupar', 'agrupan', 'grupos', 'grupo', 'junta', 'juntar'], tip: 'GROUP BY agrupa las filas que tienen el mismo valor.' },
        { n: 'Que se usa con una función como COUNT o AVG', p: ['count', 'avg', 'funcion', 'funciones', 'promedio', 'contar', 'cuenta', 'suma'], tip: 'Se usa con funciones de resumen como COUNT o AVG, para dar un resultado por grupo.' },
        { n: 'Que WHERE filtra filas antes de agrupar', p: ['where', 'antes', 'filas'], tip: 'WHERE filtra las filas antes de agrupar.' },
        { n: 'Que HAVING filtra grupos después de agrupar', p: ['having', 'despues', 'grupos'], tip: 'HAVING filtra los grupos después de agrupar.' }
      ],
      modelo: 'GROUP BY agrupa las filas con el mismo valor y, junto con COUNT o AVG, da un resultado por grupo. WHERE filtra las filas antes de agrupar y HAVING filtra los grupos después de agrupar.'
    }
  }
];
