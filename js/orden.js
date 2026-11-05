/* Reordena el curso como se enseña de verdad: crear -> llenar -> consultar -> cambiar -> relacionar -> avanzar. */
(function () {
  const old = window.LECCIONES.slice(), byId = (n) => old.find((l) => l.id === n);
  ['DATABASE', 'USE', 'SHOW', 'DDL', 'DML'].forEach((k) => { if (window.KEYWORDS.indexOf(k) < 0) window.KEYWORDS.push(k); });
  const q = (id, texto, opts, ok, fb) => ({ id: id, texto: texto, q: { opts: opts, ok: ok }, fb: fb });

  /* ---------- 1. Qué es una base de datos ---------- */
  const l1 = {
    id: 0, base: 'servidor', titulo: '¿Qué es una base de datos?', resumen: 'Qué es, cómo se organiza y por dónde se empieza un proyecto.',
    aprender: [
      { t: 'p', x: 'Una **base de datos** es un lugar donde se guarda información de forma ordenada, para poder buscarla, cambiarla y compartirla rápido. Ejemplos: las notas de un colegio, los productos de una tienda, los contactos de tu teléfono.' },
      { t: 'p', x: 'La información se guarda en **tablas**. Una tabla es como una hoja de Excel: tiene **columnas** (cada dato: nombre, edad…) y **filas**. Cada fila es un **registro**, por ejemplo un estudiante.' },
      { t: 'p', x: 'Un programa llamado **gestor de bases de datos** (MySQL, PostgreSQL, SQL Server, SQLite…) guarda y cuida la información. Con el lenguaje **SQL** le dices lo que necesitas.' },
      { t: 'p', x: 'Así se trabaja en un proyecto real, **siempre en este orden**, y es el mismo orden de este curso:' },
      { t: 'pre', x: '1. Crear la base de datos\n2. Crear las tablas (columnas y tipos de dato)\n3. Poner las llaves y las reglas\n4. Insertar los datos\n5. Consultar los datos\n6. Cambiar y borrar datos cuando haga falta\n7. Relacionar tablas y mejorar el diseño' },
      { t: 'p', x: 'Las instrucciones de SQL se agrupan según lo que hacen: **DDL** define la estructura (`CREATE`, `ALTER`, `DROP`), **DML** maneja los datos (`INSERT`, `UPDATE`, `DELETE`), **DQL** consulta (`SELECT`), **DCL** da permisos (`GRANT`, `REVOKE`) y **TCL** controla transacciones (`COMMIT`, `ROLLBACK`).' },
      { t: 'p', x: 'Lo primero en **MySQL** es **crear la base de datos** y **entrar** a ella. Aquí también puedes hacerlo: la app trae un **servidor de práctica** que se comporta como MySQL. Toca Ejecutar:' },
      { t: 'code', sql: 'CREATE DATABASE colegio;\nUSE colegio;\nSELECT DATABASE()' },
      { t: 'p', x: '`CREATE DATABASE` crea la base. `USE` entra a ella: todo lo que crees después queda dentro. `SELECT DATABASE()` te dice en cuál estás. Para ver todas las bases que existen:' },
      { t: 'code', sql: 'CREATE DATABASE colegio;\nSHOW DATABASES' },
      { t: 'p', x: 'Las demás (`information_schema`, `mysql`, `performance_schema`, `sys`) las trae MySQL por sí solo; son del sistema, no las toques. Si te **olvidas del USE** y creas una tabla, MySQL no sabe dónde guardarla y da error. Pruébalo:' },
      { t: 'code', sql: 'CREATE DATABASE colegio;\nCREATE TABLE estudiantes (id INTEGER PRIMARY KEY)' },
      { t: 'p', x: '⚠️ **Esto es una simulación** de MySQL dentro de la app, no el MySQL real. Cada vez que tocas Ejecutar, el servidor de práctica **empieza de nuevo, sin bases**, así que escribe todo junto en el mismo bloque. En MySQL Workbench real las bases se quedan guardadas. Desde la lección 2, la app ya te deja creada y seleccionada una base llamada `mi_base`, para que te concentres en las tablas.' }
    ],
    ejercicios: [
      q('1.1', '¿Qué es una **tabla** en una base de datos?', ['Un lugar con columnas y filas donde se guardan los datos', 'Un programa para dibujar', 'Una contraseña', 'Una copia de seguridad'], 0, 'Una tabla organiza los datos en columnas (el tipo de dato) y filas (los registros).'),
      q('1.2', '¿Cómo se llama cada **fila** de una tabla?', ['Columna', 'Registro', 'Llave', 'Consulta'], 1, 'Cada fila es un registro; por ejemplo, un estudiante.'),
      q('1.3', '¿Cuál es el orden correcto para empezar un proyecto de base de datos?', ['Consultar datos, crear tablas, crear la base', 'Insertar datos, crear la base, crear tablas', 'Crear la base de datos, crear las tablas, insertar los datos, consultar', 'Crear tablas, consultar, crear la base'], 2, 'Primero la estructura (base y tablas), luego los datos, y al final se consultan.'),
      { id: '1.4', texto: 'Crea una base de datos llamada **colegio**.', pista: 'CREATE DATABASE colegio', sol: 'CREATE DATABASE colegio', verify: 'SHOW DATABASES', must: [[/create\s+database/i, 'CREATE DATABASE']] },
      { id: '1.5', texto: 'Crea la base de datos **colegio** y **entra** a ella.', pista: 'CREATE DATABASE colegio; y después USE colegio;', sol: 'CREATE DATABASE colegio; USE colegio', verify: 'SELECT DATABASE()', must: [[/create\s+database/i, 'CREATE DATABASE'], [/\buse\b/i, 'USE']] },
      { id: '1.6', texto: 'Crea una base de datos llamada **prueba** y luego **bórrala** con DROP DATABASE.', pista: 'CREATE DATABASE prueba; y después DROP DATABASE prueba;', sol: 'CREATE DATABASE prueba; DROP DATABASE prueba', verify: 'SHOW DATABASES', must: [[/create\s+database/i, 'CREATE DATABASE'], [/drop\s+database/i, 'DROP DATABASE']] },
      q('1.7', 'Creaste la base **colegio** pero **no escribiste USE**. Intentas crear una tabla. ¿Qué pasa?', ['Da error: no hay ninguna base de datos seleccionada', 'La tabla se crea sola en colegio', 'Se borra la base', 'Nada, no pasa nada'], 0, 'Sin USE, MySQL no sabe en qué base guardar la tabla (error 1046: No database selected).'),
      q('1.8', '¿Qué significan las siglas **SQL**?', ['Structured Query Language (lenguaje de consulta estructurado)', 'Simple Question List', 'Secure Quick Login', 'System Query Layer'], 0, 'SQL es el lenguaje estándar para hablar con las bases de datos relacionales.'),
      q('1.9', '¿Cuál de estas instrucciones es de tipo **DDL** (define la estructura)?', ['SELECT', 'INSERT', 'CREATE TABLE', 'COMMIT'], 2, 'DDL = CREATE, ALTER y DROP: crean o cambian la estructura.')
    ],
    escribe: {
      pregunta: 'Con tus palabras: ¿qué es una base de datos, qué es una tabla y cuál es el orden para empezar un proyecto?',
      ideas: [
        { n: 'Que una base de datos guarda y organiza información', p: ['guarda', 'guardar', 'almacena', 'almacenar', 'organiza', 'organizar', 'informacion', 'ordenada', 'datos'], tip: 'Di que una base de datos guarda y organiza información (datos).' },
        { n: 'Que una tabla tiene filas y columnas', p: ['filas', 'fila', 'columnas', 'columna', 'excel', 'registros', 'registro'], tip: 'Una tabla tiene filas (registros) y columnas, como una hoja de Excel.' },
        { n: 'Que primero se crea la base y las tablas', p: ['primero', 'crear', 'crea', 'tablas', 'estructura', 'base'], tip: 'Primero se crea la base de datos y las tablas.' },
        { n: 'Que después se insertan y se consultan los datos', p: ['insertar', 'inserta', 'luego', 'despues', 'consultar', 'consulta', 'datos'], tip: 'Después se insertan los datos y al final se consultan.' }
      ],
      modelo: 'Una base de datos guarda y organiza información. Está formada por tablas, que tienen columnas y filas; cada fila es un registro. En un proyecto primero se crea la base de datos y las tablas, después se insertan los datos y al final se consultan.'
    }
  };

  /* ---------- 2. Crear tablas (antes lección 8) ---------- */
  const l2 = byId(8); l2.base = 'vacia';
  l2.aprender[0] = { t: 'p', x: 'Ya tienes la base de datos (en esta app, desde aquí, ya está creada y seleccionada: se llama `mi_base`). Ahora vas a **crear tus tablas**: es el paso donde decides qué información vas a guardar y de qué tipo es cada dato.' };
  l2.aprender[1] = { t: 'p', x: '**Importante:** en esta app, cada vez que tocas Ejecutar, la base de datos **empieza de nuevo, vacía**. Si creas una tabla y la quieres usar, escribe todo junto en el mismo bloque.' };
  l2.aprender[8] = { t: 'code', sql: 'CREATE TABLE estudiantes (\n  id INTEGER PRIMARY KEY,\n  nombre TEXT\n);\nALTER TABLE estudiantes ADD COLUMN telefono TEXT', ver: "SELECT name AS columna, type AS tipo FROM pragma_table_info('estudiantes')" };
  l2.aprender[10] = { t: 'code', sql: 'CREATE TABLE notas (\n  id INTEGER PRIMARY KEY\n);\nDROP TABLE notas', ver: "SELECT name AS tablas FROM sqlite_master WHERE type = 'table'" };
  l2.ejercicios[3] = Object.assign({}, l2.ejercicios[3], { texto: 'Crea la tabla **estudiantes** con **id** (llave primaria) y **nombre** (texto). Luego, con ALTER TABLE, agrégale la columna **telefono** (texto).', pista: 'Primero CREATE TABLE y después ALTER TABLE estudiantes ADD COLUMN telefono TEXT, separados por punto y coma.', sol: 'CREATE TABLE estudiantes (id INTEGER PRIMARY KEY, nombre TEXT); ALTER TABLE estudiantes ADD COLUMN telefono TEXT', must: [[/alter\s+table/i, 'ALTER TABLE']] });
  l2.ejercicios[4] = Object.assign({}, l2.ejercicios[4], { texto: 'Crea la tabla **notas** con una sola columna **id** (llave primaria) y después **bórrala** con DROP TABLE.', pista: 'CREATE TABLE notas (...); y luego DROP TABLE notas', sol: 'CREATE TABLE notas (id INTEGER PRIMARY KEY); DROP TABLE notas', must: [[/create\s+table/i, 'CREATE TABLE'], [/drop\s+table/i, 'DROP TABLE']] });

  /* ---------- 3. Llaves y restricciones (antes lección 9) ---------- */
  const l3 = byId(9); l3.base = 'vacia';
  l3.aprender[4] = { t: 'code', sql: 'CREATE TABLE estudiantes (\n  id INTEGER PRIMARY KEY,\n  nombre TEXT\n);\nCREATE TABLE inscripciones (\n  id INTEGER PRIMARY KEY,\n  estudiante_id INTEGER,\n  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id)\n)', ver: "SELECT \"from\" AS columna, \"table\" AS apunta_a, \"to\" AS columna_destino FROM pragma_foreign_key_list('inscripciones')" };
  l3.aprender[5] = { t: 'p', x: 'Prueba a romper las reglas y mira los errores (cada bloque es independiente). Para eso hace falta meter datos con `INSERT`, que verás completo en la siguiente lección. **Llave primaria repetida:**' };
  l3.aprender[6] = { t: 'code', sql: "CREATE TABLE estudiantes (id INTEGER PRIMARY KEY, nombre TEXT);\nINSERT INTO estudiantes VALUES (1, 'Ana');\nINSERT INTO estudiantes VALUES (1, 'Repetido')" };
  l3.aprender[8] = { t: 'code', sql: 'CREATE TABLE profesores (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL);\nINSERT INTO profesores (id) VALUES (10)' };
  l3.aprender[9] = { t: 'p', x: '**Llave foránea que no existe** (el estudiante 99 no existe):' };
  l3.aprender[10] = { t: 'code', sql: 'CREATE TABLE estudiantes (id INTEGER PRIMARY KEY, nombre TEXT);\nCREATE TABLE notas (estudiante_id INTEGER, nota INTEGER, FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id));\nINSERT INTO notas VALUES (99, 80)' };
  l3.ejercicios[1] = Object.assign({}, l3.ejercicios[1], { texto: 'Crea las tablas **estudiantes** y **materias** (cada una con **id** llave primaria y **nombre** texto). Luego crea **inscripciones** con **id** (llave primaria), **estudiante_id** y **materia_id** (enteros). **estudiante_id** debe apuntar a **estudiantes(id)** y **materia_id** a **materias(id)**.', sol: 'CREATE TABLE estudiantes (id INTEGER PRIMARY KEY, nombre TEXT); CREATE TABLE materias (id INTEGER PRIMARY KEY, nombre TEXT); CREATE TABLE inscripciones (id INTEGER PRIMARY KEY, estudiante_id INTEGER, materia_id INTEGER, FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id), FOREIGN KEY (materia_id) REFERENCES materias(id))', must: [[/foreign\s+key/i, 'FOREIGN KEY']], verify: "SELECT \"from\", \"table\", \"to\" FROM pragma_foreign_key_list('inscripciones') UNION ALL SELECT 'tabla', name, '' FROM sqlite_master WHERE type = 'table' UNION ALL SELECT 'col ' || m.name, c.name, c.type FROM sqlite_master m JOIN pragma_table_info(m.name) c WHERE m.type = 'table'" });

  /* ---------- 4. Insertar datos (nueva, parte de la antigua 10) ---------- */
  const mascotas = 'CREATE TABLE mascotas (id INTEGER PRIMARY KEY, nombre TEXT, edad INTEGER); ';
  const l4 = {
    id: 0, base: 'vacia', titulo: 'INSERT: meter datos', resumen: 'Llenar las tablas con información.',
    aprender: [
      { t: 'p', x: 'Ya tienes tablas, pero están **vacías**. `INSERT INTO` agrega una fila nueva. Pones los valores **en el mismo orden de las columnas**: los textos entre comillas simples y los números sin comillas.' },
      { t: 'code', sql: "CREATE TABLE mascotas (\n  id INTEGER PRIMARY KEY,\n  nombre TEXT,\n  edad INTEGER\n);\nINSERT INTO mascotas VALUES (1, 'Rex', 3);\nSELECT * FROM mascotas" },
      { t: 'p', x: 'La última línea, `SELECT * FROM mascotas`, solo sirve para **ver** lo que hay en la tabla; la aprenderás completa en la próxima parte del curso.' },
      { t: 'p', x: 'También puedes indicar **solo las columnas** que quieres llenar. Las que no pongas quedan vacías (`NULL`) o toman su valor automático, como el `id`:' },
      { t: 'code', sql: "CREATE TABLE mascotas (id INTEGER PRIMARY KEY, nombre TEXT, edad INTEGER);\nINSERT INTO mascotas (nombre, edad) VALUES ('Luna', 2);\nSELECT * FROM mascotas" },
      { t: 'p', x: 'Para agregar **varias filas de una vez**, sepáralas con coma:' },
      { t: 'code', sql: "CREATE TABLE mascotas (id INTEGER PRIMARY KEY, nombre TEXT, edad INTEGER);\nINSERT INTO mascotas (nombre, edad) VALUES ('Rex', 3), ('Luna', 2), ('Toby', 5);\nSELECT * FROM mascotas" },
      { t: 'p', x: 'Si te equivocas con la cantidad de valores, la base de datos te avisa. Pruébalo:' },
      { t: 'code', sql: "CREATE TABLE mascotas (id INTEGER PRIMARY KEY, nombre TEXT, edad INTEGER);\nINSERT INTO mascotas VALUES (1, 'Rex')" },
      { t: 'p', x: '💡 En **MySQL** es igual. La diferencia es que el número del `id` se pone solo si la columna es `INT AUTO_INCREMENT PRIMARY KEY`.' }
    ],
    ejercicios: [
      { id: '4.1', texto: "Crea la tabla **mascotas** con **id** (llave primaria), **nombre** (texto) y **edad** (entero). Inserta a **Rex**, con id **1** y **3** años, poniendo todos los valores.", pista: "INSERT INTO mascotas VALUES (1, 'Rex', 3)", sol: mascotas + "INSERT INTO mascotas VALUES (1, 'Rex', 3)", verify: 'SELECT * FROM mascotas ORDER BY id', names: true },
      { id: '4.2', texto: "Crea la misma tabla **mascotas** e inserta a **Luna** de **2** años, indicando **solo** las columnas nombre y edad (el id se pone solo).", pista: "INSERT INTO mascotas (nombre, edad) VALUES ('Luna', 2)", sol: mascotas + "INSERT INTO mascotas (nombre, edad) VALUES ('Luna', 2)", verify: 'SELECT * FROM mascotas ORDER BY id', names: true },
      { id: '4.3', texto: "Crea la tabla **mascotas** e inserta, **con un solo INSERT**, estas tres: **Rex** (3), **Luna** (2) y **Toby** (5). Indica solo nombre y edad.", pista: "INSERT INTO mascotas (nombre, edad) VALUES (...), (...), (...)", sol: mascotas + "INSERT INTO mascotas (nombre, edad) VALUES ('Rex', 3), ('Luna', 2), ('Toby', 5)", verify: 'SELECT * FROM mascotas ORDER BY id', names: true },
      { id: '4.4', texto: "Crea la tabla **productos** con **id** (llave primaria), **nombre** (texto) y **precio** (**DECIMAL(8,2)**). Inserta **'Pan'** a **25.50** y **'Leche'** a **60**, indicando solo nombre y precio.", pista: "INSERT INTO productos (nombre, precio) VALUES ('Pan', 25.50), ('Leche', 60)", sol: "CREATE TABLE productos (id INTEGER PRIMARY KEY, nombre TEXT, precio DECIMAL(8,2)); INSERT INTO productos (nombre, precio) VALUES ('Pan', 25.50), ('Leche', 60)", verify: 'SELECT * FROM productos ORDER BY id', names: true },
      q('4.5', '¿Cómo se escribe el texto **Rex** dentro de un INSERT?', ["'Rex' (entre comillas simples)", 'Rex (sin comillas)', '(Rex)', '#Rex#'], 0, "Los textos van entre comillas simples: 'Rex'. Los números van sin comillas."),
      q('4.6', 'Insertas un **id que ya existe** en una columna con llave primaria. ¿Qué pasa?', ['Se reemplaza la fila anterior', 'Da un error: la llave primaria no se puede repetir', 'Se guardan las dos filas', 'Se borra la tabla'], 1, 'La llave primaria identifica cada fila y no puede repetirse: la base de datos rechaza el INSERT.')
    ],
    escribe: {
      pregunta: '¿Para qué sirve INSERT y cómo se escriben los valores de texto y de número?',
      ideas: [
        { n: 'Que INSERT agrega filas nuevas a una tabla', p: ['insert', 'agrega', 'agregar', 'inserta', 'insertar', 'meter', 'filas', 'fila', 'nueva', 'nuevo', 'llena', 'llenar'], tip: 'INSERT agrega filas nuevas a una tabla.' },
        { n: 'Que los valores van en el mismo orden de las columnas', p: ['orden', 'columnas', 'columna', 'values', 'valores'], tip: 'Los valores se escriben en el mismo orden de las columnas (o indicando las columnas).' },
        { n: 'Que los textos van entre comillas', p: ['comillas', 'comilla', 'texto', 'textos'], tip: 'Los textos van entre comillas simples.' },
        { n: 'Que los números van sin comillas', p: ['numeros', 'numero', 'sin'], tip: 'Los números se escriben sin comillas.' }
      ],
      modelo: 'INSERT INTO agrega filas nuevas a una tabla. Los valores se escriben en el mismo orden de las columnas, o se indican las columnas que se van a llenar. Los textos van entre comillas simples y los números sin comillas.'
    }
  };

  /* ---------- 5. SELECT: ver los datos (antes lección 1) ---------- */
  const l5 = byId(1); l5.titulo = 'SELECT: ver los datos'; l5.resumen = 'Tu primera consulta: pedirle datos a la base.';
  l5.aprender = [
    { t: 'p', x: 'Ya sabes crear tablas y meter datos. Ahora viene lo que más se usa en la vida real: **consultar**, o sea, hacerle preguntas a la base de datos con `SELECT`.' },
    { t: 'p', x: 'Desde aquí practicas con una **base de datos del colegio que ya trae datos** (la ves en "Ver las tablas con las que practicas"). Es como las que tú aprendiste a crear.' }
  ].concat(old[0].aprender.slice(3));
  l5.escribe = {
    pregunta: '¿Qué hace SELECT * FROM una tabla y para qué sirve LIMIT?',
    ideas: [
      { n: 'Que SELECT consulta o muestra datos', p: ['select', 'consulta', 'consultar', 'muestra', 'mostrar', 'ver', 'datos'], tip: 'SELECT sirve para consultar (mostrar) datos.' },
      { n: 'Que el asterisco significa todas las columnas', p: ['todas', 'todo', 'todos', 'columnas', 'asterisco'], tip: 'El asterisco (*) significa todas las columnas.' },
      { n: 'Que FROM indica de qué tabla', p: ['from', 'tabla', 'de'], tip: 'FROM indica de qué tabla se sacan los datos.' },
      { n: 'Que LIMIT limita cuántas filas se muestran', p: ['limit', 'limita', 'limitar', 'filas', 'primeras', 'cantidad'], tip: 'LIMIT limita cuántas filas se muestran.' }
    ],
    modelo: 'SELECT sirve para consultar y mostrar datos. El asterisco (*) significa todas las columnas y FROM indica de qué tabla. LIMIT limita cuántas filas se muestran, por ejemplo las primeras 5.'
  };

  /* ---------- 12. UPDATE y DELETE (resto de la antigua 10) ---------- */
  const o10 = byId(10);
  const l12 = Object.assign({}, o10, {
    titulo: 'UPDATE y DELETE', resumen: 'Cambiar y borrar datos que ya existen.',
    aprender: [{ t: 'p', x: 'Ya sabes insertar y consultar. Ahora vas a **cambiar** y **borrar** datos que ya están guardados. Estas dos instrucciones usan `WHERE`, que ya dominas.' }].concat(o10.aprender.slice(4)),
    ejercicios: o10.ejercicios.slice(2),
    escribe: {
      pregunta: '¿Para qué sirven UPDATE y DELETE, y por qué hay que tener cuidado con el WHERE?',
      ideas: [
        { n: 'Que UPDATE cambia datos que ya existen', p: ['update', 'cambia', 'cambiar', 'modifica', 'modificar', 'actualiza', 'actualizar'], tip: 'UPDATE cambia (actualiza) datos que ya existen.' },
        { n: 'Que DELETE borra filas', p: ['delete', 'borra', 'borrar', 'elimina', 'eliminar'], tip: 'DELETE borra filas.' },
        { n: 'Que WHERE dice a cuáles filas afectar', p: ['where', 'cuales', 'condicion', 'filas', 'fila'], tip: 'WHERE dice a cuáles filas se aplica el cambio.' },
        { n: 'Que sin WHERE se afectan todas las filas', p: ['todas', 'todos', 'toda', 'cuidado', 'peligro', 'peligroso', 'sin'], tip: 'Sin WHERE, UPDATE y DELETE afectan todas las filas. ¡Cuidado!' }
      ],
      modelo: 'UPDATE cambia datos que ya existen y DELETE borra filas. El WHERE dice a cuáles filas se aplica. Si se te olvida el WHERE, el cambio o el borrado se aplica a todas las filas de la tabla, por eso hay que tener cuidado.'
    }
  });

  /* ---------- honestidad sobre SQLite vs MySQL ---------- */
  const l17 = byId(15);
  l17.aprender[0] = { t: 'p', x: 'Esta app usa **SQLite**, que es un gestor distinto de **MySQL**. Lo básico se escribe igual: `SELECT`, `WHERE`, `ORDER BY`, `GROUP BY`, `JOIN`, `INSERT`, `UPDATE`, `DELETE`, y todos los conceptos (tablas, llaves, relaciones). Esta app traduce a SQLite lo que escribes en MySQL, así que casi todo se escribe igual. Pero hay **diferencias reales** que debes conocer:' };
  l17.aprender.splice(1, 1, { t: 'p', x: '• **Número automático, ENGINE, ENUM, `CONCAT`, `NOW()`, `IF`, `LEFT`, `TRUNCATE`:** los puedes escribir como en MySQL; la app los traduce por dentro.' }, { t: 'p', x: '• **Crear y usar la base:** `CREATE DATABASE x;` y `USE x;` funcionan en las lecciones porque la app simula el servidor. En "Mis bases" y en el Laboratorio ya estás dentro de una base.' }, { t: 'p', x: '• **Ver tablas y columnas:** `SHOW TABLES;` y `DESCRIBE tabla;` funcionan en las lecciones. En el Laboratorio y en Mis bases usa `sqlite_master` y `pragma_table_info`.' }, { t: 'p', x: '• **División:** aquí `5 / 2` da **2**; en MySQL da **2.5**. Esta diferencia sí es real.' }, { t: 'p', x: '• **Fechas con formato:** `DATE_FORMAT(...)` no existe aquí; usa `strftime(...)`.' }, { t: 'p', x: '• **Cambiar una columna:** aquí no existe `ALTER TABLE … MODIFY` ni `CHANGE`; en MySQL sí.' }, { t: 'p', x: '• **FULL OUTER JOIN:** aquí funciona; en MySQL **no existe**.' }, { t: 'p', x: '• **Tipos de dato:** aquí son muy flexibles (puedes guardar texto en una columna de enteros); MySQL es estricto.' }, { t: 'p', x: '• **Lo que no existe aquí:** procedimientos almacenados, usuarios y permisos (`CREATE USER`, `GRANT`), y las bases no se guardan entre ejecuciones en las lecciones. Eso se practica en MySQL Workbench.' });
  l17.ejercicios.push(q('15.6', '¿Qué hace **TRUNCATE TABLE** en MySQL?', ['Borra todas las filas de la tabla', 'Borra la base de datos', 'Cambia el nombre de la tabla', 'Cuenta las filas'], 0, 'TRUNCATE TABLE vacía la tabla. La tabla sigue existiendo, sin filas.'));
  l17.ejercicios.push(q('15.7', '¿Cuánto da **5 / 2** en esta app (SQLite) y cuánto en MySQL?', ['2 en esta app y 2.5 en MySQL', '2.5 en los dos', '2 en los dos', '2.5 en esta app y 2 en MySQL'], 0, 'SQLite divide enteros y da un entero (2). MySQL da el resultado con decimales (2.5).'));
  byId(3).aprender.push({ t: 'p', x: '💡 **Mayúsculas:** igual que en **MySQL**, `WHERE ciudad = \'bonao\'` sí encuentra \'Bonao\' en las columnas de texto.' });
  const l4i = l4.aprender.length - 1;
  l4.aprender[l4i] = { t: 'p', x: '💡 En **MySQL** es igual. El `id` se numera solo porque la columna se creó con `INT AUTO_INCREMENT PRIMARY KEY`.' };

  /* ---------- orden final y renumeración ---------- */
  const order = [l1, l2, l3, l4, l5, byId(2), byId(3), byId(4), byId(5), byId(6), byId(7), l12, byId(11), byId(12), byId(13), byId(14), byId(15)];
  for (let n = 16; n <= 23; n++) order.push(byId(n));
  order.forEach((l, i) => {
    l.id = i + 1;
    l.ejercicios.forEach((e, k) => { e.id = l.id + '.' + (k + 1); });
  });
  window.LECCIONES.length = 0; order.forEach((l) => window.LECCIONES.push(l));
  window.PARTES = { 1: 'Parte 1 · Crear la base de datos', 5: 'Parte 2 · Consultar datos', 12: 'Parte 3 · Cambiar datos, relaciones y diseño', 17: 'Parte 4 · MySQL de verdad', 18: 'Parte 5 · Avanzado' };

  /* sintaxis MySQL en demos, pistas y soluciones (la app la traduce por dentro) */
  const mysqlize = (t) => typeof t === 'string' ? t.replace(/\bINTEGER PRIMARY KEY\b(?!\s+AUTOINCREMENT)/g, 'INT AUTO_INCREMENT PRIMARY KEY') : t;
  window.LECCIONES.forEach((l) => {
    l.aprender.forEach((b) => { if (b.sql) b.sql = mysqlize(b.sql); if (b.t === 'copy') b.x = mysqlize(b.x); });
    l.ejercicios.forEach((e) => { if (e.sol) e.sol = mysqlize(e.sol); if (e.pista) e.pista = mysqlize(e.pista); });
  });
}());
