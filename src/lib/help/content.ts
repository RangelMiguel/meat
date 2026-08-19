import type { Locale } from '../../i18n'
import type { View } from '../../types'

export type HelpBullet = {
  title: string
  body: string
}

export type HelpSection = {
  id: string
  title: string
  summary: string
  paragraphs: string[]
  bullets?: HelpBullet[]
  tips?: string[]
  view?: View
}

export type HelpGroup = {
  id: string
  title: string
  description: string
  sections: HelpSection[]
}

export type HelpContent = {
  intro: string
  groups: HelpGroup[]
}

const en: HelpContent = {
  intro:
    'This guide explains every screen in Meat. Use it as the household kitchen manual—from logging a meal to sending a shop to Finance. Some items only appear after you install them from Marketplace.',
  groups: [
    {
      id: 'start',
      title: 'Getting started',
      description: 'What Meat is, how you sign in, and how a household works.',
      sections: [
        {
          id: 'overview',
          title: 'What is Meat?',
          summary: 'A household kitchen for calories, recipes, inventory, and shopping.',
          paragraphs: [
            'Meat is the meals and kitchen app for the household. Each person has their own calorie plan and food log. The kitchen—recipes, inventory, and the shopping list—is shared.',
            'It sits next to Finance. When you mark a shop as bought, Meat can post what you spent as an expense there.',
            'Use the Apps button at the top right to jump to Finance if the URL is set in Settings.',
          ],
        },
        {
          id: 'navigation',
          title: 'Menu, language, and session',
          summary: 'Sidebar, ES/EN, and sign out.',
          paragraphs: [
            'The sidebar lists the screens you can open. On a phone, use the menu button in the top bar.',
            'At the bottom of the sidebar you can switch language (EN / ES). Sign out ends this device’s session.',
            'Week, Exercise, and History stay hidden until you install those modules in Marketplace.',
          ],
          tips: [
            'If a menu item is missing, open Marketplace and install that module. Your data stays if you remove it later.',
          ],
        },
        {
          id: 'passkeys',
          title: 'Signing in with passkeys',
          summary: 'Face ID, fingerprint, or a security key—no password.',
          paragraphs: [
            'You create an account with email and a passkey on this device. That is how you sign in later.',
            'You can add more passkeys in Settings if you use another phone or computer.',
            'There is no password reset. If you lose every passkey, you need a new invite from the household.',
          ],
          view: 'settings',
        },
        {
          id: 'household',
          title: 'Family and household',
          summary: 'Shared kitchen, separate calorie plans.',
          paragraphs: [
            'You can stay solo or create a household. Everyone in the household shares recipes, inventory, and the shopping list.',
            'Each person still has their own plan, daily log, weight, water, and exercise.',
            'Invite others from Settings with a link. They join with their own passkey.',
          ],
          view: 'settings',
          tips: ['Cooking a recipe can log portions for more than one person at once.'],
        },
      ],
    },
    {
      id: 'daily',
      title: 'Day to day',
      description: 'Log food, set a plan, cook, and shop.',
      sections: [
        {
          id: 'today',
          title: 'Today',
          summary: 'Food log, water, and remaining calories for the day.',
          view: 'today',
          paragraphs: [
            'Today is the landing screen. It shows what you have eaten against your plan, plus water, a weigh-in, and exercise if those are in use.',
            'Log a catalog recipe, a custom snack, or type calories by hand. You can also scan a package barcode to fill macros.',
            'When you cook from a recipe, Meat can deduct ingredients from inventory and split the meal across people.',
          ],
          tips: [
            'Scan a barcode when you can—the numbers come from Open Food Facts, not a guess.',
            'If there is no plan yet, start on Plan so Today has a target.',
          ],
        },
        {
          id: 'plan',
          title: 'Plan',
          summary: 'Personal calorie target from a five-step pace slider.',
          view: 'plan',
          paragraphs: [
            'The plan is personal. Enter age, height, weight, and activity, then choose a pace: lose weight fast, lose weight, maintain, gain weight, or gain weight fast.',
            'Meat turns that into daily calories and protein / carbs / fat. You can edit someone else’s plan if you are in the same household.',
            'After you save a plan, you can pick meals for the week if that module is installed.',
          ],
        },
        {
          id: 'progress',
          title: 'Progress',
          summary: 'Weigh-ins, a trend graph, and when to change calories.',
          view: 'progress',
          paragraphs: [
            'Log your weight once a day. The same morning scale is best. Logging again on that day updates the number.',
            'The graph shows the logged trend against the weekly change in your plan. Day-to-day swings of 0.5–1 kg from water and salt are normal.',
            'After about two weeks, Meat can tell if you are losing or gaining too slowly and offer a lower or higher calorie target. If your current weight is well off the weight stored in the plan, it will offer to recalculate BMR and intake.',
          ],
          tips: [
            'The first time you save a plan, that starting weight is logged automatically.',
            'Applying a recommendation updates that person’s plan. Food history stays.',
          ],
        },
        {
          id: 'recipes',
          title: 'Recipes',
          summary: 'Catalog dishes plus household recipes and packaged snacks.',
          view: 'recipes',
          paragraphs: [
            'Browse the built-in catalog or add household recipes. Amounts are in grams (or ml for liquids).',
            'Export a JSON pack to share dishes, or import one to add more. You can export all household recipes or just the one you are viewing.',
            'Packaged snacks (chips, Gansito, yogurt) can be saved as one-serving recipes so they are easy to log later.',
          ],
          tips: ['Ask the assistant to create or edit a recipe if you do not want to fill the form.'],
        },
        {
          id: 'inventory',
          title: 'Inventory',
          summary: 'What is already in the kitchen.',
          view: 'inventory',
          paragraphs: [
            'Inventory is shared. Add grams of a catalog ingredient or a household snack when you put food away.',
            'Cooking and completing a shop both update these lots. Use it so the week planner only asks you to buy what you are short on.',
          ],
        },
        {
          id: 'purchase',
          title: 'Purchase',
          summary: 'Shopping list, then mark the shop bought.',
          view: 'purchase',
          paragraphs: [
            'The purchase list is what you still need. Add items by hand or let the week planner fill it from planned meals minus inventory.',
            'When you mark the shop complete, those items move into inventory. If Finance is connected, Meat asks how much you spent and posts that expense.',
            'You can finish the shop without sending money if Finance is down or you want to log the spend later.',
          ],
          tips: ['Set the Finance URL and key in Settings, then use Test connection before the first shop.'],
        },
      ],
    },
    {
      id: 'extras',
      title: 'Extra modules',
      description: 'Install only what the household wants.',
      sections: [
        {
          id: 'marketplace',
          title: 'Marketplace',
          summary: 'Install or remove Week, Exercise, and History.',
          view: 'marketplace',
          paragraphs: [
            'Core screens (Today, Plan, Progress, Recipes, Inventory, Purchase, Settings, AI, Help) are always there.',
            'Week planner, Exercise, and History are add-ons. Install them here so they appear in the menu.',
            'Removing a module hides it. The data stays, so installing it again brings the screen back.',
          ],
        },
        {
          id: 'week',
          title: 'Week planner',
          summary: 'Pick meals, compute the shop, and pack the fridge.',
          view: 'week',
          paragraphs: [
            'Choose dishes for each day and meal. Meat sizes portions from each person’s plan.',
            'It then builds a shopping list minus what is already in inventory, and tells you what belongs in the fridge versus freezer bags.',
            'You can add a planned meal to the list without wiping the rest of the week.',
          ],
        },
        {
          id: 'exercise',
          title: 'Exercise',
          summary: 'Log workouts that raise today’s calorie budget.',
          view: 'exercise',
          paragraphs: [
            'Log minutes and an activity type. Calories can be entered or estimated.',
            'Burned calories raise the household total shown against today’s food.',
          ],
        },
        {
          id: 'history',
          title: 'History',
          summary: 'Past days of food and activity.',
          view: 'history',
          paragraphs: [
            'Look back at previous logs when you want to compare weeks or fix a missed day.',
          ],
        },
      ],
    },
    {
      id: 'connect',
      title: 'Connections and assistant',
      description: 'Finance, AI, and product nutrition.',
      sections: [
        {
          id: 'finance',
          title: 'Finance',
          summary: 'Send a completed shop as a household expense.',
          view: 'settings',
          paragraphs: [
            'In Finance, an admin generates a Meat connection key and picks the paying account or card and a category.',
            'In Meat → Settings, paste the Finance URL and that key, then test the connection.',
            'After a shop, enter what you paid. Meat posts the expense; the groceries still go into inventory even if the send fails.',
          ],
          tips: ['The Apps menu needs the Finance URL (or the URL saved on this connection) to open Finance.'],
        },
        {
          id: 'ai',
          title: 'Assistant',
          summary: 'Ask about the kitchen, or tell it to change recipes and logs.',
          view: 'ai',
          paragraphs: [
            'The assistant uses the provider and key you set in Settings (or a family-shared key). Each person still accepts the privacy notice.',
            'The first question in a chat sends a kitchen snapshot. Later turns do not repeat it—the assistant looks things up with tools instead.',
            'It can search recipes, log food, update inventory, add to the shopping list, and save packaged snacks. It will not pretend it saved something it did not.',
          ],
          tips: [
            'Personal names, emails, phones, and keys are stripped before anything is sent to the model.',
            'For store products, the assistant searches Open Food Facts before guessing calories.',
          ],
        },
        {
          id: 'off',
          title: 'Open Food Facts',
          summary: 'Label nutrition for packaged foods and barcodes.',
          paragraphs: [
            'Barcode scan on Today and the assistant’s product lookup use Open Food Facts as the source for packaged-food nutrition.',
            'You get serving, 100g, and package values when the database has them. If there is no match, the assistant may estimate and will say so.',
          ],
          view: 'today',
        },
      ],
    },
  ],
}

