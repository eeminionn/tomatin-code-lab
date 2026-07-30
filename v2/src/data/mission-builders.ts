import type {
  Course,
  Difficulty,
  Language,
  Mission,
  MissionExample,
  MissionTest,
  MissionVariant,
} from "@/types";

export function test(
  id: string,
  label: string,
  expression: string,
  expected: string,
  feedback: string,
  actualExpression?: string,
): MissionTest {
  return { id, label, expression, expected, feedback, actualExpression };
}

export function variant(
  language: Language,
  starterCode: string,
  referenceSolution: string,
  publicTests: MissionTest[],
  hiddenTests: MissionTest[],
  examples?: MissionExample[],
  starterExampleCode?: string,
): MissionVariant {
  return {
    language,
    starterCode: appendStarterExample(
      language,
      starterCode,
      publicTests[0],
      starterExampleCode,
    ),
    expectedSignature: inferSignature(language, starterCode),
    examples:
      examples ??
      publicTests.slice(0, 2).map((entry, index) =>
        exampleFromTest(entry, index),
      ),
    referenceSolution,
    publicTests,
    hiddenTests,
  };
}

function appendStarterExample(
  language: Language,
  starterCode: string,
  publicTest: MissionTest | undefined,
  starterExampleCode?: string,
): string {
  if (!publicTest) return starterCode;
  const comment = language === "python" ? "#" : "//";
  const header = `${comment} DATOS DE EJEMPLO (el evaluador usará también otros valores):`;
  const example = starterExampleCode?.trim()
    ? starterExampleCode.trim()
    : [
        ...(publicTest.actualExpression ?? publicTest.expression)
          .split("\n")
          .map((line) => `${comment} ${line}`),
        `${comment} Resultado esperado: ${publicTest.expected}`,
      ].join("\n");
  return `${starterCode.trimEnd()}

${header}
${example}
`;
}

