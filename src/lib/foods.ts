/** Single items (not dishes) for one-tap logging. Amounts are typical servings. */

export type QuickFoodGroup = 'fruit' | 'drink' | 'snack' | 'staple'

export interface QuickFood {
  id: string
  group: QuickFoodGroup
  name: string
  nameEs: string
  detail: string
  detailEs: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export const QUICK_FOOD_GROUPS: { id: QuickFoodGroup | 'all'; label: string; labelEs: string }[] = [
  { id: 'all', label: 'All', labelEs: 'Todo' },
  { id: 'fruit', label: 'Fruit', labelEs: 'Fruta' },
  { id: 'drink', label: 'Drinks', labelEs: 'Bebidas' },
  { id: 'snack', label: 'Snacks', labelEs: 'Snacks' },
  { id: 'staple', label: 'Staples', labelEs: 'Básicos' },
]

export const QUICK_FOODS: QuickFood[] = [
  // —— fruit (typical piece or cup) ——
  { id: 'apple', group: 'fruit', name: 'Apple', nameEs: 'Manzana', detail: '1 medium (182g)', detailEs: '1 mediana (182 g)', kcal: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { id: 'banana', group: 'fruit', name: 'Banana', nameEs: 'Plátano', detail: '1 medium (118g)', detailEs: '1 mediano (118 g)', kcal: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { id: 'orange', group: 'fruit', name: 'Orange', nameEs: 'Naranja', detail: '1 medium (131g)', detailEs: '1 mediana (131 g)', kcal: 62, protein: 1.2, carbs: 15.4, fat: 0.2 },
  { id: 'pear', group: 'fruit', name: 'Pear', nameEs: 'Pera', detail: '1 medium (178g)', detailEs: '1 mediana (178 g)', kcal: 101, protein: 0.6, carbs: 27, fat: 0.2 },
  { id: 'grapes', group: 'fruit', name: 'Grapes', nameEs: 'Uvas', detail: '1 cup (150g)', detailEs: '1 taza (150 g)', kcal: 104, protein: 1.1, carbs: 27.3, fat: 0.2 },
  { id: 'strawberries', group: 'fruit', name: 'Strawberries', nameEs: 'Fresas', detail: '1 cup (152g)', detailEs: '1 taza (152 g)', kcal: 49, protein: 1, carbs: 11.7, fat: 0.5 },
  { id: 'blueberries', group: 'fruit', name: 'Blueberries', nameEs: 'Arándanos', detail: '1 cup (148g)', detailEs: '1 taza (148 g)', kcal: 84, protein: 1.1, carbs: 21.4, fat: 0.5 },
  { id: 'watermelon', group: 'fruit', name: 'Watermelon', nameEs: 'Sandía', detail: '1 cup (152g)', detailEs: '1 taza (152 g)', kcal: 46, protein: 0.9, carbs: 11.6, fat: 0.2 },
  { id: 'mango', group: 'fruit', name: 'Mango', nameEs: 'Mango', detail: '½ fruit (165g)', detailEs: '½ pieza (165 g)', kcal: 99, protein: 1.4, carbs: 24.7, fat: 0.6 },
  { id: 'pineapple', group: 'fruit', name: 'Pineapple', nameEs: 'Piña', detail: '1 cup (165g)', detailEs: '1 taza (165 g)', kcal: 82, protein: 0.9, carbs: 21.6, fat: 0.2 },
  { id: 'peach', group: 'fruit', name: 'Peach', nameEs: 'Durazno', detail: '1 medium (150g)', detailEs: '1 mediano (150 g)', kcal: 59, protein: 1.4, carbs: 14, fat: 0.4 },
  { id: 'kiwi', group: 'fruit', name: 'Kiwi', nameEs: 'Kiwi', detail: '1 fruit (69g)', detailEs: '1 pieza (69 g)', kcal: 42, protein: 0.8, carbs: 10, fat: 0.4 },
  { id: 'grapefruit', group: 'fruit', name: 'Grapefruit', nameEs: 'Toronja', detail: '½ fruit (123g)', detailEs: '½ pieza (123 g)', kcal: 52, protein: 0.9, carbs: 13, fat: 0.2 },
  { id: 'papaya', group: 'fruit', name: 'Papaya', nameEs: 'Papaya', detail: '1 cup (145g)', detailEs: '1 taza (145 g)', kcal: 62, protein: 0.7, carbs: 16, fat: 0.4 },
  { id: 'avocado', group: 'fruit', name: 'Avocado', nameEs: 'Aguacate', detail: '½ medium (68g)', detailEs: '½ mediano (68 g)', kcal: 109, protein: 1.4, carbs: 5.8, fat: 10 },
  { id: 'dates', group: 'fruit', name: 'Dates', nameEs: 'Dátiles', detail: '2 pieces (48g)', detailEs: '2 piezas (48 g)', kcal: 133, protein: 0.9, carbs: 36, fat: 0.2 },

  // —— drinks (typical glass / cup) ——
  { id: 'water', group: 'drink', name: 'Water', nameEs: 'Agua', detail: '1 glass (250ml)', detailEs: '1 vaso (250 ml)', kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { id: 'sparkling-water', group: 'drink', name: 'Sparkling water', nameEs: 'Agua mineral', detail: '1 glass (250ml)', detailEs: '1 vaso (250 ml)', kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { id: 'black-coffee', group: 'drink', name: 'Black coffee', nameEs: 'Café negro', detail: '1 cup (240ml)', detailEs: '1 taza (240 ml)', kcal: 2, protein: 0.3, carbs: 0, fat: 0 },
  { id: 'espresso', group: 'drink', name: 'Espresso', nameEs: 'Espresso', detail: '1 shot (30ml)', detailEs: '1 shot (30 ml)', kcal: 3, protein: 0.1, carbs: 0.5, fat: 0.1 },
  { id: 'americano', group: 'drink', name: 'Americano', nameEs: 'Americano', detail: '1 cup (240ml)', detailEs: '1 taza (240 ml)', kcal: 5, protein: 0.3, carbs: 0.8, fat: 0.1 },
  { id: 'latte', group: 'drink', name: 'Latte', nameEs: 'Latte', detail: '1 small, whole milk (240ml)', detailEs: '1 chico, leche entera (240 ml)', kcal: 112, protein: 5.8, carbs: 8.6, fat: 5.9 },
  { id: 'cappuccino', group: 'drink', name: 'Cappuccino', nameEs: 'Capuchino', detail: '1 cup (180ml)', detailEs: '1 taza (180 ml)', kcal: 74, protein: 4, carbs: 5.8, fat: 4 },
  { id: 'black-tea', group: 'drink', name: 'Black tea', nameEs: 'Té negro', detail: '1 cup, unsweetened (240ml)', detailEs: '1 taza, sin azúcar (240 ml)', kcal: 2, protein: 0, carbs: 0.7, fat: 0 },
  { id: 'green-tea', group: 'drink', name: 'Green tea', nameEs: 'Té verde', detail: '1 cup, unsweetened (240ml)', detailEs: '1 taza, sin azúcar (240 ml)', kcal: 2, protein: 0.2, carbs: 0, fat: 0 },
  { id: 'herbal-tea', group: 'drink', name: 'Herbal tea', nameEs: 'Té de hierbas', detail: '1 cup, unsweetened (240ml)', detailEs: '1 taza, sin azúcar (240 ml)', kcal: 2, protein: 0, carbs: 0.5, fat: 0 },
  { id: 'milk', group: 'drink', name: 'Whole milk', nameEs: 'Leche entera', detail: '1 cup (240ml)', detailEs: '1 taza (240 ml)', kcal: 149, protein: 7.7, carbs: 11.7, fat: 7.9 },
  { id: 'skim-milk', group: 'drink', name: 'Skim milk', nameEs: 'Leche descremada', detail: '1 cup (240ml)', detailEs: '1 taza (240 ml)', kcal: 83, protein: 8.3, carbs: 12.2, fat: 0.2 },
  { id: 'almond-milk', group: 'drink', name: 'Almond milk', nameEs: 'Leche de almendra', detail: '1 cup, unsweetened (240ml)', detailEs: '1 taza, sin azúcar (240 ml)', kcal: 37, protein: 1.4, carbs: 1.4, fat: 2.7 },
  { id: 'orange-juice', group: 'drink', name: 'Orange juice', nameEs: 'Jugo de naranja', detail: '1 cup (240ml)', detailEs: '1 vaso (240 ml)', kcal: 112, protein: 1.7, carbs: 25.8, fat: 0.5 },
  { id: 'apple-juice', group: 'drink', name: 'Apple juice', nameEs: 'Jugo de manzana', detail: '1 cup (240ml)', detailEs: '1 vaso (240 ml)', kcal: 114, protein: 0.2, carbs: 28, fat: 0.3 },
  { id: 'coconut-water', group: 'drink', name: 'Coconut water', nameEs: 'Agua de coco', detail: '1 cup (240ml)', detailEs: '1 vaso (240 ml)', kcal: 46, protein: 1.7, carbs: 8.9, fat: 0.5 },
  { id: 'jamaica', group: 'drink', name: 'Hibiscus water', nameEs: 'Agua de jamaica', detail: '1 glass, lightly sweet (240ml)', detailEs: '1 vaso, poco dulce (240 ml)', kcal: 90, protein: 0.2, carbs: 22, fat: 0 },
  { id: 'horchata-glass', group: 'drink', name: 'Horchata', nameEs: 'Horchata', detail: '1 glass (240ml)', detailEs: '1 vaso (240 ml)', kcal: 130, protein: 2, carbs: 24, fat: 2.5 },
  { id: 'cola', group: 'drink', name: 'Cola', nameEs: 'Refresco de cola', detail: '1 can (355ml)', detailEs: '1 lata (355 ml)', kcal: 140, protein: 0, carbs: 39, fat: 0 },
  { id: 'diet-cola', group: 'drink', name: 'Diet cola', nameEs: 'Refresco de dieta', detail: '1 can (355ml)', detailEs: '1 lata (355 ml)', kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { id: 'beer', group: 'drink', name: 'Beer', nameEs: 'Cerveza', detail: '1 can (355ml)', detailEs: '1 lata (355 ml)', kcal: 153, protein: 1.6, carbs: 13, fat: 0 },
  { id: 'red-wine', group: 'drink', name: 'Red wine', nameEs: 'Vino tinto', detail: '1 glass (150ml)', detailEs: '1 copa (150 ml)', kcal: 125, protein: 0.1, carbs: 3.8, fat: 0 },
  { id: 'protein-shake', group: 'drink', name: 'Protein shake', nameEs: 'Batido de proteína', detail: '1 scoop + water', detailEs: '1 scoop + agua', kcal: 120, protein: 24, carbs: 3, fat: 1.5 },

  // —— snacks ——
  { id: 'almonds', group: 'snack', name: 'Almonds', nameEs: 'Almendras', detail: '1 handful (28g)', detailEs: '1 puñado (28 g)', kcal: 164, protein: 6, carbs: 6.1, fat: 14.2 },
  { id: 'peanuts', group: 'snack', name: 'Peanuts', nameEs: 'Cacahuates', detail: '1 handful (28g)', detailEs: '1 puñado (28 g)', kcal: 161, protein: 7.3, carbs: 4.6, fat: 14 },
  { id: 'dark-chocolate', group: 'snack', name: 'Dark chocolate', nameEs: 'Chocolate amargo', detail: '2 squares (20g)', detailEs: '2 tablillas (20 g)', kcal: 120, protein: 1.6, carbs: 9.2, fat: 8.6 },
  { id: 'popcorn', group: 'snack', name: 'Popcorn', nameEs: 'Palomitas', detail: '3 cups air-popped (24g)', detailEs: '3 tazas al aire (24 g)', kcal: 93, protein: 3, carbs: 18.6, fat: 1.1 },
  { id: 'cheddar', group: 'snack', name: 'Cheddar', nameEs: 'Queso cheddar', detail: '1 oz (28g)', detailEs: '28 g', kcal: 113, protein: 7, carbs: 0.4, fat: 9.3 },
  { id: 'yogurt', group: 'snack', name: 'Greek yogurt', nameEs: 'Yogur griego', detail: '150g plain 2%', detailEs: '150 g natural 2%', kcal: 109, protein: 15, carbs: 5.9, fat: 2.9 },

  // —— staples ——
  { id: 'egg', group: 'staple', name: 'Egg', nameEs: 'Huevo', detail: '1 large (50g)', detailEs: '1 grande (50 g)', kcal: 72, protein: 6.3, carbs: 0.4, fat: 4.8 },
  { id: 'chicken-breast', group: 'staple', name: 'Chicken breast', nameEs: 'Pechuga de pollo', detail: '100g cooked', detailEs: '100 g cocida', kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: 'brown-rice', group: 'staple', name: 'Brown rice', nameEs: 'Arroz integral', detail: '100g cooked', detailEs: '100 g cocido', kcal: 123, protein: 2.7, carbs: 25.6, fat: 1 },
  { id: 'oats', group: 'staple', name: 'Oats', nameEs: 'Avena', detail: '40g dry', detailEs: '40 g en seco', kcal: 156, protein: 6.8, carbs: 26.6, fat: 2.8 },
  { id: 'salmon', group: 'staple', name: 'Salmon', nameEs: 'Salmón', detail: '100g cooked', detailEs: '100 g cocido', kcal: 206, protein: 22, carbs: 0, fat: 12 },
  { id: 'olive-oil', group: 'staple', name: 'Olive oil', nameEs: 'Aceite de oliva', detail: '1 tsp (4.5g)', detailEs: '1 cdita (4.5 g)', kcal: 40, protein: 0, carbs: 0, fat: 4.5 },
  { id: 'bread', group: 'staple', name: 'Whole wheat bread', nameEs: 'Pan integral', detail: '1 slice (32g)', detailEs: '1 rebanada (32 g)', kcal: 81, protein: 4, carbs: 13.7, fat: 1.1 },
]