const es: HelpContent = {
  intro:
    'Esta guía explica cada pantalla de Meat. Úsala como manual de la cocina del hogar: desde registrar una comida hasta enviar la compra a Finance. Algunas opciones solo aparecen si instalas el módulo en Marketplace.',
  groups: [
    {
      id: 'start',
      title: 'Primeros pasos',
      description: 'Qué es Meat, cómo entras y cómo funciona el hogar.',
      sections: [
        {
          id: 'overview',
          title: '¿Qué es Meat?',
          summary: 'La cocina del hogar: calorías, recetas, inventario y compras.',
          paragraphs: [
            'Meat es la app de comidas y cocina del hogar. Cada persona tiene su plan de calorías y su registro. La cocina—recetas, inventario y lista de compras—se comparte.',
            'Va junto a Finance. Cuando marcas una compra como hecha, Meat puede registrar lo que gastaste como un gasto allá.',
            'El botón de Apps arriba a la derecha abre Finance si la URL está en Ajustes.',
          ],
        },
        {
          id: 'navigation',
          title: 'Menú, idioma y sesión',
          summary: 'Barra lateral, ES/EN y cerrar sesión.',
          paragraphs: [
            'La barra lateral lista las pantallas. En el teléfono se abre con el botón de menú de arriba.',
            'Abajo puedes cambiar el idioma (EN / ES). Cerrar sesión termina la sesión de este dispositivo.',
            'Semana, Ejercicio e Historial se ocultan hasta que instalas esos módulos en Marketplace.',
          ],
          tips: [
            'Si falta un ítem del menú, ábrelo en Marketplace e instálalo. Los datos se quedan si luego lo quitas.',
          ],
        },
        {
          id: 'passkeys',
          title: 'Entrar con llaves de acceso',
          summary: 'Face ID, huella o llave de seguridad—sin contraseña.',
          paragraphs: [
            'Creas la cuenta con correo y una llave de acceso en este dispositivo. Así entras después.',
            'Puedes agregar más llaves en Ajustes si usas otro teléfono o computadora.',
            'No hay restablecer contraseña. Si pierdes todas las llaves, necesitas una nueva invitación del hogar.',
          ],
          view: 'settings',
        },
        {
          id: 'household',
          title: 'Familia y hogar',
          summary: 'Cocina compartida, planes de calorías por persona.',
          paragraphs: [
            'Puedes seguir solo o crear un hogar. Quienes están en el hogar comparten recetas, inventario y la lista de compras.',
            'Cada persona sigue teniendo su plan, registro del día, peso, agua y ejercicio.',
            'Invita desde Ajustes con un enlace. Entran con su propia llave de acceso.',
          ],
          view: 'settings',
          tips: ['Al cocinar una receta puedes registrar porciones para varias personas a la vez.'],
        },
      ],
    },
    {
      id: 'daily',
      title: 'Día a día',
      description: 'Registra comida, arma el plan, cocina y compra.',
      sections: [
        {
          id: 'today',
          title: 'Hoy',
          summary: 'Registro, agua y calorías que quedan en el día.',
          view: 'today',
          paragraphs: [
            'Hoy es la pantalla de entrada. Muestra lo que comiste frente a tu plan, más agua, el peso del día y ejercicio si los usas.',
            'Registra una receta del catálogo, un snack o escribe las calorías a mano. También puedes escanear el código de barras del paquete.',
            'Al cocinar, Meat puede descontar ingredientes del inventario y repartir el platillo entre personas.',
          ],
          tips: [
            'Escanea el código cuando puedas: los números vienen de Open Food Facts, no de una estimación.',
            'Si aún no hay plan, empieza en Plan para que Hoy tenga una meta.',
          ],
        },
        {
          id: 'plan',
          title: 'Plan',
          summary: 'Meta personal de calorías con un control de cinco ritmos.',
          view: 'plan',
          paragraphs: [
            'El plan es personal. Pon edad, estatura, peso y actividad, y elige un ritmo: bajar rápido, bajar, mantener, subir o subir rápido.',
            'Meat lo convierte en calorías del día y proteína / carbos / grasa. Puedes editar el plan de otra persona del mismo hogar.',
            'Después de guardar, puedes elegir comidas de la semana si ese módulo está instalado.',
          ],
        },
        {
          id: 'progress',
          title: 'Progreso',
          summary: 'Pesajes, gráfica de tendencia y cuándo cambiar las calorías.',
          view: 'progress',
          paragraphs: [
            'Registra el peso una vez al día. Mejor a la misma hora, por la mañana. Si vuelves a guardar ese día, se actualiza el número.',
            'La gráfica compara la tendencia registrada con el cambio semanal de tu plan. Subidas y bajadas de 0.5–1 kg por agua y sal son normales.',
            'Tras unas dos semanas, Meat puede ver si bajas o subes demasiado lento y ofrecer una meta de calorías más baja o más alta. Si tu peso actual se alejó del peso guardado en el plan, ofrece recalcular el BMR y las calorías.',
          ],
          tips: [
            'La primera vez que guardas un plan, ese peso inicial se registra solo.',
            'Aplicar una recomendación actualiza el plan de esa persona. El historial de comida se queda.',
          ],
        },
        {
          id: 'recipes',
          title: 'Recetas',
          summary: 'Catálogo, recetas del hogar y snacks empaquetados.',
          view: 'recipes',
          paragraphs: [
            'Revisa el catálogo o agrega recetas del hogar. Las cantidades van en gramos (o ml en líquidos).',
            'Exporta un paquete JSON para compartir platillos, o importa uno para agregar más. Puedes exportar todas las del hogar o solo la que estás viendo.',
            'Los snacks empaquetados (papas, Gansito, yogurt) se pueden guardar como receta de una porción para registrarlos después.',
          ],
          tips: ['Pídele al asistente que cree o edite una receta si no quieres llenar el formulario.'],
        },
        {
          id: 'inventory',
          title: 'Inventario',
          summary: 'Lo que ya hay en la cocina.',
          view: 'inventory',
          paragraphs: [
            'El inventario se comparte. Agrega gramos de un ingrediente o snack cuando guardes comida.',
            'Cocinar y completar una compra actualizan estos lotes. Así el plan semanal solo pide lo que falta.',
          ],
        },
        {
          id: 'purchase',
          title: 'Compras',
          summary: 'Lista de compras y marcar el súper como hecho.',
          view: 'purchase',
          paragraphs: [
            'La lista es lo que aún falta. Agrégala a mano o deja que el plan semanal la arme con las comidas menos el inventario.',
            'Al marcar la compra como hecha, esos artículos pasan al inventario. Si Finance está conectado, Meat pregunta cuánto pagaste y registra el gasto.',
            'Puedes terminar la compra sin enviar el dinero si Finance no responde o quieres registrarlo después.',
          ],
          tips: ['Pon la URL y la llave de Finance en Ajustes y usa Probar conexión antes de la primera compra.'],
        },
      ],
    },
    {
      id: 'extras',
      title: 'Módulos extra',
      description: 'Instala solo lo que el hogar quiere.',
      sections: [
        {
          id: 'marketplace',
          title: 'Marketplace',
          summary: 'Instala o quita Semana, Ejercicio e Historial.',
          view: 'marketplace',
          paragraphs: [
            'Las pantallas base (Hoy, Plan, Progreso, Recetas, Inventario, Compras, Ajustes, IA, Ayuda) siempre están.',
            'Semana, Ejercicio e Historial son extras. Instálalos aquí para que aparezcan en el menú.',
            'Quitar un módulo lo oculta. Los datos se quedan, así que al instalarlo otra vez vuelve la pantalla.',
          ],
        },
        {
          id: 'week',
          title: 'Plan semanal',
          summary: 'Elige comidas, calcula la compra y empaca el refri.',
          view: 'week',
          paragraphs: [
            'Elige platillos por día y comida. Meat ajusta las porciones con el plan de cada persona.',
            'Luego arma la lista de compras menos lo que ya hay, y te dice qué va al refrigerador y qué en bolsas al congelador.',
            'Puedes agregar una comida a la semana sin borrar el resto.',
          ],
        },
        {
          id: 'exercise',
          title: 'Ejercicio',
          summary: 'Registra entrenamientos que suben el presupuesto del día.',
          view: 'exercise',
          paragraphs: [
            'Anota minutos y el tipo de actividad. Las calorías se escriben o se estiman.',
            'Lo quemado suma al total del hogar frente a la comida de hoy.',
          ],
        },
        {
          id: 'history',
          title: 'Historial',
          summary: 'Días anteriores de comida y actividad.',
          view: 'history',
          paragraphs: [
            'Revisa registros pasados para comparar semanas o corregir un día que se te pasó.',
          ],
        },
      ],
    },
    {
      id: 'connect',
      title: 'Conexiones y asistente',
      description: 'Finance, IA y nutrición de productos.',
      sections: [
        {
          id: 'finance',
          title: 'Finance',
          summary: 'Enviar la compra hecha como gasto del hogar.',
          view: 'settings',
          paragraphs: [
            'En Finance, un admin genera una llave de conexión Meat y elige la cuenta o tarjeta que paga y una categoría.',
            'En Meat → Ajustes pega la URL de Finance y esa llave, y prueba la conexión.',
            'Después de la compra, escribe lo que pagaste. Meat registra el gasto; la despensa se actualiza aunque el envío falle.',
          ],
          tips: ['El menú de Apps necesita la URL de Finance (o la guardada en esta conexión) para abrirla.'],
        },
        {
          id: 'ai',
          title: 'Asistente',
          summary: 'Pregunta por la cocina, o dile que cambie recetas y registros.',
          view: 'ai',
          paragraphs: [
            'El asistente usa el proveedor y la llave que pones en Ajustes (o la llave compartida de la familia). Cada persona acepta el aviso de privacidad.',
            'La primera pregunta de un chat envía un resumen de la cocina. Los turnos siguientes no lo repiten: el asistente consulta con herramientas.',
            'Puede buscar recetas, registrar comida, actualizar inventario, agregar a la lista y guardar snacks. No finge que guardó algo si no lo hizo.',
          ],
          tips: [
            'Nombres, correos, teléfonos y llaves se quitan antes de enviar nada al modelo.',
            'Para productos de tienda, el asistente busca en Open Food Facts antes de adivinar calorías.',
          ],
        },
        {
          id: 'off',
          title: 'Open Food Facts',
          summary: 'Nutrición de etiqueta para empaquetados y códigos de barras.',
          paragraphs: [
            'El escaneo en Hoy y la búsqueda de productos del asistente usan Open Food Facts como fuente de nutrición empaquetada.',
            'Obtienes porción, 100 g y paquete cuando la base los tiene. Si no hay coincidencia, el asistente puede estimar y lo dice.',
          ],
          view: 'today',
        },
      ],
    },
  ],
}

export function getHelpContent(locale: Locale): HelpContent {
  return locale === 'es' ? es : en
}
