
# **Prompt Detallado: FutsalDex - Plataforma de Entrenamiento de Fútbol Sala**

## **1. Visión General del Producto**

**Nombre de la Aplicación:** FutsalDex

**Objetivo Principal:** Crear una aplicación web integral y moderna para entrenadores de fútbol sala. La plataforma debe ser un asistente digital que facilite la planificación de entrenamientos, la gestión de equipos y el análisis de rendimiento, utilizando tecnologías web modernas e inteligencia artificial.

**Público Objetivo:** Entrenadores de fútbol sala de todos los niveles, desde equipos formativos (benjamines, alevines) hasta categorías senior.

---

## **2. Stack Tecnológico**

La aplicación se construirá utilizando un stack predefinido y moderno:

*   **Framework:** Next.js con App Router.
*   **Lenguaje:** TypeScript.
*   **UI Framework:** React.
*   **Componentes UI:** ShadCN UI.
*   **Estilos:** Tailwind CSS.
*   **Backend & Base de Datos:** Firebase (Firestore para la base de datos, Firebase Authentication para la autenticación).
*   **Inteligencia Artificial:** Genkit para la integración con modelos de IA (ej. Google Gemini).
*   **Validación de Formularios:** Zod para esquemas y React Hook Form para la gestión.

---

## **3. Características Principales (Core Features)**

### **3.1. Sistema de Autenticación y Acceso**

*   **Registro de Usuario:** Permitir a los usuarios crear una cuenta con email y contraseña.
    *   Al registrarse, se activa un **período de prueba de 48 horas** con acceso completo a las funcionalidades de suscripción.
    *   Se debe notificar al usuario sobre el inicio y la duración de su prueba.
*   **Inicio de Sesión:** Autenticación de usuarios existentes.
*   **Roles y Permisos:**
    *   **Invitado (No Registrado):** Puede navegar por la mayoría de las páginas en un "modo de demostración". Los datos mostrados son de ejemplo y las acciones de guardar/editar/crear están deshabilitadas, mostrando en su lugar una invitación a registrarse.
    *   **Usuario Registrado (Prueba Activa):** Durante 48 horas, tiene acceso a todas las funcionalidades como si estuviera suscrito (excepto el panel de admin).
    *   **Usuario Registrado (Prueba Expirada):** Pierde el acceso a las funcionalidades de creación/edición. Se le invita a suscribirse.
    *   **Usuario Suscrito:** Acceso completo a todas las funcionalidades de usuario.
    *   **Administrador:** Acceso total, incluyendo un panel de administración específico.

### **3.2. Biblioteca de Ejercicios (`/ejercicios`)**

*   **Visualización:** Mostrar una galería de ejercicios en formato de tarjetas.
*   **Filtrado:** Implementar filtros por:
    *   Nombre (búsqueda de texto).
    *   Categoría temática (Finalización, Defensa, etc.).
    *   Categoría de edad (Benjamín, Alevín, etc.).
    *   Fase de la sesión (Inicial, Principal, Final).
*   **Paginación:** Mostrar un número limitado de ejercicios por página (ej. 12) y permitir la navegación entre páginas.
*   **Vista de Detalle:** Al hacer clic en un ejercicio, se abre una página de detalle (`/ejercicios/[id]`) con toda la información: descripción, objetivos, materiales, duración, imagen/diagrama, etc.
*   **Favoritos:** Los usuarios registrados pueden marcar/desmarcar ejercicios como favoritos.
*   **Descarga PDF:** Los usuarios registrados pueden descargar una ficha del ejercicio en formato PDF.

### **3.3. Creación de Sesiones**

*   **Punto de Entrada (`/crear-sesion`):** Página que permite elegir entre creación manual o con IA.
*   **Creación Manual (`/crear-sesion`):**
    *   Formulario estructurado en tres fases: Calentamiento, Principal y Vuelta a la Calma.
    *   Para cada fase, el usuario selecciona 1 o más ejercicios de la biblioteca.
    *   La fase principal debe permitir la selección de hasta 4 ejercicios y tener filtros por categoría.
    *   El usuario puede añadir detalles adicionales: número de sesión, fecha, temporada, etc.
    *   La acción de guardar está protegida por suscripción.
*   **Creación con IA (`/crear-sesion-ia`):**
    *   Formulario donde el usuario describe sus necesidades en lenguaje natural: descripción del equipo, objetivos, foco principal y duración deseada.
    *   Utilizar Genkit para enviar un prompt a un modelo de IA y generar un plan de sesión completo (texto para calentamiento, un array de textos para los ejercicios principales y texto para la vuelta a la calma).
    *   Mostrar el resultado en la interfaz.
    *   Permitir guardar la sesión generada. Esta acción está protegida por suscripción.

### **3.4. Gestión de Equipo (`/mi-equipo`)**

Esta es una sección principal para usuarios registrados, que debe tener un panel de navegación con las siguientes sub-secciones:

*   **Mi Plantilla (`/mi-equipo/plantilla`):**
    *   Gestionar una tabla de jugadores (máx. 12).
    *   Campos por jugador: Dorsal, Nombre, Posición (Portero, Cierre, Ala, Ala-Cierre, Ala-Pívot, Pívot).
    *   Agregar y eliminar jugadores.
    *   Mostrar estadísticas agregadas de la temporada para cada jugador (goles, tarjetas, etc.), obtenidas de los partidos guardados.
    *   Guardado protegido por suscripción.