function inferSignature(language: Language, starterCode: string): string {
  const lines = starterCode
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const signature =
    language === "python"
      ? lines.find((line) => line.startsWith("def "))
      : lines.find((line) => line.includes("(") && line.endsWith("{"));
  return (signature ?? lines[0] ?? "")
    .replace(/\s*\{$/, "")
    .replace(/:$/, "");
}

function exampleFromTest(testCase: MissionTest, index: number): MissionExample {
  return {
    id: testCase.id || `example-${index + 1}`,
    label: testCase.label,
    input: testCase.actualExpression ?? testCase.expression,
    output: testCase.expected,
    explanation: testCase.feedback,
  };
}

export function cpp(source: string): string {
  return `#include <algorithm>
#include <cmath>
#include <deque>
#include <iostream>
#include <memory>
#include <numeric>
#include <optional>
#include <queue>
#include <regex>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>
using namespace std;

${source.trim()}
`;
}

interface MissionInput {
  id: string;
  slug: string;
  course: Course;
  module: string;
  order: number;
  title: string;
  summary: string;
  context: string;
  brief: string;
  goal?: string;
  conceptIntro?: string;
  steps?: string[];
  constraints?: string[];
  successCriteria?: string[];
  prerequisites?: string[];
  pseudocodeHint?: string;
  difficulty: Difficulty;
  points: number;
  duration: number;
  tags: string[];
  objectives: string[];
  hints: string[];
  variants: Record<Language, MissionVariant>;
}

type GuidedMissionContent = Pick<
  MissionInput,
  | "goal"
  | "conceptIntro"
  | "steps"
  | "constraints"
  | "successCriteria"
  | "pseudocodeHint"
>;

const GUIDED_CONTENT: Record<string, GuidedMissionContent> = {
  "p1-02-var-limache": {
    goal:
      'Retornar "GOL" únicamente cuando fueraDeJuego y falta sean falsos; todos los demás casos deben retornar "ANULADO".',
    conceptIntro:
      "Una condición compuesta permite traducir una regla con varias señales a una decisión única. Aquí debes distinguir la jugada limpia de las tres combinaciones que contienen una infracción.",
    steps: [
      "Identifica qué combinación representa una jugada válida.",
      "Construye una expresión booleana que sea verdadera solo en ese caso.",
      "Retorna una de las dos cadenas exactas según el resultado.",
    ],
    constraints: [
      "Conserva la firma de la función y las mayúsculas de las cadenas.",
      "No consideres válida una jugada si existe al menos una infracción.",
    ],
    successCriteria: [
      "Aprueba las cuatro combinaciones posibles de las dos entradas.",
      "Retorna siempre una cadena y no imprime el resultado.",
    ],
    pseudocodeHint:
      "SI no hay fuera de juego Y no hay falta, RETORNAR GOL; EN OTRO CASO, RETORNAR ANULADO.",
  },
  "p1-03-semaforo-led": {
    goal:
      'Transformar cada pin recibido en un mensaje "PIN n: ON", conservando el orden original.',
    conceptIntro:
      "Recorrer una colección significa visitar cada posición exactamente una vez. El índice debe mantenerse dentro del rango y la salida debe crecer al mismo ritmo que la entrada.",
    steps: [
      "Crea una colección vacía para los mensajes.",
      "Recorre los pines desde el primero hasta el último.",
      "Construye un mensaje por pin, agrégalo a la salida y retorna la colección.",
    ],
    constraints: [
      "No cambies el orden ni el valor de los pines.",
      "Una entrada vacía debe producir una salida vacía.",
    ],
    successCriteria: [
      "La salida tiene la misma cantidad de elementos que la entrada.",
      "Cada mensaje respeta exactamente el formato solicitado.",
    ],
    pseudocodeHint:
      "CREAR salida vacía; PARA CADA pin, AGREGAR el mensaje formateado; RETORNAR salida.",
  },
  "p1-04-conversor-hallulla": {
    goal:
      "Calcular cuántas bolsas completas de 500 gramos se requieren, incluyendo una bolsa adicional cuando exista un resto.",
    conceptIntro:
      "Cuando una unidad no puede fraccionarse, una división debe redondearse hacia arriba. Antes de dividir conviene separar las entradas que no representan una cantidad válida.",
    steps: [
      "Retorna cero si los gramos no son positivos.",
      "Divide los gramos por la capacidad de una bolsa.",
      "Redondea el cociente hacia arriba y retorna el entero.",
    ],
    constraints: [
      "Cada bolsa representa exactamente 500 gramos.",
      "El resultado nunca puede ser negativo ni fraccionario.",
    ],
    successCriteria: [
      "Las cantidades exactas no agregan una bolsa extra.",
      "Cualquier resto positivo agrega exactamente una bolsa.",
    ],
    pseudocodeHint:
      "SI gramos <= 0, RETORNAR 0; SI NO, RETORNAR TECHO(gramos / 500).",
  },
  "p1-05-esp-con-fiebre": {
    goal:
      "Retornar, en su orden original, las lecturas cuya distancia absoluta al promedio sea mayor que 8.",
    conceptIntro:
      "Este problema requiere dos recorridos: uno para calcular el promedio y otro para decidir qué lecturas se alejan lo suficiente. La lista vacía debe resolverse antes de dividir.",
    steps: [
      "Si no hay lecturas, retorna una colección vacía.",
      "Suma las lecturas y calcula el promedio.",
      "Filtra las lecturas usando la distancia absoluta al promedio.",
    ],
    constraints: [
      "El umbral es estrictamente mayor que 8; una distancia igual a 8 no cuenta.",
      "No reordenes ni redondees las lecturas.",
    ],
    successCriteria: [
      "No ocurre una división por cero con la entrada vacía.",
      "Solo aparecen valores que superan el umbral definido.",
    ],
    pseudocodeHint:
      "promedio = SUMA / CANTIDAD; PARA CADA lectura, SI ABS(lectura - promedio) > 8, AGREGARLA.",
  },
  "p1-06-clave-del-profe": {
    goal:
      "Normalizar la entrada y validar que el resultado contenga letras, un guion y exactamente dos dígitos.",
    conceptIntro:
      "Normalizar antes de validar reduce variantes equivalentes. La validación debe cubrir la cadena completa para evitar aceptar texto adicional al inicio o al final.",
    steps: [
      "Elimina los espacios exteriores y convierte la cadena a minúsculas.",
      "Comprueba la estructura letras-guion-dos dígitos.",
      "Retorna un booleano con el resultado de la validación.",
    ],
    constraints: [
      "Solo se permiten letras de a a z antes del guion.",
      "Debe existir exactamente un guion y dos dígitos finales.",
    ],
    successCriteria: [
      "Acepta entradas equivalentes con espacios o mayúsculas.",
      "Rechaza cadenas parciales, invertidas o con separadores distintos.",
    ],
    pseudocodeHint:
      "normalizada = MINÚSCULAS(RECORTAR entrada); RETORNAR COINCIDE_COMPLETA(normalizada, patrón).",
  },
  "p1-07-inventario-maker": {
    goal:
      "Validar un retiro, calcular el stock resultante y determinar por separado si hace falta reponer.",
    conceptIntro:
      "Una transición de estado solo debe aplicarse después de validar sus condiciones. Separar el descuento de la alerta de reposición mantiene cada función con una responsabilidad clara.",
    steps: [
      "Rechaza retiros negativos o mayores al stock disponible.",
      "Para un retiro válido, retorna stock menos retiro.",
      "En la segunda función, compara el stock con el mínimo.",
    ],
    constraints: [
      "stockSeguro retorna -1 para un retiro inválido.",
      "La igualdad con el mínimo no requiere reposición.",
    ],
    successCriteria: [
      "Nunca se devuelve un stock negativo válido.",
      "Cada función cumple su contrato sin depender de estado externo.",
    ],
    pseudocodeHint:
      "SI retiro < 0 O retiro > stock, RETORNAR -1; SI NO, RETORNAR stock - retiro.",
  },
  "p1-08-loop-viernes": {
    goal:
      "Construir la secuencia de enteros desde 1 hasta el límite, protegiendo el bucle con un rango válido.",
    conceptIntro:
      "Todo bucle necesita inicio, condición de término y avance. Una guarda previa evita ejecutar una cantidad inesperada de iteraciones.",
    steps: [
      "Valida que el límite esté entre 1 y 100.",
      "Crea una colección vacía y un contador que comience en 1.",
      "Agrega cada contador hasta incluir el límite y retorna la colección.",
    ],
    constraints: [
      "Los límites válidos son inclusivos.",
      "Para entradas fuera de rango retorna una colección vacía.",
    ],
    successCriteria: [
      "El primer elemento es 1 y el último es el límite.",
      "El bucle siempre termina y no supera 100 iteraciones.",
    ],
    pseudocodeHint:
      "SI límite está fuera de 1..100, RETORNAR vacío; PARA i DESDE 1 HASTA límite, AGREGAR i.",
  },
  "p1-09-paltas-qa": {
    goal:
      "Retornar verdadero solo cuando peso y madurez estén dentro de sus rangos inclusivos.",
    conceptIntro:
      "Una especificación con rangos se convierte en comparaciones de límites. La palabra 'incluyendo' determina que debes usar comparaciones inclusivas.",
    steps: [
      "Comprueba que el peso esté entre 150 y 300.",
      "Comprueba que la madurez esté entre 3 y 5.",
      "Combina ambas condiciones y retorna el booleano.",
    ],
    constraints: [
      "Los cuatro límites son válidos.",
      "Ambos rangos deben cumplirse al mismo tiempo.",
    ],
    successCriteria: [
      "Acepta casos centrales y los extremos exactos.",
      "Rechaza un valor apenas fuera de cualquiera de los rangos.",
    ],
    pseudocodeHint:
      "pesoValido = 150 <= peso <= 300; madurezValida = 3 <= madurez <= 5; RETORNAR ambos.",
  },
  "p1-10-marcador-naranja": {
    goal:
      'Validar tres números y retornar el formato exacto "goles|tarjetas|minuto" o "ERROR".',
    conceptIntro:
      "Validar primero evita construir resultados con datos imposibles. Una salida con formato estable debe respetar tanto el orden de los campos como sus separadores.",
    steps: [
      "Comprueba que goles, tarjetas y minuto no sean negativos.",
      "Comprueba que el minuto no supere 120.",
      "Si todo es válido, une los tres valores con barras verticales.",
    ],
    constraints: [
      "No agregues espacios al resumen.",
      "Cualquier entrada inválida produce exactamente la cadena ERROR.",
    ],
    successCriteria: [
      "El formato contiene tres valores en el orden indicado.",
      "Los límites de minuto 0 y 120 son aceptados.",
    ],
    pseudocodeHint:
      "SI algún valor es inválido, RETORNAR ERROR; SI NO, RETORNAR goles + | + tarjetas + | + minuto.",
  },
  "p2-01-factorial-recursivo": {
    goal:
      "Calcular n factorial mediante recursión, con un caso base que detenga correctamente la cadena de llamadas.",
    conceptIntro:
      "Una función recursiva necesita un caso base y un paso que reduzca el problema. Cada llamada debe acercarse de forma estricta al caso base.",
    steps: [
      "Define el resultado para 0 y 1.",
      "Reduce n a n - 1 en la llamada recursiva.",
      "Multiplica n por el resultado del subproblema.",
    ],
    constraints: [
      "No uses bucles para reemplazar la recursión.",
      "La entrada será un entero no negativo dentro del rango de pruebas.",
    ],
    successCriteria: [
      "La función termina para 0 y para entradas positivas.",
      "Cada nivel recursivo combina correctamente su valor con el siguiente.",
    ],
    pseudocodeHint:
      "SI n <= 1, RETORNAR 1; SI NO, RETORNAR n * factorial(n - 1).",
  },
  "p2-02-duplicados-lineales": {
    goal:
      "Detectar si aparece un valor repetido usando una sola pasada y memoria auxiliar.",
    conceptIntro:
      "Un conjunto permite comprobar pertenencia en tiempo constante esperado. Guardar cada valor visto evita comparar todos los pares.",
    steps: [
      "Crea un conjunto vacío.",
      "Para cada valor, comprueba si ya está en el conjunto.",
      "Retorna verdadero al encontrar un repetido; si terminas, retorna falso.",
    ],
    constraints: [
      "La complejidad temporal esperada debe ser O(n).",
      "No ordenes ni modifiques la colección de entrada.",
    ],
    successCriteria: [
      "Detecta repeticiones consecutivas y separadas.",
      "Retorna falso para colecciones vacías o sin duplicados.",
    ],
    pseudocodeHint:
      "vistos = conjunto vacío; PARA CADA valor: SI está en vistos, RETORNAR verdadero; SI NO, AGREGARLO.",
  },
  "p2-03-busqueda-bodega": {
    goal:
      "Retornar el índice de un objetivo en una colección ordenada o -1 si no existe, reduciendo el intervalo a la mitad.",
    conceptIntro:
      "La búsqueda binaria mantiene un intervalo candidato. Comparar con su punto medio permite descartar la mitad que no puede contener el objetivo.",
    steps: [
      "Inicializa los límites izquierdo y derecho.",
      "Calcula el punto medio sin salir del intervalo.",
      "Ajusta uno de los límites hasta encontrar el valor o vaciar el intervalo.",
    ],
    constraints: [
      "No uses una búsqueda lineal ni una función de búsqueda incorporada.",
      "La entrada se considera ordenada de menor a mayor.",
    ],
    successCriteria: [
      "Encuentra elementos al inicio, centro y final.",
      "Termina y retorna -1 cuando el objetivo no existe.",
    ],
    pseudocodeHint:
      "MIENTRAS izquierda <= derecha: medio = ...; comparar; mover izquierda o derecha descartando medio.",
  },
  "p2-04-merge-sensores": {
    goal:
      "Ordenar una colección mediante división recursiva y combinación estable de mitades ordenadas.",
    conceptIntro:
      "Merge sort separa hasta obtener casos triviales y luego combina resultados. La función de mezcla conserva el orden comparando los primeros elementos pendientes.",
    steps: [
      "Retorna directamente las colecciones de largo cero o uno.",
      "Divide la colección y ordena recursivamente ambas mitades.",
      "Combina las mitades avanzando un índice en cada comparación.",
    ],
    constraints: [
      "Implementa la división y la mezcla; no uses el ordenamiento incorporado.",
      "Conserva los valores repetidos.",
    ],
    successCriteria: [
      "Ordena entradas pares, impares, vacías y con duplicados.",
      "La combinación no pierde ni agrega elementos.",
    ],
    pseudocodeHint:
      "SI largo <= 1, RETORNAR; dividir; ordenar izquierda y derecha; MEZCLAR tomando siempre el menor pendiente.",
  },
  "p2-05-lista-jumpers": {
    goal:
      "Mantener una lista enlazada coherente al insertar, retirar y consultar sus elementos.",
    conceptIntro:
      "La lista depende de invariantes: la cabeza apunta al primer nodo, cada nodo enlaza al siguiente y el tamaño coincide con la cantidad recorrible.",
    steps: [
      "Actualiza enlaces antes de perder la referencia al resto de la lista.",
      "Ajusta cabeza y cola en los casos de borde.",
      "Actualiza el tamaño una sola vez por operación exitosa.",
    ],
    constraints: [
      "No reemplaces la estructura por un arreglo o colección equivalente.",
      "Las operaciones sobre una lista vacía deben ser seguras.",
    ],
    successCriteria: [
      "El recorrido devuelve los elementos en el orden esperado.",
      "Cabeza, cola y tamaño permanecen coherentes tras varias operaciones.",
    ],
    pseudocodeHint:
      "Para insertar: crear nodo, enlazarlo y ajustar extremos; para retirar: guardar valor, mover enlace y reducir tamaño.",
  },
  "p2-06-cola-taller": {
    goal:
      "Implementar una cola FIFO con inserción y retiro en tiempo constante.",
    conceptIntro:
      "Una cola atiende primero al elemento que llegó primero. Mantener referencias a ambos extremos evita recorrer la estructura para insertar.",
    steps: [
      "Agrega nuevos elementos por el extremo final.",
      "Retira elementos por el extremo inicial.",
      "Ajusta ambos extremos cuando la cola queda vacía.",
    ],
    constraints: [
      "enqueue y dequeue deben operar en O(1).",
      "No uses operaciones que desplacen todos los elementos de una colección.",
    ],
    successCriteria: [
      "El orden de salida coincide con el orden de llegada.",
      "La cola puede vaciarse y volver a utilizarse correctamente.",
    ],
    pseudocodeHint:
      "ENQUEUE enlaza el nuevo nodo al final; DEQUEUE guarda el inicio, avanza la cabeza y limpia la cola si queda vacía.",
  },
  "p2-07-arbol-decisiones": {
    goal:
      "Insertar y buscar valores en un árbol binario conservando la relación de orden.",
    conceptIntro:
      "En un árbol binario de búsqueda, los valores menores avanzan a la izquierda y los mayores a la derecha. La misma regla guía inserción y consulta.",
    steps: [
      "Resuelve el caso de un árbol o subárbol vacío.",
      "Compara el valor con el nodo actual.",
      "Continúa únicamente por la rama compatible con la comparación.",
    ],
    constraints: [
      "Conserva la invariante de orden después de cada inserción.",
      "Aplica de forma consistente la política definida para duplicados.",
    ],
    successCriteria: [
      "Encuentra valores en distintas profundidades y rechaza ausentes.",
      "Un recorrido ordenado del árbol produce valores no decrecientes.",
    ],
    pseudocodeHint:
      "SI nodo vacío, crear o fallar búsqueda; SI valor menor, ir a izquierda; SI mayor, ir a derecha; SI igual, encontrado.",
  },
  "p2-08-ruta-maker": {
    goal:
      "Calcular la menor cantidad de saltos entre dos nodos de una red no ponderada usando BFS.",
    conceptIntro:
      "BFS explora la red por capas de distancia. La primera vez que alcanza un nodo ya corresponde al camino con menos aristas.",
    steps: [
      "Inicializa una cola con el origen y marca ese nodo como visitado.",
      "Extrae nodos y agrega sus vecinos todavía no visitados.",
      "Retorna la distancia al alcanzar el destino o -1 si no existe ruta.",
    ],
    constraints: [
      "Marca cada nodo al encolarlo para evitar duplicados.",
      "No uses una búsqueda en profundidad para calcular la distancia mínima.",
    ],
    successCriteria: [
      "Retorna cero cuando origen y destino coinciden.",
      "Encuentra la distancia mínima y termina también en redes desconectadas.",
    ],
    pseudocodeHint:
      "cola = [(origen, 0)]; MIENTRAS haya elementos: sacar; PARA CADA vecino nuevo, encolar con distancia + 1.",
  },
  "p2-09-frecuencias-serial": {
    goal:
      "Encontrar el valor más frecuente y, en caso de empate, conservar el que apareció primero.",
    conceptIntro:
      "Un mapa de frecuencias resume cuántas veces aparece cada valor. El desempate exige además recordar el orden original de aparición.",
    steps: [
      "Cuenta cada valor en un mapa.",
      "Recorre la entrada en su orden original.",
      "Actualiza el mejor solo cuando la frecuencia sea estrictamente mayor.",
    ],
    constraints: [
      "No ordenes la entrada, porque perderías el criterio de desempate.",
      "Aplica el contrato definido para la colección vacía.",
    ],
    successCriteria: [
      "Retorna el valor con mayor frecuencia.",
      "En un empate retorna exactamente el primero que apareció.",
    ],
    pseudocodeHint:
      "CONTAR valores; mejor = primero; PARA CADA valor en orden, SI frecuencia(valor) > frecuencia(mejor), actualizar.",
  },
  "p2-10-cambio-micro": {
    goal:
      "Calcular la cantidad mínima de monedas para un monto o indicar que el monto es imposible.",
    conceptIntro:
      "Como elegir siempre la moneda mayor puede fallar, debes resolver subproblemas de montos menores y reutilizar sus mejores resultados.",
    steps: [
      "Inicializa el monto cero con costo cero y los demás como imposibles.",
      "Para cada monto, prueba todas las monedas que no lo superen.",
      "Conserva el mínimo resultado alcanzable y devuelve -1 si no existe.",
    ],
    constraints: [
      "No asumas que el conjunto de monedas es canónico.",
      "Ignora transiciones desde estados que todavía son imposibles.",
    ],
    successCriteria: [
      "Encuentra un resultado óptimo incluso cuando la estrategia codiciosa falla.",
      "Distingue correctamente monto cero, monto posible e imposible.",
    ],
    pseudocodeHint:
      "dp[0] = 0; PARA monto parcial: PARA CADA moneda válida, dp[monto] = mínimo(dp[monto], dp[monto-moneda] + 1).",
  },
};

const MISSION_SEQUENCE: Record<Course, string[]> = {
  "programming-1": [
    "p1-01-la-once",
    "p1-02-var-limache",
    "p1-03-semaforo-led",
    "p1-04-conversor-hallulla",
    "p1-05-esp-con-fiebre",
    "p1-06-clave-del-profe",
    "p1-07-inventario-maker",
    "p1-08-loop-viernes",
    "p1-09-paltas-qa",
    "p1-10-marcador-naranja",
  ],
  "programming-2": [
    "p2-01-factorial-recursivo",
    "p2-02-duplicados-lineales",
    "p2-03-busqueda-bodega",
    "p2-04-merge-sensores",
    "p2-05-lista-jumpers",
    "p2-06-cola-taller",
    "p2-07-arbol-decisiones",
    "p2-08-ruta-maker",
    "p2-09-frecuencias-serial",
    "p2-10-cambio-micro",
  ],
};

function defaultPrerequisites(input: MissionInput): string[] {
  const sequence = MISSION_SEQUENCE[input.course];
  const index = sequence.indexOf(input.id);
  return index > 0 ? [sequence[index - 1]] : [];
}

export function mission(input: MissionInput): Mission {
  const guidedContent = GUIDED_CONTENT[input.id];
  const {
    pseudocodeHint,
    goal,
    conceptIntro,
    steps,
    constraints,
    successCriteria,
    prerequisites,
    ...missionInput
  } = input;
  const hints =
    input.hints.length >= 3
      ? input.hints
      : [
          ...input.hints,
          pseudocodeHint ??
            guidedContent?.pseudocodeHint ??
            "Escribe primero el proceso como pseudocódigo: prepara el resultado, procesa la entrada y devuelve el valor final.",
        ];
  return {
    ...missionInput,
    goal: goal ?? guidedContent?.goal ?? input.summary,
    conceptIntro:
      conceptIntro ??
      guidedContent?.conceptIntro ??
      `Esta misión practica ${input.tags.join(", ")}. Sigue el contrato de la función y comprueba cada transformación con el ejemplo antes de ejecutar.`,
    steps: steps ?? guidedContent?.steps ?? input.objectives,
    constraints:
      constraints ?? guidedContent?.constraints ?? [
        "No cambies el nombre ni la firma de la función.",
        "Devuelve el resultado solicitado; no reemplaces el retorno por texto impreso.",
        "Conserva el tipo de salida y contempla los casos límite descritos.",
      ],
    successCriteria:
      successCriteria ?? guidedContent?.successCriteria ?? input.objectives,
    prerequisites: prerequisites ?? defaultPrerequisites(input),
    hints,
    courseLabel:
      input.course === "programming-1" ? "Programación I" : "Programación II",
    version: 3,
  };
}
