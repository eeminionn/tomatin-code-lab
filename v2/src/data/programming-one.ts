import { cpp, mission, test, variant } from "./mission-builders";

export const programmingOneMissions = [
  mission({
    id: "p1-01-la-once",
    slug: "la-once-de-tomatin",
    course: "programming-1",
    module: "Variables y operaciones",
    order: 1,
    title: "La once de Tomatin",
    summary: "Calcula un total sin mezclar texto y números.",
    context: "Hay que cerrar la compra del taller antes de que llegue el pedido.",
    brief:
      "Implementa totalOnce. Recibe precios y cantidades en posiciones equivalentes y retorna la suma de precio por cantidad.",
    difficulty: "Inicial",
    points: 100,
    duration: 12,
    tags: ["variables", "arreglos", "acumuladores"],
    objectives: [
      "Recorrer dos colecciones relacionadas.",
      "Mantener un acumulador numérico.",
      "Resolver correctamente el caso vacío.",
    ],
    hints: [
      "El elemento en la posición i de precios corresponde a la posición i de cantidades.",
      "Parte el acumulador en cero y actualízalo una vez por producto.",
    ],
    variants: {
      javascript: variant(
        "javascript",
        `function totalOnce(precios, cantidades) {
  // Retorna el total numérico.
}
`,
        `function totalOnce(precios, cantidades) {
  return precios.reduce((total, precio, i) => total + precio * cantidades[i], 0);
}
`,
        [
          test(
            "once-total",
            "Suma dos productos",
            "totalOnce([1200, 850], [2, 3]) === 4950",
            "4950",
            "Multiplica cada precio por su cantidad antes de sumar.",
            "totalOnce([1200, 850], [2, 3])",
          ),
          test(
            "once-empty",
            "Acepta una compra vacía",
            "totalOnce([], []) === 0",
            "0",
            "El acumulador debe comenzar en cero.",
            "totalOnce([], [])",
          ),
        ],
        [
          test(
            "once-single",
            "Caso de un producto",
            "totalOnce([999], [4]) === 3996",
            "3996",
            "Revisa el producto único.",
          ),
        ],
      ),
      python: variant(
        "python",
        `def total_once(precios, cantidades):
    # Retorna el total numérico.
    pass
`,
        `def total_once(precios, cantidades):
    return sum(precio * cantidades[i] for i, precio in enumerate(precios))
`,
        [
          test(
            "once-total",
            "Suma dos productos",
            "total_once([1200, 850], [2, 3]) == 4950",
            "4950",
            "Multiplica cada precio por su cantidad antes de sumar.",
            "total_once([1200, 850], [2, 3])",
          ),
          test(
            "once-empty",
            "Acepta una compra vacía",
            "total_once([], []) == 0",
            "0",
            "La suma de una colección vacía debe ser cero.",
            "total_once([], [])",
          ),
        ],
        [
          test(
            "once-single",
            "Caso de un producto",
            "total_once([999], [4]) == 3996",
            "3996",
            "Revisa el producto único.",
          ),
        ],
      ),
      cpp: variant(
        "cpp",
        cpp(`double totalOnce(const vector<double>& precios, const vector<int>& cantidades) {
  // Retorna el total numérico.
  return 0;
}`),
        cpp(`double totalOnce(const vector<double>& precios, const vector<int>& cantidades) {
  double total = 0;
  for (size_t i = 0; i < precios.size(); ++i) {
    total += precios[i] * cantidades[i];
  }
  return total;
}`),
        [
          test(
            "once-total",
            "Suma dos productos",
            "abs(totalOnce({1200, 850}, {2, 3}) - 4950) < 0.001",
            "4950",
            "Multiplica cada precio por su cantidad antes de sumar.",
          ),
          test(
            "once-empty",
            "Acepta una compra vacía",
            "abs(totalOnce({}, {})) < 0.001",
            "0",
            "Inicializa el acumulador en cero.",
          ),
        ],
        [
          test(
            "once-single",
            "Caso de un producto",
            "abs(totalOnce({999}, {4}) - 3996) < 0.001",
            "3996",
            "Revisa el producto único.",
          ),
        ],
      ),
    },
  }),
  mission({
    id: "p1-02-var-limache",
    slug: "var-de-limache",
    course: "programming-1",
    module: "Condicionales",
    order: 2,
    title: "El VAR de Limache",
    summary: "Combina condiciones booleanas sin casos ambiguos.",
    context: "El marcador necesita una decisión consistente para cada jugada.",
    brief:
      "Implementa revisarGol. Debe retornar GOL solo cuando no exista fuera de juego ni falta; en cualquier otro caso retorna ANULADO.",
    difficulty: "Inicial",
    points: 100,
    duration: 10,
    tags: ["booleanos", "condicionales"],
    objectives: [
      "Combinar dos condiciones booleanas.",
      "Expresar una regla con una salida clara.",
    ],
    hints: [
      "Para validar el gol, ambas infracciones deben ser falsas.",
      "Puedes resolverlo con una sola condición compuesta.",
    ],
    variants: {
      javascript: variant(
        "javascript",
        `function revisarGol(fueraDeJuego, falta) {
  // Retorna "GOL" o "ANULADO".
}
`,
        `function revisarGol(fueraDeJuego, falta) {
  return !fueraDeJuego && !falta ? "GOL" : "ANULADO";
}
`,
        [
          test("gol-valid", "Gol válido", 'revisarGol(false, false) === "GOL"', "GOL", "Ambas infracciones deben ser falsas.", "revisarGol(false, false)"),
          test("gol-offside", "Detecta fuera de juego", 'revisarGol(true, false) === "ANULADO"', "ANULADO", "El fuera de juego anula la jugada.", "revisarGol(true, false)"),
        ],
        [
          test("gol-foul", "Detecta falta", 'revisarGol(false, true) === "ANULADO"', "ANULADO", "La falta también anula la jugada."),
          test("gol-both", "Detecta ambas infracciones", 'revisarGol(true, true) === "ANULADO"', "ANULADO", "No debe validarse con infracciones."),
        ],
      ),
      python: variant(
        "python",
        `def revisar_gol(fuera_de_juego, falta):
    # Retorna "GOL" o "ANULADO".
    pass
`,
        `def revisar_gol(fuera_de_juego, falta):
    return "GOL" if not fuera_de_juego and not falta else "ANULADO"
`,
        [
          test("gol-valid", "Gol válido", 'revisar_gol(False, False) == "GOL"', "GOL", "Ambas infracciones deben ser falsas.", "revisar_gol(False, False)"),
          test("gol-offside", "Detecta fuera de juego", 'revisar_gol(True, False) == "ANULADO"', "ANULADO", "El fuera de juego anula la jugada.", "revisar_gol(True, False)"),
        ],
        [
          test("gol-foul", "Detecta falta", 'revisar_gol(False, True) == "ANULADO"', "ANULADO", "La falta también anula la jugada."),
          test("gol-both", "Detecta ambas infracciones", 'revisar_gol(True, True) == "ANULADO"', "ANULADO", "No debe validarse con infracciones."),
        ],
      ),
      cpp: variant(
        "cpp",
        cpp(`string revisarGol(bool fueraDeJuego, bool falta) {
  // Retorna "GOL" o "ANULADO".
  return "";
}`),
        cpp(`string revisarGol(bool fueraDeJuego, bool falta) {
  return !fueraDeJuego && !falta ? "GOL" : "ANULADO";
}`),
        [
          test("gol-valid", "Gol válido", 'revisarGol(false, false) == "GOL"', "GOL", "Ambas infracciones deben ser falsas."),
          test("gol-offside", "Detecta fuera de juego", 'revisarGol(true, false) == "ANULADO"', "ANULADO", "El fuera de juego anula la jugada."),
        ],
        [
          test("gol-foul", "Detecta falta", 'revisarGol(false, true) == "ANULADO"', "ANULADO", "La falta también anula la jugada."),
          test("gol-both", "Detecta ambas infracciones", 'revisarGol(true, true) == "ANULADO"', "ANULADO", "No debe validarse con infracciones."),
        ],
      ),
    },
  }),
  mission({
    id: "p1-03-semaforo-led",
    slug: "semaforo-de-protoboard",
    course: "programming-1",
    module: "Bucles",
    order: 3,
    title: "Semáforo de protoboard",
    summary: "Recorre una colección sin salir de sus límites.",
    context: "Una secuencia de pines debe quedar lista para probar LEDs en el taller.",
    brief:
      "Implementa secuenciaPines. Recibe números de pin y retorna un mensaje PIN n: ON por cada elemento, respetando el orden.",
    difficulty: "Inicial",
    points: 110,
    duration: 14,
    tags: ["bucles", "arreglos", "índices"],
    objectives: [
      "Recorrer todos los elementos de una colección.",
      "Evitar accesos fuera de rango.",
      "Construir una salida por cada pin.",
    ],
    hints: [
      "La condición del bucle debe detenerse antes del largo.",
      "Agrega una cadena al resultado en cada iteración.",
    ],
    variants: {
      javascript: variant(
        "javascript",
        `function secuenciaPines(pines) {
  // Retorna un arreglo de mensajes.
}
`,
        `function secuenciaPines(pines) {
  const salida = [];
  for (const pin of pines) salida.push(\`PIN \${pin}: ON\`);
  return salida;
}
`,
        [
          test("pins-three", "Procesa tres pines", 'JSON.stringify(secuenciaPines([2, 4, 7])) === JSON.stringify(["PIN 2: ON", "PIN 4: ON", "PIN 7: ON"])', '["PIN 2: ON","PIN 4: ON","PIN 7: ON"]', "Recorre exactamente los pines recibidos.", "secuenciaPines([2, 4, 7])"),
          test("pins-empty", "Acepta una lista vacía", "secuenciaPines([]).length === 0", "[]", "No agregues elementos si no hay pines.", "secuenciaPines([])"),
        ],
        [test("pins-one", "Procesa un pin", 'secuenciaPines([13])[0] === "PIN 13: ON"', "PIN 13: ON", "Conserva el valor del pin.")],
      ),
      python: variant(
        "python",
        `def secuencia_pines(pines):
    # Retorna una lista de mensajes.
    pass
`,
        `def secuencia_pines(pines):
    return [f"PIN {pin}: ON" for pin in pines]
`,
        [
          test("pins-three", "Procesa tres pines", 'secuencia_pines([2, 4, 7]) == ["PIN 2: ON", "PIN 4: ON", "PIN 7: ON"]', '["PIN 2: ON","PIN 4: ON","PIN 7: ON"]', "Recorre exactamente los pines recibidos.", "secuencia_pines([2, 4, 7])"),
          test("pins-empty", "Acepta una lista vacía", "secuencia_pines([]) == []", "[]", "No agregues elementos si no hay pines.", "secuencia_pines([])"),
        ],
        [test("pins-one", "Procesa un pin", 'secuencia_pines([13]) == ["PIN 13: ON"]', "PIN 13: ON", "Conserva el valor del pin.")],
      ),
      cpp: variant(
        "cpp",
        cpp(`vector<string> secuenciaPines(const vector<int>& pines) {
  // Retorna un mensaje por cada pin.
  return {};
}`),
        cpp(`vector<string> secuenciaPines(const vector<int>& pines) {
  vector<string> salida;
  for (int pin : pines) salida.push_back("PIN " + to_string(pin) + ": ON");
  return salida;
}`),
        [
          test("pins-three", "Procesa tres pines", 'secuenciaPines({2, 4, 7}) == vector<string>({"PIN 2: ON", "PIN 4: ON", "PIN 7: ON"})', '["PIN 2: ON","PIN 4: ON","PIN 7: ON"]', "Recorre exactamente los pines recibidos."),
          test("pins-empty", "Acepta una lista vacía", "secuenciaPines({}).empty()", "[]", "No agregues elementos si no hay pines."),
        ],
        [test("pins-one", "Procesa un pin", 'secuenciaPines({13}) == vector<string>({"PIN 13: ON"})', "PIN 13: ON", "Conserva el valor del pin.")],
      ),
    },
  }),
  mission({
    id: "p1-04-conversor-hallulla",
    slug: "conversor-de-hallullas",
    course: "programming-1",
    module: "Funciones y redondeo",
    order: 4,
    title: "Conversor de hallullas",
    summary: "Convierte una cantidad y redondea hacia arriba.",
    context: "La receta está en gramos y el inventario usa bolsas de medio kilo.",
    brief:
      "Implementa bolsasNecesarias. Recibe gramos y retorna cuántas bolsas de 500 gramos se necesitan. Para cero o negativos retorna cero.",
    difficulty: "Inicial",
    points: 110,
    duration: 12,
    tags: ["funciones", "redondeo", "validación"],
    objectives: ["Aplicar división y redondeo superior.", "Definir un caso límite explícito."],
    hints: ["Divide los gramos por 500.", "La cantidad de bolsas no puede ser fraccionaria."],
    variants: {
      javascript: variant(
        "javascript",
        `function bolsasNecesarias(gramos) {
  // Cada bolsa contiene 500 gramos.
}
`,
        `function bolsasNecesarias(gramos) {
  return gramos <= 0 ? 0 : Math.ceil(gramos / 500);
}
`,
        [
          test("bags-exact", "Cantidad exacta", "bolsasNecesarias(1000) === 2", "2", "Una cantidad exacta no necesita una bolsa adicional.", "bolsasNecesarias(1000)"),
          test("bags-round", "Redondea hacia arriba", "bolsasNecesarias(1001) === 3", "3", "Usa redondeo superior.", "bolsasNecesarias(1001)"),
        ],
        [test("bags-zero", "Valida cero", "bolsasNecesarias(0) === 0 && bolsasNecesarias(-5) === 0", "0", "Los valores no positivos retornan cero.")],
      ),
      python: variant(
        "python",
        `def bolsas_necesarias(gramos):
    # Cada bolsa contiene 500 gramos.
    pass
`,
        `import math

def bolsas_necesarias(gramos):
    return 0 if gramos <= 0 else math.ceil(gramos / 500)
`,
        [
          test("bags-exact", "Cantidad exacta", "bolsas_necesarias(1000) == 2", "2", "Una cantidad exacta no necesita una bolsa adicional.", "bolsas_necesarias(1000)"),
          test("bags-round", "Redondea hacia arriba", "bolsas_necesarias(1001) == 3", "3", "Usa redondeo superior.", "bolsas_necesarias(1001)"),
        ],
        [test("bags-zero", "Valida cero", "bolsas_necesarias(0) == 0 and bolsas_necesarias(-5) == 0", "0", "Los valores no positivos retornan cero.")],
      ),
      cpp: variant(
        "cpp",
        cpp(`int bolsasNecesarias(int gramos) {
  // Cada bolsa contiene 500 gramos.
  return 0;
}`),
        cpp(`int bolsasNecesarias(int gramos) {
  return gramos <= 0 ? 0 : (gramos + 499) / 500;
}`),
        [
          test("bags-exact", "Cantidad exacta", "bolsasNecesarias(1000) == 2", "2", "Una cantidad exacta no necesita una bolsa adicional."),
          test("bags-round", "Redondea hacia arriba", "bolsasNecesarias(1001) == 3", "3", "Ajusta la división entera para redondear hacia arriba."),
        ],
        [test("bags-zero", "Valida cero", "bolsasNecesarias(0) == 0 && bolsasNecesarias(-5) == 0", "0", "Los valores no positivos retornan cero.")],
      ),
    },
  }),
  mission({
    id: "p1-05-esp-con-fiebre",
    slug: "lecturas-del-esp",
    course: "programming-1",
    module: "Arreglos y promedio",
    order: 5,
    title: "Lecturas del ESP",
    summary: "Detecta lecturas alejadas del promedio.",
    context: "Un ESP registró temperaturas y necesitamos separar los valores anómalos.",
    brief:
      "Implementa detectarAnomalias. Retorna las lecturas cuya distancia al promedio sea mayor que 8 grados. Para una lista vacía retorna una lista vacía.",
    difficulty: "Intermedia",
    points: 130,
    duration: 18,
    tags: ["arreglos", "promedio", "filtros"],
    objectives: ["Calcular un promedio.", "Filtrar datos con una regla numérica."],
    hints: ["Primero calcula el promedio de todas las lecturas.", "Usa el valor absoluto de la diferencia."],
    variants: {
      javascript: variant(
        "javascript",
        `function detectarAnomalias(lecturas) {
  // Retorna solo las lecturas anómalas.
}
`,
        `function detectarAnomalias(lecturas) {
  if (lecturas.length === 0) return [];
  const promedio = lecturas.reduce((a, b) => a + b, 0) / lecturas.length;
  return lecturas.filter((valor) => Math.abs(valor - promedio) > 8);
}
`,
        [
          test("temp-outlier", "Detecta una lectura extrema", "JSON.stringify(detectarAnomalias([20, 21, 22, 45])) === JSON.stringify([45])", "[45]", "Calcula el promedio antes de filtrar.", "detectarAnomalias([20, 21, 22, 45])"),
          test("temp-empty", "Acepta una lista vacía", "detectarAnomalias([]).length === 0", "[]", "Resuelve el caso vacío antes de dividir.", "detectarAnomalias([])"),
        ],
        [test("temp-stable", "Conserva datos estables", "detectarAnomalias([10, 11, 12]).length === 0", "[]", "No marques lecturas cercanas al promedio.")],
      ),
      python: variant(
        "python",
        `def detectar_anomalias(lecturas):
    # Retorna solo las lecturas anómalas.
    pass
`,
        `def detectar_anomalias(lecturas):
    if not lecturas:
        return []
    promedio = sum(lecturas) / len(lecturas)
    return [valor for valor in lecturas if abs(valor - promedio) > 8]
`,
        [
          test("temp-outlier", "Detecta una lectura extrema", "detectar_anomalias([20, 21, 22, 45]) == [45]", "[45]", "Calcula el promedio antes de filtrar.", "detectar_anomalias([20, 21, 22, 45])"),
          test("temp-empty", "Acepta una lista vacía", "detectar_anomalias([]) == []", "[]", "Resuelve el caso vacío antes de dividir.", "detectar_anomalias([])"),
        ],
        [test("temp-stable", "Conserva datos estables", "detectar_anomalias([10, 11, 12]) == []", "[]", "No marques lecturas cercanas al promedio.")],
      ),
      cpp: variant(
        "cpp",
        cpp(`vector<double> detectarAnomalias(const vector<double>& lecturas) {
  // Retorna solo las lecturas anómalas.
  return {};
}`),
        cpp(`vector<double> detectarAnomalias(const vector<double>& lecturas) {
  if (lecturas.empty()) return {};
  double promedio = accumulate(lecturas.begin(), lecturas.end(), 0.0) / lecturas.size();
  vector<double> salida;
  for (double valor : lecturas) {
    if (abs(valor - promedio) > 8) salida.push_back(valor);
  }
  return salida;
}`),
        [
          test("temp-outlier", "Detecta una lectura extrema", "detectarAnomalias({20, 21, 22, 45}) == vector<double>({45})", "[45]", "Calcula el promedio antes de filtrar."),
          test("temp-empty", "Acepta una lista vacía", "detectarAnomalias({}).empty()", "[]", "Resuelve el caso vacío antes de dividir."),
        ],
        [test("temp-stable", "Conserva datos estables", "detectarAnomalias({10, 11, 12}).empty()", "[]", "No marques lecturas cercanas al promedio.")],
      ),
    },
  }),
  mission({
    id: "p1-06-clave-del-profe",
    slug: "clave-del-taller",
    course: "programming-1",
    module: "Cadenas",
    order: 6,
    title: "Clave del taller",
    summary: "Normaliza y valida una cadena de entrada.",
    context: "El acceso del laboratorio recibe claves escritas con espacios y mayúsculas variables.",
    brief:
      "Implementa claveValida. Elimina espacios externos, convierte a minúsculas y valida el formato letras-guion-dos dígitos.",
    difficulty: "Intermedia",
    points: 130,
    duration: 18,
    tags: ["cadenas", "normalización", "expresiones regulares"],
    objectives: ["Normalizar una entrada.", "Validar una estructura completa."],
    hints: [
      "Normaliza antes de validar.",
      "La expresión debe cubrir la cadena completa y terminar con exactamente dos dígitos.",
    ],
    variants: {
      javascript: variant(
        "javascript",
        `function claveValida(entrada) {
  // Retorna true si cumple letras-guion-dos dígitos.
}
`,
        `function claveValida(entrada) {
  return /^[a-z]+-\\d{2}$/.test(entrada.trim().toLowerCase());
}
`,
        [
          test("key-normalize", "Normaliza espacios y mayúsculas", 'claveValida("  ToMaTiN-42 ") === true', "true", "Aplica trim y minúsculas antes de validar.", 'claveValida("  ToMaTiN-42 ")'),
          test("key-shape", "Rechaza un formato incompleto", 'claveValida("tomatin-4") === false', "false", "Deben existir exactamente dos dígitos al final.", 'claveValida("tomatin-4")'),
        ],
        [test("key-extra", "Rechaza caracteres extra", 'claveValida("tomatin_42") === false && claveValida("42-tomatin") === false', "false", "Valida la estructura completa.")],
      ),
      python: variant(
        "python",
        `def clave_valida(entrada):
    # Retorna True si cumple letras-guion-dos dígitos.
    pass
`,
        `import re

def clave_valida(entrada):
    return re.fullmatch(r"[a-z]+-\\d{2}", entrada.strip().lower()) is not None
`,
        [
          test("key-normalize", "Normaliza espacios y mayúsculas", 'clave_valida("  ToMaTiN-42 ") is True', "True", "Aplica strip y minúsculas antes de validar.", 'clave_valida("  ToMaTiN-42 ")'),
          test("key-shape", "Rechaza un formato incompleto", 'clave_valida("tomatin-4") is False', "False", "Deben existir exactamente dos dígitos al final.", 'clave_valida("tomatin-4")'),
        ],
        [test("key-extra", "Rechaza caracteres extra", 'not clave_valida("tomatin_42") and not clave_valida("42-tomatin")', "False", "Valida la estructura completa.")],
      ),
      cpp: variant(
        "cpp",
        cpp(`bool claveValida(string entrada) {
  // Retorna true si cumple letras-guion-dos dígitos.
  return false;
}`),
        cpp(`bool claveValida(string entrada) {
  auto inicio = entrada.find_first_not_of(" \\t\\n\\r");
  if (inicio == string::npos) return false;
  auto fin = entrada.find_last_not_of(" \\t\\n\\r");
  entrada = entrada.substr(inicio, fin - inicio + 1);
  transform(entrada.begin(), entrada.end(), entrada.begin(),
            [](unsigned char c) { return tolower(c); });
  return regex_match(entrada, regex("[a-z]+-[0-9]{2}"));
}`),
        [
          test("key-normalize", "Normaliza espacios y mayúsculas", 'claveValida("  ToMaTiN-42 ")', "true", "Recorta y transforma antes de validar."),
          test("key-shape", "Rechaza un formato incompleto", '!claveValida("tomatin-4")', "false", "Deben existir exactamente dos dígitos al final."),
        ],
        [test("key-extra", "Rechaza caracteres extra", '!claveValida("tomatin_42") && !claveValida("42-tomatin")', "false", "Valida la estructura completa.")],
      ),
    },
  }),
  mission({
    id: "p1-07-inventario-maker",
    slug: "inventario-maker",
    course: "programming-1",
    module: "Funciones y estado",
    order: 7,
    title: "Inventario maker",
    summary: "Actualiza stock sin permitir cantidades inválidas.",
    context: "El taller necesita registrar retiros sin terminar con stock negativo.",
    brief:
      "Implementa stockSeguro y necesitaReposicion. stockSeguro retorna el nuevo stock o -1 si el retiro es negativo o supera lo disponible.",
    difficulty: "Intermedia",
    points: 140,
    duration: 20,
    tags: ["funciones", "validación", "estado"],
    objectives: ["Validar una transición de estado.", "Separar dos responsabilidades en funciones."],
    hints: [
      "Valida el retiro antes de restarlo.",
      "La reposición se necesita cuando el stock queda por debajo del mínimo.",
    ],
    variants: {
      javascript: variant(
        "javascript",
        `function stockSeguro(stock, retiro) {
  // Retorna el nuevo stock o -1.
}

function necesitaReposicion(stock, minimo) {
  // Retorna true o false.
}
`,
        `function stockSeguro(stock, retiro) {
  return retiro < 0 || retiro > stock ? -1 : stock - retiro;
}

function necesitaReposicion(stock, minimo) {
  return stock < minimo;
}
`,
        [
          test("stock-update", "Descuenta un retiro válido", "stockSeguro(12, 5) === 7", "7", "Resta solo después de validar.", "stockSeguro(12, 5)"),
          test("stock-invalid", "Impide stock negativo", "stockSeguro(4, 8) === -1", "-1", "Un retiro mayor al stock debe rechazarse.", "stockSeguro(4, 8)"),
        ],
        [test("stock-minimum", "Detecta reposición", "necesitaReposicion(3, 5) && !necesitaReposicion(5, 5)", "true", "Compara con el mínimo sin incluir la igualdad.")],
      ),
      python: variant(
        "python",
        `def stock_seguro(stock, retiro):
    # Retorna el nuevo stock o -1.
    pass

def necesita_reposicion(stock, minimo):
    # Retorna True o False.
    pass
`,
        `def stock_seguro(stock, retiro):
    return -1 if retiro < 0 or retiro > stock else stock - retiro

def necesita_reposicion(stock, minimo):
    return stock < minimo
`,
        [
          test("stock-update", "Descuenta un retiro válido", "stock_seguro(12, 5) == 7", "7", "Resta solo después de validar.", "stock_seguro(12, 5)"),
          test("stock-invalid", "Impide stock negativo", "stock_seguro(4, 8) == -1", "-1", "Un retiro mayor al stock debe rechazarse.", "stock_seguro(4, 8)"),
        ],
        [test("stock-minimum", "Detecta reposición", "necesita_reposicion(3, 5) and not necesita_reposicion(5, 5)", "True", "Compara con el mínimo sin incluir la igualdad.")],
      ),
      cpp: variant(
        "cpp",
        cpp(`int stockSeguro(int stock, int retiro) {
  // Retorna el nuevo stock o -1.
  return -1;
}

bool necesitaReposicion(int stock, int minimo) {
  // Retorna true o false.
  return false;
}`),
        cpp(`int stockSeguro(int stock, int retiro) {
  return retiro < 0 || retiro > stock ? -1 : stock - retiro;
}

bool necesitaReposicion(int stock, int minimo) {
  return stock < minimo;
}`),
        [
          test("stock-update", "Descuenta un retiro válido", "stockSeguro(12, 5) == 7", "7", "Resta solo después de validar."),
          test("stock-invalid", "Impide stock negativo", "stockSeguro(4, 8) == -1", "-1", "Un retiro mayor al stock debe rechazarse."),
        ],
        [test("stock-minimum", "Detecta reposición", "necesitaReposicion(3, 5) && !necesitaReposicion(5, 5)", "true", "Compara con el mínimo sin incluir la igualdad.")],
      ),
    },
  }),
  mission({
    id: "p1-08-loop-viernes",
    slug: "bucle-con-limite",
    course: "programming-1",
    module: "Control de flujo",
    order: 8,
    title: "Bucle con límite",
    summary: "Construye una iteración con una guarda explícita.",
    context: "Un contador del taller debe detenerse incluso si recibe una entrada inesperada.",
    brief:
      "Implementa contarHasta. Retorna los enteros desde 1 hasta límite. Para valores menores que 1 o mayores que 100 retorna una colección vacía.",
    difficulty: "Intermedia",
    points: 130,
    duration: 16,
    tags: ["bucles", "guardas", "límites"],
    objectives: ["Definir una condición de término.", "Proteger una iteración con límites de entrada."],
    hints: ["Valida el límite antes de iniciar el bucle.", "La última posición debe contener exactamente el límite."],
    variants: {
      javascript: variant(
        "javascript",
        `function contarHasta(limite) {
  // Retorna [1, 2, ..., limite] o [].
}
`,
        `function contarHasta(limite) {
  if (limite < 1 || limite > 100) return [];
  const salida = [];
  for (let i = 1; i <= limite; i += 1) salida.push(i);
  return salida;
}
`,
        [
          test("loop-five", "Cuenta hasta cinco", "JSON.stringify(contarHasta(5)) === JSON.stringify([1, 2, 3, 4, 5])", "[1,2,3,4,5]", "Revisa inicio, condición y avance.", "contarHasta(5)"),
          test("loop-cap", "Aplica la guarda superior", "contarHasta(101).length === 0", "[]", "Valida el máximo antes del bucle.", "contarHasta(101)"),
        ],
        [test("loop-low", "Aplica la guarda inferior", "contarHasta(0).length === 0 && contarHasta(-2).length === 0", "[]", "Los valores menores que uno no generan elementos.")],
      ),
      python: variant(
        "python",
        `def contar_hasta(limite):
    # Retorna [1, 2, ..., limite] o [].
    pass
`,
        `def contar_hasta(limite):
    if limite < 1 or limite > 100:
        return []
    return list(range(1, limite + 1))
`,
        [
          test("loop-five", "Cuenta hasta cinco", "contar_hasta(5) == [1, 2, 3, 4, 5]", "[1,2,3,4,5]", "Revisa inicio, condición y avance.", "contar_hasta(5)"),
          test("loop-cap", "Aplica la guarda superior", "contar_hasta(101) == []", "[]", "Valida el máximo antes del bucle.", "contar_hasta(101)"),
        ],
        [test("loop-low", "Aplica la guarda inferior", "contar_hasta(0) == [] and contar_hasta(-2) == []", "[]", "Los valores menores que uno no generan elementos.")],
      ),
      cpp: variant(
        "cpp",
        cpp(`vector<int> contarHasta(int limite) {
  // Retorna {1, 2, ..., limite} o {}.
  return {};
}`),
        cpp(`vector<int> contarHasta(int limite) {
  if (limite < 1 || limite > 100) return {};
  vector<int> salida;
  for (int i = 1; i <= limite; ++i) salida.push_back(i);
  return salida;
}`),
        [
          test("loop-five", "Cuenta hasta cinco", "contarHasta(5) == vector<int>({1, 2, 3, 4, 5})", "[1,2,3,4,5]", "Revisa inicio, condición y avance."),
          test("loop-cap", "Aplica la guarda superior", "contarHasta(101).empty()", "[]", "Valida el máximo antes del bucle."),
        ],
        [test("loop-low", "Aplica la guarda inferior", "contarHasta(0).empty() && contarHasta(-2).empty()", "[]", "Los valores menores que uno no generan elementos.")],
      ),
    },
  }),
  mission({
    id: "p1-09-paltas-qa",
    slug: "clasificador-de-paltas",
    course: "programming-1",
    module: "Casos límite",
    order: 9,
    title: "Clasificador de paltas",
    summary: "Convierte una regla en una función comprobable.",
    context: "El clasificador usa peso y madurez para separar piezas aptas.",
    brief:
      "Implementa esApta. Retorna verdadero si el peso está entre 150 y 300 gramos y la madurez entre 3 y 5, incluyendo límites.",
    difficulty: "Intermedia",
    points: 140,
    duration: 18,
    tags: ["pruebas", "límites", "booleanos"],
    objectives: ["Traducir una especificación a condiciones.", "Cubrir límites válidos e inválidos."],
    hints: ["Comprueba ambos rangos.", "Los límites 150, 300, 3 y 5 son válidos."],
    variants: {
      javascript: variant(
        "javascript",
        `function esApta(peso, madurez) {
  // Retorna true o false.
}
`,
        `function esApta(peso, madurez) {
  return peso >= 150 && peso <= 300 && madurez >= 3 && madurez <= 5;
}
`,
        [
          test("avocado-center", "Acepta un caso central", "esApta(220, 4) === true", "true", "Ambos valores deben estar en rango.", "esApta(220, 4)"),
          test("avocado-weight", "Rechaza peso inválido", "esApta(149, 4) === false", "false", "Incluye el límite inferior correcto.", "esApta(149, 4)"),
        ],
        [
          test("avocado-limits", "Acepta los límites", "esApta(150, 3) && esApta(300, 5)", "true", "Los límites son inclusivos."),
          test("avocado-maturity", "Rechaza madurez inválida", "!esApta(200, 2) && !esApta(200, 6)", "false", "Comprueba ambos extremos de madurez."),
        ],
      ),
      python: variant(
        "python",
        `def es_apta(peso, madurez):
    # Retorna True o False.
    pass
`,
        `def es_apta(peso, madurez):
    return 150 <= peso <= 300 and 3 <= madurez <= 5
`,
        [
          test("avocado-center", "Acepta un caso central", "es_apta(220, 4) is True", "True", "Ambos valores deben estar en rango.", "es_apta(220, 4)"),
          test("avocado-weight", "Rechaza peso inválido", "es_apta(149, 4) is False", "False", "Incluye el límite inferior correcto.", "es_apta(149, 4)"),
        ],
        [
          test("avocado-limits", "Acepta los límites", "es_apta(150, 3) and es_apta(300, 5)", "True", "Los límites son inclusivos."),
          test("avocado-maturity", "Rechaza madurez inválida", "not es_apta(200, 2) and not es_apta(200, 6)", "False", "Comprueba ambos extremos de madurez."),
        ],
      ),
      cpp: variant(
        "cpp",
        cpp(`bool esApta(int peso, int madurez) {
  // Retorna true o false.
  return false;
}`),
        cpp(`bool esApta(int peso, int madurez) {
  return peso >= 150 && peso <= 300 && madurez >= 3 && madurez <= 5;
}`),
        [
          test("avocado-center", "Acepta un caso central", "esApta(220, 4)", "true", "Ambos valores deben estar en rango."),
          test("avocado-weight", "Rechaza peso inválido", "!esApta(149, 4)", "false", "Incluye el límite inferior correcto."),
        ],
        [
          test("avocado-limits", "Acepta los límites", "esApta(150, 3) && esApta(300, 5)", "true", "Los límites son inclusivos."),
          test("avocado-maturity", "Rechaza madurez inválida", "!esApta(200, 2) && !esApta(200, 6)", "false", "Comprueba ambos extremos de madurez."),
        ],
      ),
    },
  }),
  mission({
    id: "p1-10-marcador-naranja",
    slug: "marcador-naranja",
    course: "programming-1",
    module: "Modelado simple",
    order: 10,
    title: "Marcador naranja",
    summary: "Valida datos y construye un resumen estable.",
    context: "El operador necesita un formato breve para goles, tarjetas y minuto.",
    brief:
      "Implementa resumenMarcador. Retorna goles|tarjetas|minuto. Si un valor es negativo o el minuto supera 120, retorna ERROR.",
    difficulty: "Intermedia",
    points: 150,
    duration: 20,
    tags: ["validación", "cadenas", "funciones"],
    objectives: ["Validar varias entradas.", "Producir una salida con formato definido."],
    hints: ["Valida antes de construir la cadena.", "El minuto válido está entre 0 y 120, incluidos."],
    variants: {
      javascript: variant(
        "javascript",
        `function resumenMarcador(goles, tarjetas, minuto) {
  // Retorna "goles|tarjetas|minuto" o "ERROR".
}
`,
        `function resumenMarcador(goles, tarjetas, minuto) {
  if (goles < 0 || tarjetas < 0 || minuto < 0 || minuto > 120) return "ERROR";
  return \`\${goles}|\${tarjetas}|\${minuto}\`;
}
`,
        [
          test("score-format", "Construye el resumen", 'resumenMarcador(2, 3, 75) === "2|3|75"', "2|3|75", "Respeta el orden y los separadores.", "resumenMarcador(2, 3, 75)"),
          test("score-minute", "Rechaza minuto fuera de rango", 'resumenMarcador(1, 0, 121) === "ERROR"', "ERROR", "El minuto máximo es 120.", "resumenMarcador(1, 0, 121)"),
        ],
        [test("score-negative", "Rechaza valores negativos", 'resumenMarcador(-1, 0, 10) === "ERROR" && resumenMarcador(0, -1, 10) === "ERROR"', "ERROR", "Goles y tarjetas no pueden ser negativos.")],
      ),
      python: variant(
        "python",
        `def resumen_marcador(goles, tarjetas, minuto):
    # Retorna "goles|tarjetas|minuto" o "ERROR".
    pass
`,
        `def resumen_marcador(goles, tarjetas, minuto):
    if goles < 0 or tarjetas < 0 or minuto < 0 or minuto > 120:
        return "ERROR"
    return f"{goles}|{tarjetas}|{minuto}"
`,
        [
          test("score-format", "Construye el resumen", 'resumen_marcador(2, 3, 75) == "2|3|75"', "2|3|75", "Respeta el orden y los separadores.", "resumen_marcador(2, 3, 75)"),
          test("score-minute", "Rechaza minuto fuera de rango", 'resumen_marcador(1, 0, 121) == "ERROR"', "ERROR", "El minuto máximo es 120.", "resumen_marcador(1, 0, 121)"),
        ],
        [test("score-negative", "Rechaza valores negativos", 'resumen_marcador(-1, 0, 10) == "ERROR" and resumen_marcador(0, -1, 10) == "ERROR"', "ERROR", "Goles y tarjetas no pueden ser negativos.")],
      ),
      cpp: variant(
        "cpp",
        cpp(`string resumenMarcador(int goles, int tarjetas, int minuto) {
  // Retorna "goles|tarjetas|minuto" o "ERROR".
  return "";
}`),
        cpp(`string resumenMarcador(int goles, int tarjetas, int minuto) {
  if (goles < 0 || tarjetas < 0 || minuto < 0 || minuto > 120) return "ERROR";
  return to_string(goles) + "|" + to_string(tarjetas) + "|" + to_string(minuto);
}`),
        [
          test("score-format", "Construye el resumen", 'resumenMarcador(2, 3, 75) == "2|3|75"', "2|3|75", "Respeta el orden y los separadores."),
          test("score-minute", "Rechaza minuto fuera de rango", 'resumenMarcador(1, 0, 121) == "ERROR"', "ERROR", "El minuto máximo es 120."),
        ],
        [test("score-negative", "Rechaza valores negativos", 'resumenMarcador(-1, 0, 10) == "ERROR" && resumenMarcador(0, -1, 10) == "ERROR"', "ERROR", "Goles y tarjetas no pueden ser negativos.")],
      ),
    },
  }),
];