*   **Control de Asistencia (`/mi-equipo/asistencia`):**
    *   Seleccionar una fecha (entrenamiento).
    *   Marcar el estado de cada jugador de la plantilla: Presente, Ausente, Justificado, Lesionado.
    *   Mostrar una tabla con el historial de asistencia acumulado de cada jugador.
    *   Guardado protegido por suscripción.
*   **Mis Partidos y Estadísticas:**
    *   **Historial (`/estadisticas/historial`):** Ver una lista de todos los partidos guardados. Permitir crear un nuevo partido, ver detalles, editar o eliminar.
    *   **Registro de Estadísticas (`/estadisticas`):** Interfaz para registrar estadísticas en tiempo real durante un partido. Debe incluir:
        *   Contadores para eventos de equipo (tiros, pérdidas, robos, tiempos muertos) por cada mitad.
        *   Contadores para estadísticas individuales de jugadores (goles, tarjetas, faltas, paradas, etc.).
        *   Tabs para alternar entre el equipo local y el visitante.
    *   **Edición (`/estadisticas/edit/[id]`):** Una versión de la página de registro pre-cargada con los datos de un partido guardado para su modificación.
    *   Guardado y edición protegidos por suscripción.
*   **Mis Sesiones (`/mis-sesiones`):**
    *   Listado de todas las sesiones (manuales y de IA) guardadas por el usuario.
    *   Filtros por año y mes.
    *   Opciones para ver detalle, editar (solo manuales) o eliminar cada sesión.
*   **Calendario (`/calendario`):**
    *   Vista de calendario mensual que muestra todas las sesiones y partidos guardados en sus respectivas fechas.
*   **Estadísticas Generales (`/mi-equipo/estadisticas-generales`):**
    *   Dashboard con tarjetas que resumen datos clave: total de sesiones, partidos ganados/perdidos, goles a favor/en contra, ejercicio más utilizado, etc.
*   **Soporte (`/soporte`):**
    *   Interfaz de chat para que los usuarios suscritos puedan hablar con un "Entrenador IA" para resolver dudas.

### **3.5. Panel de Administración (`/admin`)**

*   Sección protegida, accesible solo para usuarios con el rol `admin`.
*   **Gestionar Ejercicios:**
    *   Añadir un nuevo ejercicio a través de un formulario detallado.
    *   Editar un ejercicio existente.
    *   Eliminar ejercicios.
    *   **Subida por Lote:** Funcionalidad para subir un archivo Excel/CSV con múltiples ejercicios para poblara la base de datos.
*   **Gestionar Suscripciones:**
    *   Ver una lista de todos los usuarios registrados.
    *   Modificar el estado de la suscripción de un usuario (ej. de 'inactive' a 'active').

---

## **4. Guía de Estilo y Diseño (UI/UX)**

*   **Paleta de Colores:**
    *   **Primario:** Azul saturado (`#29ABE2`). Usar para elementos principales, botones de acción y enlaces.
    *   **Fondo de Página:** Azul claro, desaturado (`#D0EBF7`).
    *   **Acento:** Naranja contrastante (`#E28729`). Usar para CTAs importantes y elementos a destacar.
*   **Tipografía:**
    *   **Títulos y Encabezados:** `Poppins` (sans-serif), para un look moderno y legible.
    *   **Cuerpo de Texto:** `PT Sans` (sans-serif), para una lectura cómoda.
*   **Layout y Componentes:**
    *   Diseño limpio, minimalista y bien estructurado.
    *   Uso intensivo del componente `Card` de ShadCN para agrupar información.
    *   Utilizar esquinas redondeadas y sombras sutiles para dar profundidad y un aspecto profesional.
    *   Los iconos deben ser de la librería `lucide-react`, manteniendo la consistencia.
*   **Experiencia de Usuario (UX):**
    *   La navegación debe ser intuitiva. La barra de navegación principal debe ser fija en la parte superior.
    *   Las acciones de carga deben mostrar indicadores (`Loader2` animado).
    *   Los errores y notificaciones de éxito deben comunicarse a través de componentes `Toast`.
    *   Las acciones destructivas (eliminar) deben requerir confirmación a través de un `AlertDialog`.

---
## **5. Flujo del Prompt de IA (Ejemplo para `generateSession`)**

**System Prompt:** `You are FutsalDex AI, an expert futsal coach... Your task is to design a complete, coherent, and effective training session based on the user's requirements.`

**User Input (structured via Genkit):**
*   `teamDescription`: "Equipo cadete (14-15 años), nivel intermedio..."
*   `trainingGoals`: "Mejorar la velocidad de circulación del balón..."
*   `sessionFocus`: "Transiciones ataque-defensa"
*   `preferredSessionLengthMinutes`: 90

**Expected Output (structured via Zod schema):**
```json
{
  "warmUp": "Descripción detallada del ejercicio de calentamiento...",
  "mainExercises": [
    "Descripción detallada del ejercicio principal 1...",
    "Descripción detallada del ejercicio principal 2..."
  ],
  "coolDown": "Descripción detallada del ejercicio de vuelta a la calma...",
  "coachNotes": "Notas generales y puntos clave para el entrenador..."
}
```

