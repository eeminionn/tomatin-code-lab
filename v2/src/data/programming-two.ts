import { cpp, mission, test, variant } from "./mission-builders";

export const programmingTwoMissions = [
  mission({
    id: "p2-01-factorial-recursivo",
    slug: "factorial-recursivo",
    course: "programming-2",
    module: "Recursión",
    order: 1,
    title: "Factorial recursivo",
    summary: "Define un caso base y reduce el problema.",
    context: "La función debe terminar de forma predecible para cualquier entrada válida.",
    brief:
      "Implementa factorial de forma recursiva. Para cero retorna 1 y para números negativos retorna -1.",
    difficulty: "Intermedia",
    points: 160,
    duration: 18,
    tags: ["recursión", "caso base"],
    objectives: ["Definir un caso base.", "Reducir una entrada recursivamente."],
    hints: ["Cero es un caso base.", "Cada llamada válida reduce n en uno."],
    variants: {
      javascript: variant(
        "javascript",
        `function factorial(n) {
  // Usa recursión. Retorna -1 para negativos.
}
`,
        `function factorial(n) {
  if (n < 0) return -1;
  if (n === 0) return 1;
  return n * factorial(n - 1);
}
`,
        [
          test("fact-five", "Calcula factorial de cinco", "factorial(5) === 120", "120", "Multiplica n por el factorial del valor anterior.", "factorial(5)"),
          test("fact-zero", "Resuelve el caso base", "factorial(0) === 1", "1", "El factorial de cero es uno.", "factorial(0)"),
        ],
        [
          test("fact-negative", "Rechaza negativos", "factorial(-3) === -1", "-1", "Valida negativos antes de la recursión."),
          test("fact-eight", "Resuelve una entrada mayor", "factorial(8) === 40320", "40320", "Comprueba la reducción recursiva."),
        ],
      ),
      python: variant(
        "python",
        `def factorial(n):
    # Usa recursión. Retorna -1 para negativos.
    pass
`,
        `def factorial(n):
    if n < 0:
        return -1
    if n == 0:
        return 1
    return n * factorial(n - 1)
`,
        [
          test("fact-five", "Calcula factorial de cinco", "factorial(5) == 120", "120", "Multiplica n por el factorial del valor anterior.", "factorial(5)"),
          test("fact-zero", "Resuelve el caso base", "factorial(0) == 1", "1", "El factorial de cero es uno.", "factorial(0)"),
        ],
        [
          test("fact-negative", "Rechaza negativos", "factorial(-3) == -1", "-1", "Valida negativos antes de la recursión."),
          test("fact-eight", "Resuelve una entrada mayor", "factorial(8) == 40320", "40320", "Comprueba la reducción recursiva."),
        ],
      ),
      cpp: variant(
        "cpp",
        cpp(`long long factorial(int n) {
  // Usa recursión. Retorna -1 para negativos.
  return 0;
}`),
        cpp(`long long factorial(int n) {
  if (n < 0) return -1;
  if (n == 0) return 1;
  return n * factorial(n - 1);
}`),
        [
          test("fact-five", "Calcula factorial de cinco", "factorial(5) == 120", "120", "Multiplica n por el factorial del valor anterior."),
          test("fact-zero", "Resuelve el caso base", "factorial(0) == 1", "1", "El factorial de cero es uno."),
        ],
        [
          test("fact-negative", "Rechaza negativos", "factorial(-3) == -1", "-1", "Valida negativos antes de la recursión."),
          test("fact-eight", "Resuelve una entrada mayor", "factorial(8) == 40320", "40320", "Comprueba la reducción recursiva."),
        ],
      ),
    },
  }),
  mission({
    id: "p2-02-duplicados-lineales",
    slug: "duplicados-lineales",
    course: "programming-2",
    module: "Complejidad y conjuntos",
    order: 2,
    title: "Duplicados en una pasada",
    summary: "Detecta valores repetidos en tiempo lineal esperado.",
    context: "Una lista de credenciales puede crecer a miles de entradas.",
    brief:
      "Implementa tieneDuplicados usando un conjunto. Retorna verdadero al encontrar la primera repetición.",
    difficulty: "Intermedia",
    points: 170,
    duration: 18,
    tags: ["complejidad", "sets", "hashing"],
    objectives: ["Usar una estructura de pertenencia.", "Evitar comparaciones cuadráticas."],
    hints: ["Guarda cada elemento que ya viste.", "Si un elemento ya está en el conjunto, puedes terminar."],
    variants: {
      javascript: variant(
        "javascript",
        `function tieneDuplicados(valores) {
  // Usa un Set y evita bucles anidados.
}
`,
        `function tieneDuplicados(valores) {
  const vistos = new Set();
  for (const valor of valores) {
    if (vistos.has(valor)) return true;
    vistos.add(valor);
  }
  return false;
}
`,
        [
          test("dupes-yes", "Encuentra una repetición", "tieneDuplicados([4, 8, 2, 8]) === true", "true", "Comprueba pertenencia antes de agregar.", "tieneDuplicados([4, 8, 2, 8])"),
          test("dupes-no", "Acepta valores únicos", "tieneDuplicados([4, 8, 2, 1]) === false", "false", "Retorna falso solo después de recorrer todo.", "tieneDuplicados([4, 8, 2, 1])"),
        ],
        [test("dupes-empty", "Acepta una lista vacía", "tieneDuplicados([]) === false", "false", "Una lista vacía no tiene duplicados.")],
      ),
      python: variant(
        "python",
        `def tiene_duplicados(valores):
    # Usa un set y evita bucles anidados.
    pass
`,
        `def tiene_duplicados(valores):
    vistos = set()
    for valor in valores:
        if valor in vistos:
            return True
        vistos.add(valor)
    return False
`,
        [
          test("dupes-yes", "Encuentra una repetición", "tiene_duplicados([4, 8, 2, 8]) is True", "True", "Comprueba pertenencia antes de agregar.", "tiene_duplicados([4, 8, 2, 8])"),
          test("dupes-no", "Acepta valores únicos", "tiene_duplicados([4, 8, 2, 1]) is False", "False", "Retorna falso solo después de recorrer todo.", "tiene_duplicados([4, 8, 2, 1])"),
        ],
        [test("dupes-empty", "Acepta una lista vacía", "tiene_duplicados([]) is False", "False", "Una lista vacía no tiene duplicados.")],
      ),
      cpp: variant(
        "cpp",
        cpp(`bool tieneDuplicados(const vector<int>& valores) {
  // Usa unordered_set y evita bucles anidados.
  return false;
}`),
        cpp(`bool tieneDuplicados(const vector<int>& valores) {
  unordered_set<int> vistos;
  for (int valor : valores) {
    if (vistos.count(valor)) return true;
    vistos.insert(valor);
  }
  return false;
}`),
        [
          test("dupes-yes", "Encuentra una repetición", "tieneDuplicados({4, 8, 2, 8})", "true", "Comprueba pertenencia antes de agregar."),
          test("dupes-no", "Acepta valores únicos", "!tieneDuplicados({4, 8, 2, 1})", "false", "Retorna falso solo después de recorrer todo."),
        ],
        [test("dupes-empty", "Acepta una lista vacía", "!tieneDuplicados({})", "false", "Una lista vacía no tiene duplicados.")],
      ),
    },
  }),
  mission({
    id: "p2-03-busqueda-bodega",
    slug: "busqueda-binaria",
    course: "programming-2",
    module: "Búsqueda",
    order: 3,
    title: "Búsqueda binaria",
    summary: "Reduce a la mitad un espacio de búsqueda ordenado.",
    context: "Los componentes están ordenados por código dentro del inventario.",
    brief:
      "Implementa busquedaBinaria de forma iterativa. Retorna el índice del objetivo o -1 cuando no exista.",
    difficulty: "Intermedia",
    points: 180,
    duration: 22,
    tags: ["búsqueda binaria", "índices", "complejidad"],
    objectives: ["Mantener límites inclusivos.", "Descartar la mitad correcta en cada paso."],
    hints: ["Comienza con izquierda en cero y derecha en largo menos uno.", "Actualiza el límite sin volver a incluir el punto medio."],
    variants: {
      javascript: variant(
        "javascript",
        `function busquedaBinaria(valores, objetivo) {
  // Retorna el índice o -1.
}
`,
        `function busquedaBinaria(valores, objetivo) {
  let izquierda = 0;
  let derecha = valores.length - 1;
  while (izquierda <= derecha) {
    const medio = Math.floor((izquierda + derecha) / 2);
    if (valores[medio] === objetivo) return medio;
    if (valores[medio] < objetivo) izquierda = medio + 1;
    else derecha = medio - 1;
  }
  return -1;
}
`,
        [
          test("binary-found", "Encuentra un valor", "busquedaBinaria([2, 5, 8, 12, 20], 12) === 3", "3", "Revisa cómo actualizas los límites.", "busquedaBinaria([2, 5, 8, 12, 20], 12)"),
          test("binary-missing", "Retorna -1 si no existe", "busquedaBinaria([2, 5, 8, 12, 20], 7) === -1", "-1", "El bucle termina cuando los límites se cruzan.", "busquedaBinaria([2, 5, 8, 12, 20], 7)"),
        ],
        [test("binary-edges", "Encuentra los extremos", "busquedaBinaria([2, 5, 8], 2) === 0 && busquedaBinaria([2, 5, 8], 8) === 2", "0 y 2", "Mantén ambos límites incluidos.")],
      ),
      python: variant(
        "python",
        `def busqueda_binaria(valores, objetivo):
    # Retorna el índice o -1.
    pass
`,
        `def busqueda_binaria(valores, objetivo):
    izquierda = 0
    derecha = len(valores) - 1
    while izquierda <= derecha:
        medio = (izquierda + derecha) // 2
        if valores[medio] == objetivo:
            return medio
        if valores[medio] < objetivo:
            izquierda = medio + 1
        else:
            derecha = medio - 1
    return -1
`,
        [
          test("binary-found", "Encuentra un valor", "busqueda_binaria([2, 5, 8, 12, 20], 12) == 3", "3", "Revisa cómo actualizas los límites.", "busqueda_binaria([2, 5, 8, 12, 20], 12)"),
          test("binary-missing", "Retorna -1 si no existe", "busqueda_binaria([2, 5, 8, 12, 20], 7) == -1", "-1", "El bucle termina cuando los límites se cruzan.", "busqueda_binaria([2, 5, 8, 12, 20], 7)"),
        ],
        [test("binary-edges", "Encuentra los extremos", "busqueda_binaria([2, 5, 8], 2) == 0 and busqueda_binaria([2, 5, 8], 8) == 2", "0 y 2", "Mantén ambos límites incluidos.")],
      ),
      cpp: variant(
        "cpp",
        cpp(`int busquedaBinaria(const vector<int>& valores, int objetivo) {
  // Retorna el índice o -1.
  return -1;
}`),
        cpp(`int busquedaBinaria(const vector<int>& valores, int objetivo) {
  int izquierda = 0;
  int derecha = static_cast<int>(valores.size()) - 1;
  while (izquierda <= derecha) {
    int medio = izquierda + (derecha - izquierda) / 2;
    if (valores[medio] == objetivo) return medio;
    if (valores[medio] < objetivo) izquierda = medio + 1;
    else derecha = medio - 1;
  }
  return -1;
}`),
        [
          test("binary-found", "Encuentra un valor", "busquedaBinaria({2, 5, 8, 12, 20}, 12) == 3", "3", "Revisa cómo actualizas los límites."),
          test("binary-missing", "Retorna -1 si no existe", "busquedaBinaria({2, 5, 8, 12, 20}, 7) == -1", "-1", "El bucle termina cuando los límites se cruzan."),
        ],
        [test("binary-edges", "Encuentra los extremos", "busquedaBinaria({2, 5, 8}, 2) == 0 && busquedaBinaria({2, 5, 8}, 8) == 2", "0 y 2", "Mantén ambos límites incluidos.")],
      ),
    },
  }),
  mission({
    id: "p2-04-merge-sensores",
    slug: "merge-sort-sensores",
    course: "programming-2",
    module: "Ordenamiento",
    order: 4,
    title: "Merge de sensores",
    summary: "Ordena dividiendo y combinando colecciones.",
    context: "Dos estaciones entregaron marcas de tiempo fuera de orden.",
    brief:
      "Implementa mergeSort sin usar la función de ordenamiento incorporada. Retorna una colección nueva y no modifica la entrada.",
    difficulty: "Avanzada",
    points: 210,
    duration: 30,
    tags: ["merge sort", "recursión", "complejidad"],
    objectives: ["Dividir una colección.", "Combinar dos mitades ordenadas.", "Preservar la entrada."],
    hints: ["Una colección de largo cero o uno ya está ordenada.", "Combina comparando el primer elemento pendiente de cada mitad."],
    variants: {
      javascript: variant(
        "javascript",
        `function mergeSort(valores) {
  // No uses Array.prototype.sort.
}
`,
        `function mergeSort(valores) {
  if (valores.length <= 1) return [...valores];
  const medio = Math.floor(valores.length / 2);
  const izquierda = mergeSort(valores.slice(0, medio));
  const derecha = mergeSort(valores.slice(medio));
  const salida = [];
  let i = 0;
  let j = 0;
  while (i < izquierda.length && j < derecha.length) {
    if (izquierda[i] <= derecha[j]) salida.push(izquierda[i++]);
    else salida.push(derecha[j++]);
  }
  return salida.concat(izquierda.slice(i), derecha.slice(j));
}
`,
        [
          test("merge-order", "Ordena valores", "JSON.stringify(mergeSort([8, 3, 6, 1])) === JSON.stringify([1, 3, 6, 8])", "[1,3,6,8]", "Comprueba la combinación de las dos mitades.", "mergeSort([8, 3, 6, 1])"),
          test("merge-copy", "No modifica la entrada", "(() => { const x = [3, 1, 2]; mergeSort(x); return JSON.stringify(x) === JSON.stringify([3, 1, 2]); })()", "[3,1,2]", "Trabaja con copias o segmentos nuevos."),
        ],
        [test("merge-dupes", "Conserva duplicados", "JSON.stringify(mergeSort([4, 2, 4, 1])) === JSON.stringify([1, 2, 4, 4])", "[1,2,4,4]", "No descartes valores iguales.")],
      ),
      python: variant(
        "python",
        `def merge_sort(valores):
    # No uses sorted ni list.sort.
    pass
`,
        `def merge_sort(valores):
    if len(valores) <= 1:
        return valores[:]
    medio = len(valores) // 2
    izquierda = merge_sort(valores[:medio])
    derecha = merge_sort(valores[medio:])
    salida = []
    i = j = 0
    while i < len(izquierda) and j < len(derecha):
        if izquierda[i] <= derecha[j]:
            salida.append(izquierda[i])
            i += 1
        else:
            salida.append(derecha[j])
            j += 1
    return salida + izquierda[i:] + derecha[j:]
`,
        [
          test("merge-order", "Ordena valores", "merge_sort([8, 3, 6, 1]) == [1, 3, 6, 8]", "[1,3,6,8]", "Comprueba la combinación de las dos mitades.", "merge_sort([8, 3, 6, 1])"),
          test("merge-copy", "No modifica la entrada", "(lambda x: (merge_sort(x), x == [3, 1, 2])[-1])([3, 1, 2])", "[3,1,2]", "Trabaja con copias o segmentos nuevos."),
        ],
        [test("merge-dupes", "Conserva duplicados", "merge_sort([4, 2, 4, 1]) == [1, 2, 4, 4]", "[1,2,4,4]", "No descartes valores iguales.")],
      ),
      cpp: variant(
        "cpp",
        cpp(`vector<int> mergeSort(const vector<int>& valores) {
  // No uses std::sort.
  return {};
}`),
        cpp(`vector<int> mergeSort(const vector<int>& valores) {
  if (valores.size() <= 1) return valores;
  size_t medio = valores.size() / 2;
  vector<int> izquierda(valores.begin(), valores.begin() + medio);
  vector<int> derecha(valores.begin() + medio, valores.end());
  izquierda = mergeSort(izquierda);
  derecha = mergeSort(derecha);
  vector<int> salida;
  size_t i = 0, j = 0;
  while (i < izquierda.size() && j < derecha.size()) {
    if (izquierda[i] <= derecha[j]) salida.push_back(izquierda[i++]);
    else salida.push_back(derecha[j++]);
  }
  salida.insert(salida.end(), izquierda.begin() + i, izquierda.end());
  salida.insert(salida.end(), derecha.begin() + j, derecha.end());
  return salida;
}`),
        [
          test("merge-order", "Ordena valores", "mergeSort({8, 3, 6, 1}) == vector<int>({1, 3, 6, 8})", "[1,3,6,8]", "Comprueba la combinación de las dos mitades."),
          test("merge-copy", "No modifica la entrada", "[](){ vector<int> x{3,1,2}; mergeSort(x); return x == vector<int>({3,1,2}); }()", "[3,1,2]", "Recibe la entrada como referencia constante."),
        ],
        [test("merge-dupes", "Conserva duplicados", "mergeSort({4, 2, 4, 1}) == vector<int>({1, 2, 4, 4})", "[1,2,4,4]", "No descartes valores iguales.")],
      ),
    },
  }),
  mission({
    id: "p2-05-lista-jumpers",
    slug: "lista-enlazada",
    course: "programming-2",
    module: "Estructuras enlazadas",
    order: 5,
    title: "Cadena de jumpers",
    summary: "Mantén una lista enlazada y sus invariantes.",
    context: "Cada elemento apunta al siguiente y el largo debe permanecer consistente.",
    brief:
      "Implementa ListaEnlazada con agregar, eliminar y contiene. eliminar borra la primera coincidencia y retorna si encontró el valor.",
    difficulty: "Avanzada",
    points: 220,
    duration: 34,
    tags: ["listas enlazadas", "clases", "punteros"],
    objectives: ["Actualizar enlaces sin perder nodos.", "Mantener cabeza y largo consistentes."],
    hints: ["El caso de eliminar la cabeza es distinto.", "Guarda una referencia al nodo anterior mientras recorres."],
    variants: {
      javascript: variant(
        "javascript",
        `class ListaEnlazada {
  constructor() {
    this.cabeza = null;
    this.largo = 0;
  }

  agregar(valor) {}
  eliminar(valor) {}
  contiene(valor) {}
}
`,
        `class ListaEnlazada {
  constructor() {
    this.cabeza = null;
    this.largo = 0;
  }

  agregar(valor) {
    const nodo = { valor, siguiente: null };
    if (!this.cabeza) this.cabeza = nodo;
    else {
      let actual = this.cabeza;
      while (actual.siguiente) actual = actual.siguiente;
      actual.siguiente = nodo;
    }
    this.largo += 1;
  }

  eliminar(valor) {
    let anterior = null;
    let actual = this.cabeza;
    while (actual) {
      if (actual.valor === valor) {
        if (anterior) anterior.siguiente = actual.siguiente;
        else this.cabeza = actual.siguiente;
        this.largo -= 1;
        return true;
      }
      anterior = actual;
      actual = actual.siguiente;
    }
    return false;
  }

  contiene(valor) {
    let actual = this.cabeza;
    while (actual) {
      if (actual.valor === valor) return true;
      actual = actual.siguiente;
    }
    return false;
  }
}
`,
        [
          test("list-add", "Agrega y encuentra", "(() => { const l = new ListaEnlazada(); l.agregar(3); l.agregar(5); return l.contiene(5) && l.largo === 2; })()", "true", "Enlaza el nuevo nodo y actualiza el largo."),
          test("list-remove-head", "Elimina la cabeza", "(() => { const l = new ListaEnlazada(); l.agregar(3); l.agregar(5); return l.eliminar(3) && !l.contiene(3) && l.largo === 1; })()", "true", "Actualiza cabeza cuando eliminas el primer nodo."),
        ],
        [test("list-missing", "Conserva el largo si no existe", "(() => { const l = new ListaEnlazada(); l.agregar(3); return !l.eliminar(8) && l.largo === 1; })()", "true", "Solo reduce el largo cuando eliminas un nodo.")],
      ),
      python: variant(
        "python",
        `class ListaEnlazada:
    def __init__(self):
        self.cabeza = None
        self.largo = 0

    def agregar(self, valor):
        pass

    def eliminar(self, valor):
        pass

    def contiene(self, valor):
        pass
`,
        `class ListaEnlazada:
    def __init__(self):
        self.cabeza = None
        self.largo = 0

    def agregar(self, valor):
        nodo = {"valor": valor, "siguiente": None}
        if self.cabeza is None:
            self.cabeza = nodo
        else:
            actual = self.cabeza
            while actual["siguiente"] is not None:
                actual = actual["siguiente"]
            actual["siguiente"] = nodo
        self.largo += 1

    def eliminar(self, valor):
        anterior = None
        actual = self.cabeza
        while actual is not None:
            if actual["valor"] == valor:
                if anterior is None:
                    self.cabeza = actual["siguiente"]
                else:
                    anterior["siguiente"] = actual["siguiente"]
                self.largo -= 1
                return True
            anterior = actual
            actual = actual["siguiente"]
        return False

    def contiene(self, valor):
        actual = self.cabeza
        while actual is not None:
            if actual["valor"] == valor:
                return True
            actual = actual["siguiente"]
        return False
`,
        [
          test("list-add", "Agrega y encuentra", "(lambda l: (l.agregar(3), l.agregar(5), l.contiene(5) and l.largo == 2)[-1])(ListaEnlazada())", "True", "Enlaza el nuevo nodo y actualiza el largo."),
          test("list-remove-head", "Elimina la cabeza", "(lambda l: (l.agregar(3), l.agregar(5), l.eliminar(3) and not l.contiene(3) and l.largo == 1)[-1])(ListaEnlazada())", "True", "Actualiza cabeza cuando eliminas el primer nodo."),
        ],
        [test("list-missing", "Conserva el largo si no existe", "(lambda l: (l.agregar(3), not l.eliminar(8) and l.largo == 1)[-1])(ListaEnlazada())", "True", "Solo reduce el largo cuando eliminas un nodo.")],
      ),
      cpp: variant(
        "cpp",
        cpp(`class ListaEnlazada {
  struct Nodo {
    int valor;
    Nodo* siguiente;
  };
  Nodo* cabeza = nullptr;
  int largo_ = 0;

 public:
  ~ListaEnlazada() {
    // Libera los nodos.
  }
  void agregar(int valor) {}
  bool eliminar(int valor) { return false; }
  bool contiene(int valor) const { return false; }
  int largo() const { return largo_; }
};`),
        cpp(`class ListaEnlazada {
  struct Nodo {
    int valor;
    Nodo* siguiente;
  };
  Nodo* cabeza = nullptr;
  int largo_ = 0;

 public:
  ~ListaEnlazada() {
    while (cabeza) {
      Nodo* siguiente = cabeza->siguiente;
      delete cabeza;
      cabeza = siguiente;
    }
  }

  void agregar(int valor) {
    Nodo* nodo = new Nodo{valor, nullptr};
    if (!cabeza) cabeza = nodo;
    else {
      Nodo* actual = cabeza;
      while (actual->siguiente) actual = actual->siguiente;
      actual->siguiente = nodo;
    }
    ++largo_;
  }

  bool eliminar(int valor) {
    Nodo* anterior = nullptr;
    Nodo* actual = cabeza;
    while (actual) {
      if (actual->valor == valor) {
        if (anterior) anterior->siguiente = actual->siguiente;
        else cabeza = actual->siguiente;
        delete actual;
        --largo_;
        return true;
      }
      anterior = actual;
      actual = actual->siguiente;
    }
    return false;
  }

  bool contiene(int valor) const {
    Nodo* actual = cabeza;
    while (actual) {
      if (actual->valor == valor) return true;
      actual = actual->siguiente;
    }
    return false;
  }

  int largo() const { return largo_; }
};`),
        [
          test("list-add", "Agrega y encuentra", "[](){ ListaEnlazada l; l.agregar(3); l.agregar(5); return l.contiene(5) && l.largo() == 2; }()", "true", "Enlaza el nuevo nodo y actualiza el largo."),
          test("list-remove-head", "Elimina la cabeza", "[](){ ListaEnlazada l; l.agregar(3); l.agregar(5); return l.eliminar(3) && !l.contiene(3) && l.largo() == 1; }()", "true", "Actualiza cabeza cuando eliminas el primer nodo."),
        ],
        [test("list-missing", "Conserva el largo si no existe", "[](){ ListaEnlazada l; l.agregar(3); return !l.eliminar(8) && l.largo() == 1; }()", "true", "Solo reduce el largo cuando eliminas un nodo.")],
      ),
    },
  }),
  mission({
    id: "p2-06-cola-taller",
    slug: "cola-del-taller",
    course: "programming-2",
    module: "Colas",
    order: 6,
    title: "La fila del taller",
    summary: "Implementa una cola con operaciones O(1).",
    context: "Los equipos deben atenderse en el mismo orden en que llegan.",
    brief:
      "Implementa Cola con encolar, desencolar, frente y estaVacia. No desplaces todos los elementos al desencolar.",
    difficulty: "Avanzada",
    points: 210,
    duration: 28,
    tags: ["colas", "FIFO", "complejidad"],
    objectives: ["Aplicar el orden FIFO.", "Mantener operaciones constantes."],
    hints: ["Mantén un índice o estructura dedicada para el frente.", "desencolar y frente deben manejar una cola vacía."],
    variants: {
      javascript: variant(
        "javascript",
        `class Cola {
  constructor() {
    this.datos = [];
    this.inicio = 0;
  }
  encolar(valor) {}
  desencolar() {}
  frente() {}
  estaVacia() {}
}
`,
        `class Cola {
  constructor() {
    this.datos = [];
    this.inicio = 0;
  }
  encolar(valor) {
    this.datos.push(valor);
  }
  desencolar() {
    if (this.estaVacia()) return null;
    const valor = this.datos[this.inicio++];
    if (this.inicio > 32 && this.inicio * 2 > this.datos.length) {
      this.datos = this.datos.slice(this.inicio);
      this.inicio = 0;
    }
    return valor;
  }
  frente() {
    return this.estaVacia() ? null : this.datos[this.inicio];
  }
  estaVacia() {
    return this.inicio >= this.datos.length;
  }
}
`,
        [
          test("queue-order", "Respeta FIFO", "(() => { const q = new Cola(); q.encolar(4); q.encolar(8); return q.desencolar() === 4 && q.frente() === 8; })()", "true", "El primer valor que entra debe ser el primero que sale."),
          test("queue-empty", "Maneja una cola vacía", "(() => { const q = new Cola(); return q.estaVacia() && q.desencolar() === null && q.frente() === null; })()", "true", "Define una salida estable para la cola vacía."),
        ],
        [test("queue-cycle", "Permite reutilizar la cola", "(() => { const q = new Cola(); q.encolar(1); q.desencolar(); q.encolar(2); return q.desencolar() === 2 && q.estaVacia(); })()", "true", "Los índices deben quedar consistentes después de vaciar.")],
      ),
      python: variant(
        "python",
        `class Cola:
    def __init__(self):
        self.datos = []
        self.inicio = 0

    def encolar(self, valor):
        pass

    def desencolar(self):
        pass

    def frente(self):
        pass

    def esta_vacia(self):
        pass
`,
        `class Cola:
    def __init__(self):
        self.datos = []
        self.inicio = 0

    def encolar(self, valor):
        self.datos.append(valor)

    def desencolar(self):
        if self.esta_vacia():
            return None
        valor = self.datos[self.inicio]
        self.inicio += 1
        if self.inicio > 32 and self.inicio * 2 > len(self.datos):
            self.datos = self.datos[self.inicio:]
            self.inicio = 0
        return valor

    def frente(self):
        return None if self.esta_vacia() else self.datos[self.inicio]

    def esta_vacia(self):
        return self.inicio >= len(self.datos)
`,
        [
          test("queue-order", "Respeta FIFO", "(lambda q: (q.encolar(4), q.encolar(8), q.desencolar() == 4 and q.frente() == 8)[-1])(Cola())", "True", "El primer valor que entra debe ser el primero que sale."),
          test("queue-empty", "Maneja una cola vacía", "(lambda q: q.esta_vacia() and q.desencolar() is None and q.frente() is None)(Cola())", "True", "Define una salida estable para la cola vacía."),
        ],
        [test("queue-cycle", "Permite reutilizar la cola", "(lambda q: (q.encolar(1), q.desencolar(), q.encolar(2), q.desencolar() == 2 and q.esta_vacia())[-1])(Cola())", "True", "Los índices deben quedar consistentes después de vaciar.")],
      ),
      cpp: variant(
        "cpp",
        cpp(`class Cola {
  deque<int> datos;

 public:
  void encolar(int valor) {}
  optional<int> desencolar() { return nullopt; }
  optional<int> frente() const { return nullopt; }
  bool estaVacia() const { return true; }
};`),
        cpp(`class Cola {
  deque<int> datos;

 public:
  void encolar(int valor) { datos.push_back(valor); }

  optional<int> desencolar() {
    if (datos.empty()) return nullopt;
    int valor = datos.front();
    datos.pop_front();
    return valor;
  }

  optional<int> frente() const {
    if (datos.empty()) return nullopt;
    return datos.front();
  }

  bool estaVacia() const { return datos.empty(); }
};`),
        [
          test("queue-order", "Respeta FIFO", "[](){ Cola q; q.encolar(4); q.encolar(8); return q.desencolar() == optional<int>(4) && q.frente() == optional<int>(8); }()", "true", "El primer valor que entra debe ser el primero que sale."),
          test("queue-empty", "Maneja una cola vacía", "[](){ Cola q; return q.estaVacia() && !q.desencolar().has_value() && !q.frente().has_value(); }()", "true", "Define una salida estable para la cola vacía."),
        ],
        [test("queue-cycle", "Permite reutilizar la cola", "[](){ Cola q; q.encolar(1); q.desencolar(); q.encolar(2); return q.desencolar() == optional<int>(2) && q.estaVacia(); }()", "true", "El estado debe quedar consistente después de vaciar.")],
      ),
    },
  }),
  mission({
    id: "p2-07-arbol-decisiones",
    slug: "arbol-de-busqueda",
    course: "programming-2",
    module: "Árboles",
    order: 7,
    title: "Árbol de búsqueda",
    summary: "Inserta y consulta valores manteniendo un orden.",
    context: "El inventario necesita consultas que aprovechen su organización.",
    brief:
      "Implementa ArbolBusqueda con insertar y contiene. Ignora duplicados y conserva la regla menor a la izquierda, mayor a la derecha.",
    difficulty: "Avanzada",
    points: 230,
    duration: 34,
    tags: ["árboles", "BST", "recursión"],
    objectives: ["Mantener la invariante de un BST.", "Recorrer solo la rama necesaria."],
    hints: ["Cada comparación elige una sola rama.", "Si el valor es igual, no insertes otro nodo."],
    variants: {
      javascript: variant(
        "javascript",
        `class ArbolBusqueda {
  constructor() {
    this.raiz = null;
  }
  insertar(valor) {}
  contiene(valor) {}
}
`,
        `class ArbolBusqueda {
  constructor() {
    this.raiz = null;
  }
  insertar(valor) {
    const nodo = { valor, izquierda: null, derecha: null };
    if (!this.raiz) {
      this.raiz = nodo;
      return true;
    }
    let actual = this.raiz;
    while (true) {
      if (valor === actual.valor) return false;
      const lado = valor < actual.valor ? "izquierda" : "derecha";
      if (!actual[lado]) {
        actual[lado] = nodo;
        return true;
      }
      actual = actual[lado];
    }
  }
  contiene(valor) {
    let actual = this.raiz;
    while (actual) {
      if (valor === actual.valor) return true;
      actual = valor < actual.valor ? actual.izquierda : actual.derecha;
    }
    return false;
  }
}
`,
        [
          test("tree-find", "Inserta y encuentra", "(() => { const a = new ArbolBusqueda(); [8, 3, 10, 6].forEach((x) => a.insertar(x)); return a.contiene(6) && !a.contiene(9); })()", "true", "Compara y avanza por la rama correspondiente."),
          test("tree-order", "Mantiene el orden", "(() => { const a = new ArbolBusqueda(); [8, 3, 10].forEach((x) => a.insertar(x)); return a.raiz.izquierda.valor === 3 && a.raiz.derecha.valor === 10; })()", "true", "Menores van a la izquierda y mayores a la derecha."),
        ],
        [test("tree-dupe", "Ignora duplicados", "(() => { const a = new ArbolBusqueda(); return a.insertar(5) && !a.insertar(5); })()", "true", "Retorna falso al recibir un valor existente.")],
      ),
      python: variant(
        "python",
        `class ArbolBusqueda:
    def __init__(self):
        self.raiz = None

    def insertar(self, valor):
        pass

    def contiene(self, valor):
        pass
`,
        `class ArbolBusqueda:
    def __init__(self):
        self.raiz = None

    def insertar(self, valor):
        nodo = {"valor": valor, "izquierda": None, "derecha": None}
        if self.raiz is None:
            self.raiz = nodo
            return True
        actual = self.raiz
        while True:
            if valor == actual["valor"]:
                return False
            lado = "izquierda" if valor < actual["valor"] else "derecha"
            if actual[lado] is None:
                actual[lado] = nodo
                return True
            actual = actual[lado]

    def contiene(self, valor):
        actual = self.raiz
        while actual is not None:
            if valor == actual["valor"]:
                return True
            actual = actual["izquierda"] if valor < actual["valor"] else actual["derecha"]
        return False
`,
        [
          test("tree-find", "Inserta y encuentra", "(lambda a: ([a.insertar(x) for x in [8, 3, 10, 6]], a.contiene(6) and not a.contiene(9))[-1])(ArbolBusqueda())", "True", "Compara y avanza por la rama correspondiente."),
          test("tree-order", "Mantiene el orden", "(lambda a: ([a.insertar(x) for x in [8, 3, 10]], a.raiz['izquierda']['valor'] == 3 and a.raiz['derecha']['valor'] == 10)[-1])(ArbolBusqueda())", "True", "Menores van a la izquierda y mayores a la derecha."),
        ],
        [test("tree-dupe", "Ignora duplicados", "(lambda a: a.insertar(5) and not a.insertar(5))(ArbolBusqueda())", "True", "Retorna falso al recibir un valor existente.")],
      ),
      cpp: variant(
        "cpp",
        cpp(`class ArbolBusqueda {
  struct Nodo {
    int valor;
    unique_ptr<Nodo> izquierda;
    unique_ptr<Nodo> derecha;
  };
  unique_ptr<Nodo> raiz;

 public:
  bool insertar(int valor) { return false; }
  bool contiene(int valor) const { return false; }
};`),
        cpp(`class ArbolBusqueda {
  struct Nodo {
    int valor;
    unique_ptr<Nodo> izquierda;
    unique_ptr<Nodo> derecha;
  };
  unique_ptr<Nodo> raiz;

 public:
  bool insertar(int valor) {
    unique_ptr<Nodo>* actual = &raiz;
    while (*actual) {
      if (valor == (*actual)->valor) return false;
      actual = valor < (*actual)->valor ? &(*actual)->izquierda : &(*actual)->derecha;
    }
    *actual = make_unique<Nodo>(Nodo{valor, nullptr, nullptr});
    return true;
  }

  bool contiene(int valor) const {
    const Nodo* actual = raiz.get();
    while (actual) {
      if (valor == actual->valor) return true;
      actual = valor < actual->valor ? actual->izquierda.get() : actual->derecha.get();
    }
    return false;
  }
};`),
        [
          test("tree-find", "Inserta y encuentra", "[](){ ArbolBusqueda a; for (int x : {8,3,10,6}) a.insertar(x); return a.contiene(6) && !a.contiene(9); }()", "true", "Compara y avanza por la rama correspondiente."),
          test("tree-order", "Encuentra ambos lados", "[](){ ArbolBusqueda a; for (int x : {8,3,10}) a.insertar(x); return a.contiene(3) && a.contiene(10); }()", "true", "Menores van a la izquierda y mayores a la derecha."),
        ],
        [test("tree-dupe", "Ignora duplicados", "[](){ ArbolBusqueda a; return a.insertar(5) && !a.insertar(5); }()", "true", "Retorna falso al recibir un valor existente.")],
      ),
    },
  }),
  mission({
    id: "p2-08-ruta-maker",
    slug: "ruta-maker",
    course: "programming-2",
    module: "Grafos",
    order: 8,
    title: "Ruta maker",
    summary: "Encuentra la menor cantidad de saltos con BFS.",
    context: "Las sedes del circuito están conectadas como una red no ponderada.",
    brief:
      "Implementa distanciaMinima sobre una lista de adyacencia. Retorna la cantidad de aristas de la ruta más corta o -1 si no existe.",
    difficulty: "Avanzada",
    points: 240,
    duration: 38,
    tags: ["grafos", "BFS", "colas"],
    objectives: ["Recorrer por niveles.", "Evitar visitar un nodo más de una vez."],
    hints: ["Guarda nodo y distancia en la cola.", "Marca cada nodo al encolarlo, no al retirarlo."],
    variants: {
      javascript: variant(
        "javascript",
        `function distanciaMinima(grafo, origen, destino) {
  // grafo es un arreglo de listas de vecinos.
}
`,
        `function distanciaMinima(grafo, origen, destino) {
  const cola = [[origen, 0]];
  const vistos = new Set([origen]);
  let inicio = 0;
  while (inicio < cola.length) {
    const [nodo, distancia] = cola[inicio++];
    if (nodo === destino) return distancia;
    for (const vecino of grafo[nodo] ?? []) {
      if (!vistos.has(vecino)) {
        vistos.add(vecino);
        cola.push([vecino, distancia + 1]);
      }
    }
  }
  return -1;
}
`,
        [
          test("graph-route", "Encuentra la ruta mínima", "distanciaMinima([[1,2],[0,3],[0,3],[1,2,4],[3]], 0, 4) === 3", "3", "BFS encuentra primero la menor distancia.", "distanciaMinima([[1,2],[0,3],[0,3],[1,2,4],[3]], 0, 4)"),
          test("graph-same", "Resuelve origen igual a destino", "distanciaMinima([[1],[0]], 1, 1) === 0", "0", "Comprueba el nodo retirado antes de expandirlo.", "distanciaMinima([[1],[0]], 1, 1)"),
        ],
        [test("graph-none", "Detecta ruta inexistente", "distanciaMinima([[1],[0],[]], 0, 2) === -1", "-1", "Retorna -1 cuando la cola queda vacía.")],
      ),
      python: variant(
        "python",
        `def distancia_minima(grafo, origen, destino):
    # grafo es una lista de listas de vecinos.
    pass
`,
        `from collections import deque

def distancia_minima(grafo, origen, destino):
    cola = deque([(origen, 0)])
    vistos = {origen}
    while cola:
        nodo, distancia = cola.popleft()
        if nodo == destino:
            return distancia
        for vecino in grafo[nodo]:
            if vecino not in vistos:
                vistos.add(vecino)
                cola.append((vecino, distancia + 1))
    return -1
`,
        [
          test("graph-route", "Encuentra la ruta mínima", "distancia_minima([[1,2],[0,3],[0,3],[1,2,4],[3]], 0, 4) == 3", "3", "BFS encuentra primero la menor distancia.", "distancia_minima([[1,2],[0,3],[0,3],[1,2,4],[3]], 0, 4)"),
          test("graph-same", "Resuelve origen igual a destino", "distancia_minima([[1],[0]], 1, 1) == 0", "0", "Comprueba el nodo retirado antes de expandirlo.", "distancia_minima([[1],[0]], 1, 1)"),
        ],
        [test("graph-none", "Detecta ruta inexistente", "distancia_minima([[1],[0],[]], 0, 2) == -1", "-1", "Retorna -1 cuando la cola queda vacía.")],
      ),
      cpp: variant(
        "cpp",
        cpp(`int distanciaMinima(const vector<vector<int>>& grafo, int origen, int destino) {
  // Retorna la cantidad de aristas o -1.
  return -1;
}`),
        cpp(`int distanciaMinima(const vector<vector<int>>& grafo, int origen, int destino) {
  queue<pair<int, int>> cola;
  vector<bool> vistos(grafo.size(), false);
  cola.push({origen, 0});
  vistos[origen] = true;
  while (!cola.empty()) {
    auto [nodo, distancia] = cola.front();
    cola.pop();
    if (nodo == destino) return distancia;
    for (int vecino : grafo[nodo]) {
      if (!vistos[vecino]) {
        vistos[vecino] = true;
        cola.push({vecino, distancia + 1});
      }
    }
  }
  return -1;
}`),
        [
          test("graph-route", "Encuentra la ruta mínima", "distanciaMinima({{1,2},{0,3},{0,3},{1,2,4},{3}}, 0, 4) == 3", "3", "BFS encuentra primero la menor distancia."),
          test("graph-same", "Resuelve origen igual a destino", "distanciaMinima({{1},{0}}, 1, 1) == 0", "0", "Comprueba el nodo retirado antes de expandirlo."),
        ],
        [test("graph-none", "Detecta ruta inexistente", "distanciaMinima({{1},{0},{}}, 0, 2) == -1", "-1", "Retorna -1 cuando la cola queda vacía.")],
      ),
    },
  }),
  mission({
    id: "p2-09-frecuencias-serial",
    slug: "frecuencias-del-serial",
    course: "programming-2",
    module: "Hashing",
    order: 9,
    title: "Frecuencias del serial",
    summary: "Cuenta valores y conserva el primero en caso de empate.",
    context: "El monitor serial repite estados y necesitamos identificar el más frecuente.",
    brief:
      "Implementa masComun. Retorna el valor con mayor frecuencia; en empate conserva el que apareció primero. Para una lista vacía retorna una cadena vacía.",
    difficulty: "Avanzada",
    points: 210,
    duration: 26,
    tags: ["hashing", "frecuencias", "estabilidad"],
    objectives: ["Construir una tabla de frecuencias.", "Resolver empates de forma estable."],
    hints: ["Cuenta primero y luego recorre el orden original.", "Solo reemplaza el ganador si la frecuencia es estrictamente mayor."],
    variants: {
      javascript: variant(
        "javascript",
        `function masComun(valores) {
  // Retorna el valor más frecuente.
}
`,
        `function masComun(valores) {
  if (valores.length === 0) return "";
  const conteo = new Map();
  for (const valor of valores) conteo.set(valor, (conteo.get(valor) ?? 0) + 1);
  let ganador = valores[0];
  for (const valor of valores) {
    if (conteo.get(valor) > conteo.get(ganador)) ganador = valor;
  }
  return ganador;
}
`,
        [
          test("freq-most", "Encuentra el más frecuente", 'masComun(["OK", "WARN", "OK", "ERROR", "OK"]) === "OK"', "OK", "Cuenta cada valor antes de elegir.", 'masComun(["OK", "WARN", "OK", "ERROR", "OK"])'),
          test("freq-tie", "Conserva el primero en empate", 'masComun(["WARN", "OK", "OK", "WARN"]) === "WARN"', "WARN", "No reemplaces al ganador cuando las frecuencias sean iguales.", 'masComun(["WARN", "OK", "OK", "WARN"])'),
        ],
        [test("freq-empty", "Acepta una lista vacía", 'masComun([]) === ""', '""', "Define el caso vacío al inicio.")],
      ),
      python: variant(
        "python",
        `def mas_comun(valores):
    # Retorna el valor más frecuente.
    pass
`,
        `def mas_comun(valores):
    if not valores:
        return ""
    conteo = {}
    for valor in valores:
        conteo[valor] = conteo.get(valor, 0) + 1
    ganador = valores[0]
    for valor in valores:
        if conteo[valor] > conteo[ganador]:
            ganador = valor
    return ganador
`,
        [
          test("freq-most", "Encuentra el más frecuente", 'mas_comun(["OK", "WARN", "OK", "ERROR", "OK"]) == "OK"', "OK", "Cuenta cada valor antes de elegir.", 'mas_comun(["OK", "WARN", "OK", "ERROR", "OK"])'),
          test("freq-tie", "Conserva el primero en empate", 'mas_comun(["WARN", "OK", "OK", "WARN"]) == "WARN"', "WARN", "No reemplaces al ganador cuando las frecuencias sean iguales.", 'mas_comun(["WARN", "OK", "OK", "WARN"])'),
        ],
        [test("freq-empty", "Acepta una lista vacía", 'mas_comun([]) == ""', '""', "Define el caso vacío al inicio.")],
      ),
      cpp: variant(
        "cpp",
        cpp(`string masComun(const vector<string>& valores) {
  // Retorna el valor más frecuente.
  return "";
}`),
        cpp(`string masComun(const vector<string>& valores) {
  if (valores.empty()) return "";
  unordered_map<string, int> conteo;
  for (const string& valor : valores) ++conteo[valor];
  string ganador = valores.front();
  for (const string& valor : valores) {
    if (conteo[valor] > conteo[ganador]) ganador = valor;
  }
  return ganador;
}`),
        [
          test("freq-most", "Encuentra el más frecuente", 'masComun({"OK", "WARN", "OK", "ERROR", "OK"}) == "OK"', "OK", "Cuenta cada valor antes de elegir."),
          test("freq-tie", "Conserva el primero en empate", 'masComun({"WARN", "OK", "OK", "WARN"}) == "WARN"', "WARN", "No reemplaces al ganador cuando las frecuencias sean iguales."),
        ],
        [test("freq-empty", "Acepta una lista vacía", 'masComun({}) == ""', '""', "Define el caso vacío al inicio.")],
      ),
    },
  }),
  mission({
    id: "p2-10-cambio-micro",
    slug: "cambio-para-la-micro",
    course: "programming-2",
    module: "Programación dinámica",
    order: 10,
    title: "Cambio para la micro",
    summary: "Encuentra la cantidad mínima de monedas.",
    context: "Las denominaciones disponibles no siempre permiten una estrategia codiciosa.",
    brief:
      "Implementa minMonedas con programación dinámica. Retorna la cantidad mínima o -1 cuando el monto no pueda formarse.",
    difficulty: "Avanzada",
    points: 260,
    duration: 40,
    tags: ["programación dinámica", "optimización"],
    objectives: ["Definir estados y transiciones.", "Distinguir estados inalcanzables."],
    hints: ["dp[x] puede representar la mejor respuesta para el monto x.", "Inicializa dp[0] en cero y los demás estados como inalcanzables."],
    variants: {
      javascript: variant(
        "javascript",
        `function minMonedas(monedas, monto) {
  // Retorna la cantidad mínima o -1.
}
`,
        `function minMonedas(monedas, monto) {
  const dp = Array(monto + 1).fill(Infinity);
  dp[0] = 0;
  for (let actual = 1; actual <= monto; actual += 1) {
    for (const moneda of monedas) {
      if (moneda <= actual) dp[actual] = Math.min(dp[actual], dp[actual - moneda] + 1);
    }
  }
  return Number.isFinite(dp[monto]) ? dp[monto] : -1;
}
`,
        [
          test("coins-nongreedy", "Supera el caso no codicioso", "minMonedas([1, 3, 4], 6) === 2", "2", "Considera todas las denominaciones para cada monto.", "minMonedas([1, 3, 4], 6)"),
          test("coins-zero", "Resuelve monto cero", "minMonedas([2, 5], 0) === 0", "0", "El estado base necesita cero monedas.", "minMonedas([2, 5], 0)"),
        ],
        [
          test("coins-none", "Detecta un monto imposible", "minMonedas([4, 6], 5) === -1", "-1", "Conserva los estados inalcanzables."),
          test("coins-larger", "Optimiza un monto mayor", "minMonedas([1, 5, 7], 11) === 3", "3", "Reutiliza las mejores soluciones anteriores."),
        ],
      ),
      python: variant(
        "python",
        `def min_monedas(monedas, monto):
    # Retorna la cantidad mínima o -1.
    pass
`,
        `def min_monedas(monedas, monto):
    dp = [float("inf")] * (monto + 1)
    dp[0] = 0
    for actual in range(1, monto + 1):
        for moneda in monedas:
            if moneda <= actual:
                dp[actual] = min(dp[actual], dp[actual - moneda] + 1)
    return -1 if dp[monto] == float("inf") else dp[monto]
`,
        [
          test("coins-nongreedy", "Supera el caso no codicioso", "min_monedas([1, 3, 4], 6) == 2", "2", "Considera todas las denominaciones para cada monto.", "min_monedas([1, 3, 4], 6)"),
          test("coins-zero", "Resuelve monto cero", "min_monedas([2, 5], 0) == 0", "0", "El estado base necesita cero monedas.", "min_monedas([2, 5], 0)"),
        ],
        [
          test("coins-none", "Detecta un monto imposible", "min_monedas([4, 6], 5) == -1", "-1", "Conserva los estados inalcanzables."),
          test("coins-larger", "Optimiza un monto mayor", "min_monedas([1, 5, 7], 11) == 3", "3", "Reutiliza las mejores soluciones anteriores."),
        ],
      ),
      cpp: variant(
        "cpp",
        cpp(`int minMonedas(const vector<int>& monedas, int monto) {
  // Retorna la cantidad mínima o -1.
  return -1;
}`),
        cpp(`int minMonedas(const vector<int>& monedas, int monto) {
  const int infinito = monto + 1;
  vector<int> dp(monto + 1, infinito);
  dp[0] = 0;
  for (int actual = 1; actual <= monto; ++actual) {
    for (int moneda : monedas) {
      if (moneda <= actual) dp[actual] = min(dp[actual], dp[actual - moneda] + 1);
    }
  }
  return dp[monto] == infinito ? -1 : dp[monto];
}`),
        [
          test("coins-nongreedy", "Supera el caso no codicioso", "minMonedas({1, 3, 4}, 6) == 2", "2", "Considera todas las denominaciones para cada monto."),
          test("coins-zero", "Resuelve monto cero", "minMonedas({2, 5}, 0) == 0", "0", "El estado base necesita cero monedas."),
        ],
        [
          test("coins-none", "Detecta un monto imposible", "minMonedas({4, 6}, 5) == -1", "-1", "Conserva los estados inalcanzables."),
          test("coins-larger", "Optimiza un monto mayor", "minMonedas({1, 5, 7}, 11) == 3", "3", "Reutiliza las mejores soluciones anteriores."),
        ],
      ),
    },
  }),
];
