/** Default preparation steps for catalog recipes. User edits can override these. */
export const RECIPE_STEPS: Record<string, string[]> = {
  'tacos-al-pastor': [
    'Blend dried chiles with achiote, garlic, onion, orange juice, vinegar, and spices into a marinade.',
    'Slice pork thin, coat in the marinade, and rest at least 2 hours (overnight is better).',
    'Cook the pork on a hot grill or skillet until edges char and the meat is cooked through.',
    'Warm corn tortillas and fill with pork, pineapple, onion, cilantro, and lime.',
  ],
  guacamole: [
    'Halve and pit the avocados, then mash in a bowl, leaving some chunks.',
    'Stir in minced onion, tomato, chile, cilantro, garlic, lime, and salt.',
    'Taste and adjust lime and salt. Serve right away.',
  ],
  'chiles-rellenos': [
    'Roast poblanos until blistered, steam in a bag, then peel and seed carefully.',
    'Stuff each chile with cheese and close with a toothpick if needed.',
    'Dust with flour, dip in whipped egg batter, and fry in oil until golden.',
    'Simmer a quick tomato-onion sauce and spoon it over the chiles.',
  ],
  'pozole-rojo': [
    'Simmer pork with onion, garlic, and salt until tender; skim the broth.',
    'Toast and soak guajillo and ancho chiles, then blend into a smooth red sauce.',
    'Strain the sauce into the pot with drained hominy and simmer 30–40 minutes.',
    'Serve in bowls with cabbage, radish, onion, lime, and oregano.',
  ],
  'enchiladas-verdes': [
    'Boil or roast tomatillos, serrano, onion, and garlic; blend with cilantro and salt.',
    'Simmer the salsa briefly. Warm tortillas so they are pliable.',
    'Fill tortillas with shredded chicken, roll, and arrange in a dish.',
    'Cover with salsa verde, crema, and cheese. Heat through and serve.',
  ],
  'mole-poblano': [
    'Toast dried chiles, nuts, seeds, spices, and bread separately so nothing burns.',
    'Blend everything with tomato, onion, garlic, chocolate, and broth until very smooth.',
    'Fry the sauce in oil, then simmer slowly, thinning with broth, until thick and glossy.',
    'Season with salt and a little sugar. Serve over cooked chicken with sesame seeds.',
  ],
  'huevos-rancheros': [
    'Blend tomato, onion, garlic, and jalapeño into a ranchero salsa and simmer.',
    'Lightly fry corn tortillas so they stay soft in the center.',
    'Fry eggs sunny-side up. Plate tortillas, salsa, then eggs.',
    'Finish with cilantro and optional beans or cheese.',
  ],
  'frijoles-refritos': [
    'Soften onion and garlic in lard or oil.',
    'Add cooked pinto beans and a splash of their liquid.',
    'Mash while they fry until thick and creamy. Season with salt.',
  ],
  'arroz-a-la-mexicana': [
    'Rinse rice and fry it in oil until it turns milky-gold.',
    'Blend tomato with onion and garlic; pour into the pot and cook off the raw taste.',
    'Add broth, salt, and optional vegetables. Cover and simmer until the liquid is absorbed.',
    'Rest 5 minutes off heat, then fluff.',
  ],
  carnitas: [
    'Cut pork into large chunks and season with salt.',
    'Cook slowly in lard (or a mix of lard and a little liquid) with onion, garlic, orange, and herbs until fork-tender.',
    'Raise the heat at the end so the edges crisp.',
    'Chop and serve on tortillas with cilantro, onion, and lime.',
  ],
  'chilaquiles-rojos': [
    'Blend tomato and dried chiles with garlic and onion for a red salsa; simmer.',
    'Fry or toast tortilla pieces until crisp.',
    'Toss the chips in hot salsa just until coated but not soggy.',
    'Top with crema, cheese, onion, cilantro, and optional eggs.',
  ],
  'tinga-de-pollo': [
    'Cook and shred chicken. Soften sliced onion in oil.',
    'Add blended tomato and chipotle in adobo; simmer until thick and smoky.',
    'Fold in the chicken and season with oregano and salt.',
    'Serve on tostadas or in tacos.',
  ],
  'tacos-carne-asada': [
    'Marinate skirt steak with lime, garlic, oil, and salt.',
    'Grill over very high heat to your preferred doneness; rest, then slice thin.',
    'Warm tortillas and fill with steak, onion, cilantro, and salsa.',
  ],
  sopes: [
    'Mix masa with salt and water, form thick disks, and pinch up a rim.',
    'Cook on a comal, then shallow-fry until the edges crisp.',
    'Spread beans, add protein or vegetables, and finish with salsa, crema, and cheese.',
  ],
  'quesadillas-de-queso': [
    'Warm a tortilla on a comal and add cheese to one half.',
    'Fold and cook until the cheese melts and both sides are spotted.',
    'Cut and serve with salsa.',
  ],
  'pico-de-gallo': [
    'Dice tomato, onion, and chile. Chop cilantro.',
    'Toss with lime and salt. Let sit 10 minutes and drain extra juice if needed.',
  ],
  'salsa-verde': [
    'Boil or roast tomatillos, chile, onion, and garlic.',
    'Blend with cilantro and salt until still a little textured.',
    'Simmer 5 minutes if you want a cooked salsa.',
  ],
  esquites: [
    'Cut kernels from the cob and sauté in butter or oil with chile and epazote if using.',
    'Add a splash of water or broth and cook until tender.',
    'Serve in cups with mayo or crema, cheese, chile powder, and lime.',
  ],
  'caldo-de-pollo': [
    'Cover chicken with water, add onion, garlic, and salt, and simmer until tender.',
    'Add carrot, potato, and other vegetables; cook until soft.',
    'Shred some chicken back into the broth. Serve with rice, lime, and cilantro.',
  ],
  'tamales-de-pollo': [
    'Soak corn husks. Beat masa with lard, broth, baking powder, and salt until fluffy.',
    'Spread masa on husks, add shredded chicken in salsa, and fold.',
    'Steam 60–90 minutes until the masa pulls cleanly from the husk.',
  ],
  'enchiladas-rojas': [
    'Soak and blend dried red chiles with garlic and onion; simmer the salsa.',
    'Dip tortillas in salsa, fill with cheese or chicken, and roll.',
    'Sauce the top, add more cheese, and heat until bubbling.',
  ],
  'chilaquiles-verdes': [
    'Make salsa verde and keep it hot.',
    'Fry or toast tortilla chips, then toss in the salsa.',
    'Top with crema, cheese, onion, and cilantro.',
  ],
  'mole-verde': [
    'Blend tomatillo, green chile, herbs, seeds, and lettuce or hoja santa into a green sauce.',
    'Fry the sauce briefly, then thin with broth and simmer.',
    'Add cooked chicken or pork and heat through. Season with salt.',
  ],
  'birria-de-res': [
    'Toast dried chiles and blend with spices, vinegar, and garlic into an adobo.',
    'Marinate beef, then braise in the adobo with broth until shreddable.',
    'Serve as a stew or as tacos dipped in the consommé.',
  ],
  'cochinita-pibil': [
    'Blend achiote with citrus, garlic, and spices.',
    'Rub pork thoroughly, wrap in banana leaf, and slow-roast or braise until it falls apart.',
    'Shred and serve with pickled red onion and tortillas.',
  ],
  'tacos-de-pescado': [
    'Season fish and either grill or batter and fry.',
    'Warm tortillas and add cabbage or slaw.',
    'Top with fish, crema or mayo, salsa, and lime.',
  ],
  'gorditas-chicharron': [
    'Form thick masa cakes and cook on a comal, then split a pocket.',
    'Fry lightly if you want a crisp shell.',
    'Fill with chicharrón in salsa and garnish with lettuce and cream.',
  ],
  huaraches: [
    'Shape masa into long ovals and cook on a comal.',
    'Spread beans, add meat or nopales, and finish with salsa, cheese, and crema.',
  ],
  'flautas-de-pollo': [
    'Fill tortillas with shredded chicken, roll tightly, and secure.',
    'Fry until crisp and golden. Drain.',
    'Serve with lettuce, crema, cheese, and salsa.',
  ],
  molletes: [
    'Split bolillos, toast, and spread with refried beans.',
    'Cover with cheese and melt under a broiler.',
    'Top with pico de gallo.',
  ],
  'huevos-a-la-mexicana': [
    'Sauté onion, tomato, and chile until juicy.',
    'Scramble in beaten eggs and cook to a soft set.',
    'Season with salt and serve with tortillas.',
  ],
  'huevos-divorciados': [
    'Warm red salsa and green salsa in separate pans.',
    'Fry two eggs. Plate on tortillas with one salsa on each egg.',
    'Add beans and cheese if you like.',
  ],
  'machaca-con-huevo': [
    'Soften onion, tomato, and chile.',
    'Add shredded dried beef and then beaten eggs.',
    'Scramble together and serve with flour tortillas.',
  ],
  'rajas-con-crema': [
    'Roast, peel, and strip poblanos. Slice onion.',
    'Sauté onion, add rajas, then pour in crema.',
    'Simmer until slightly thick and season with salt.',
  ],
  'chiles-en-nogada': [
    'Make a picadillo of meat, fruit, and spices; stuff roasted peeled poblanos.',
    'Blend walnut sauce with cheese, milk, and a little sugar until pale and silky.',
    'Nap the chiles with nogada and garnish with pomegranate and parsley.',
  ],
  'pipian-verde': [
    'Toast pumpkin seeds and blend with tomatillo, chile, and herbs.',
    'Fry the sauce, thin with broth, and simmer until it coats a spoon.',
    'Add cooked chicken or pork and heat through.',
  ],
  'adobo-de-puerco': [
    'Blend soaked dried chiles with vinegar, garlic, and spices.',
    'Brown pork, then braise in the adobo until tender.',
    'Reduce the sauce and serve with rice or tortillas.',
  ],
  'carne-en-su-jugo': [
    'Blend tomatillo salsa. Brown bacon and sliced beef.',
    'Add the salsa and broth; simmer until the meat is tender in its juices.',
    'Stir in beans and serve with onion, cilantro, and lime.',
  ],
  'bistec-a-la-mexicana': [
    'Sear thin steaks, then add onion, tomato, and jalapeño.',
    'Simmer until the vegetables break down into a sauce around the meat.',
    'Season and serve with tortillas.',
  ],
  picadillo: [
    'Brown ground beef with onion and garlic.',
    'Add tomato, potato, carrot, peas, and spices; simmer until the vegetables are tender.',
    'Use as a filling or serve with rice.',
  ],
  'albondigas-chipotle': [
    'Mix ground meat with egg, crumbs, and seasoning; form meatballs.',
    'Blend tomato with chipotle and simmer.',
    'Poach the meatballs in the sauce until cooked through.',
  ],
  'frijoles-de-la-olla': [
    'Cover dried or cooked beans with water, onion, garlic, and epazote.',
    'Simmer gently until creamy and well seasoned.',
    'Serve in their broth.',
  ],
  'frijoles-charros': [
    'Render bacon or chorizo; sauté onion and chile.',
    'Add cooked beans, tomato, and cilantro.',
    'Simmer until brothy and smoky.',
  ],
  enfrijoladas: [
    'Blend beans with broth into a smooth sauce and keep warm.',
    'Dip tortillas in the bean sauce, fold or roll, and plate.',
    'Garnish with cheese, onion, and crema.',
  ],
  entomatadas: [
    'Simmer a simple tomato sauce with onion and garlic.',
    'Dip tortillas, fill with cheese, and fold.',
    'Spoon more sauce over the top and heat through.',
  ],
  'arroz-blanco': [
    'Rinse rice and fry briefly in oil with onion and garlic.',
    'Add hot water or broth and salt. Cover and cook until tender.',
    'Rest and fluff.',
  ],
  'sopa-de-tortilla': [
    'Fry tortilla strips until crisp. Blend roasted tomato, chile, onion, and garlic for the broth base.',
    'Simmer the broth, then ladle over strips in bowls.',
    'Top with avocado, cheese, crema, and chile pasilla.',
  ],
  'sopa-de-fideo': [
    'Toast fideo in oil until deep gold.',
    'Add blended tomato, onion, and garlic, then broth.',
    'Simmer until the noodles are soft. Season and serve.',
  ],
  menudo: [
    'Clean and simmer tripe (and hominy if using) for several hours until tender.',
    'Add a red chile broth and oregano.',
    'Serve very hot with onion, lime, oregano, and tortillas.',
  ],
  'pozole-verde': [
    'Simmer pork or chicken. Blend tomatillo, green chile, pumpkin seeds, and herbs.',
    'Cook the green sauce, then combine with meat and hominy.',
    'Garnish with radish, lettuce, and lime.',
  ],
  'caldo-de-res': [
    'Simmer beef shanks until the meat is tender and the broth is rich.',
    'Add corn, carrot, potato, cabbage, and squash in stages.',
    'Serve with rice, lime, and salsa.',
  ],
  'caldo-tlalpeno': [
    'Make a chicken broth and add chickpeas, carrot, and chipotle.',
    'Shred chicken back in and simmer briefly.',
    'Serve with avocado, cheese, and lime.',
  ],
  aguachile: [
    'Slice raw shrimp and briefly cure in lime until just opaque.',
    'Blend lime with chile, cucumber, and onion for the aguachile.',
    'Pour over the shrimp and serve immediately with tostadas.',
  ],
  'ceviche-de-camaron': [
    'Poach or lime-cure shrimp. Dice tomato, onion, cucumber, and chile.',
    'Toss everything with lime, cilantro, and salt.',
    'Chill briefly and serve with tostadas or crackers.',
  ],
  'coctel-de-camaron': [
    'Mix cooked shrimp with ketchup or cocktail sauce, lime, onion, cilantro, and avocado.',
    'Add orange juice or clamato if you like it brothy.',
    'Serve cold in glasses with saltines.',
  ],
  'pescado-veracruzana': [
    'Sear white fish and set aside.',
    'Cook onion, garlic, tomato, olives, capers, and jalapeño into a sauce.',
    'Nestle the fish back in and simmer until just cooked.',
  ],
  'camarones-mojo-ajo': [
    'Gently cook a lot of sliced garlic in oil or butter without burning it.',
    'Add shrimp and chile; cook until just pink.',
    'Finish with lime and parsley. Serve with rice or bread.',
  ],
  'tacos-de-camaron': [
    'Season and sauté or grill shrimp quickly.',
    'Warm tortillas and add slaw or cabbage.',
    'Top with shrimp, salsa, and lime.',
  ],
  discada: [
    'On a discada or large skillet, render bacon and sausage, then brown beef and ham.',
    'Add onion, chile, tomato, and beer or broth.',
    'Simmer until the meats are glazed and the mixture is juicy. Serve with tortillas.',
  ],
  'fajitas-de-res': [
    'Marinate sliced beef with lime, garlic, and spices.',
    'Sear meat, then peppers and onions, over very high heat.',
    'Serve sizzling with tortillas and salsa.',
  ],
  'fajitas-de-pollo': [
    'Marinate chicken strips. Sear hard in a hot pan.',
    'Add peppers and onions and cook until charred-tender.',
    'Serve with tortillas, salsa, and lime.',
  ],
  'burrito-carne-asada': [
    'Grill and chop carne asada.',
    'Warm a flour tortilla and layer rice, beans, meat, salsa, and cheese.',
    'Fold tightly into a burrito.',
  ],
  chimichanga: [
    'Fill a flour tortilla like a burrito, fold tightly, and fry until golden.',
    'Drain and top with salsa, crema, and guacamole.',
  ],
  'nachos-con-queso': [
    'Spread chips on a tray. Scatter beans, meat if using, and cheese.',
    'Bake until the cheese melts.',
    'Finish with salsa, jalapeño, crema, and cilantro.',
  ],
  'queso-fundido': [
    'Melt cheese slowly with a little milk or beer so it stays smooth.',
    'Stir in roasted peppers or chorizo if you like.',
    'Serve hot with tortillas or chips.',
  ],
  choriqueso: [
    'Crumble and fry chorizo until the fat renders.',
    'Add cheese and melt together.',
    'Serve immediately with tortillas.',
  ],
  'salsa-roja-asada': [
    'Char tomato, onion, garlic, and chile on a comal.',
    'Blend with salt and a splash of water.',
    'Taste for heat and acidity.',
  ],
  'salsa-chile-de-arbol': [
    'Toast árbol chiles briefly. Blend with garlic, vinegar or lime, and salt.',
    'Thin to a pourable salsa. Use sparingly — it is hot.',
  ],
  'elote-asado': [
    'Grill corn in the husk or stripped until blistered.',
    'Slather with mayo or crema, roll in cheese, and dust with chile powder.',
    'Finish with lime.',
  ],
  'tostadas-de-tinga': [
    'Spread beans on crisp tostadas.',
    'Pile with chicken tinga.',
    'Top with cream, cheese, lettuce, and salsa.',
  ],
  'tacos-de-suadero': [
    'Slow-cook suadero until tender, then crisp the edges on a plancha.',
    'Chop and serve on tortillas with salsa, onion, and cilantro.',
  ],
  'tacos-de-lengua': [
    'Simmer beef tongue until a knife slides through; peel and dice.',
    'Brown the cubes on a plancha.',
    'Taco with salsa verde, onion, and cilantro.',
  ],
  'tacos-de-chorizo': [
    'Crumble chorizo in a hot pan until cooked and crisp in spots.',
    'Serve on tortillas with onion, cilantro, and salsa.',
  ],
  'tacos-de-canasta': [
    'Fill tortillas with beans, potato, or adobo and fold.',
    'Steam or hold in a lined basket so they stay soft and moist.',
    'Serve warm with salsa.',
  ],
  gringas: [
    'Warm a flour tortilla with cheese and al pastor or similar meat.',
    'Fold or stack and griddle until the cheese melts.',
    'Cut and serve with pineapple and salsa.',
  ],
  mulitas: [
    'Layer meat and cheese between two tortillas.',
    'Griddle until crisp and the cheese binds them.',
    'Cut into wedges.',
  ],
  sincronizadas: [
    'Sandwich ham and cheese between two flour tortillas.',
    'Griddle both sides until melted and spotted.',
    'Cut into triangles.',
  ],
  'tostadas-de-pollo': [
    'Spread beans on tostadas, add shredded chicken.',
    'Top with lettuce, cream, cheese, and salsa.',
  ],
  pambazo: [
    'Dip bread in red guajillo sauce.',
    'Fill with potato and chorizo, then griddle or fry until the outside is stained and crisp.',
    'Garnish with lettuce, cream, and cheese.',
  ],
  'torta-de-milanesa': [
    'Bread and fry a thin cutlet.',
    'Build a bolillo with beans, milanesa, avocado, onion, tomato, and jalapeño.',
    'Press lightly and serve.',
  ],
  'tortas-ahogadas': [
    'Fill birote with carnitas. Blend a thin tomato sauce and a hotter chile sauce.',
    'Drown the sandwich in tomato sauce and drizzle the hot sauce.',
    'Eat immediately over a plate.',
  ],
  'cemita-poblana': [
    'Split a sesame cemita roll. Pile milanesa, avocado, papalo, onion, and stringy cheese.',
    'Add chipotle and close the sandwich.',
  ],
  panuchos: [
    'Split cooked tortillas, stuff with black beans, and fry until crisp.',
    'Top with cochinita or shredded turkey, pickled onion, and avocado.',
  ],
  salbutes: [
    'Fry thick masa disks until they puff and blister.',
    'Top with lettuce, meat, pickled onion, and tomato.',
  ],
  'tacos-cochinita': [
    'Reheat shredded cochinita pibil.',
    'Serve on tortillas with pickled red onion and habanero salsa.',
  ],
  'poc-chuc': [
    'Marinate pork slices in sour orange and salt.',
    'Grill over high heat until charred and cooked through.',
    'Serve with beans, avocado, and fire-roasted salsa.',
  ],
  'empanadas-de-atun': [
    'Mix tuna with onion, tomato, and seasonings.',
    'Fill masa or dough rounds, seal, and fry or bake.',
    'Drain and serve with salsa.',
  ],
  'pastel-azteca': [
    'Layer salsa, tortillas, chicken, cream, and cheese like a lasagna.',
    'Repeat and finish with cheese.',
    'Bake until bubbling and rest 10 minutes before slicing.',
  ],
  'chicharron-salsa-verde': [
    'Simmer salsa verde.',
    'Add chicharrón and cook until it softens and soaks up sauce.',
    'Serve with tortillas and onion.',
  ],
  'nopales-a-la-mexicana': [
    'Rinse cooked nopales well. Sauté onion, tomato, and chile.',
    'Add nopales and cook off extra moisture.',
    'Season and serve as a side or taco filling.',
  ],
  'costillas-salsa-verde': [
    'Brown pork ribs, then simmer in salsa verde until tender.',
    'Reduce the sauce to coat the meat.',
    'Serve with rice or tortillas.',
  ],
  'pollo-en-salsa-verde': [
    'Brown chicken pieces. Make salsa verde.',
    'Braise the chicken in the salsa until cooked through.',
    'Serve with rice and tortillas.',
  ],
  'arrachera-plancha': [
    'Season skirt steak well and sear on a ripping-hot plancha.',
    'Rest and slice against the grain.',
    'Serve with grilled onions and tortillas.',
  ],
  'cecina-enchilada': [
    'Coat thin beef with chile paste and salt; rest.',
    'Grill or plancha quickly so it stays tender.',
    'Serve with guacamole and tortillas.',
  ],
  'mixiote-borrego': [
    'Marinate lamb in dried-chile adobo.',
    'Wrap in mixiote or parchment and steam or bake until very tender.',
    'Open at the table and serve with tortillas.',
  ],
  corundas: [
    'Beat fresh masa with lard and salt.',
    'Wrap in triangular folds of corn leaf and steam until set.',
    'Serve with cream, salsa, and cheese.',
  ],
  'tamales-de-rajas': [
    'Prepare fluffy masa. Cut roasted poblanos into rajas.',
    'Spread masa on husks, fill with rajas and cheese, and fold.',
    'Steam until the masa is firm.',
  ],
  'tamales-dulces': [
    'Beat masa with lard, sugar, and cinnamon. Fold in raisins.',
    'Fill husks and steam until set.',
    'Serve warm as a sweet tamal.',
  ],
  champurrado: [
    'Dissolve masa in water or milk and whisk over heat so it does not lump.',
    'Add chopped chocolate, piloncillo, and cinnamon.',
    'Cook, stirring, until thick, hot, and smooth.',
  ],
  horchata: [
    'Soak rice with cinnamon, then blend very well and strain.',
    'Sweeten with sugar, add milk and vanilla if using, and chill.',
    'Serve over ice.',
  ],
  cheeseburger: [
    'Season ground beef, form patties, and sear in a hot pan or grill.',
    'Melt cheddar on top. Toast the buns.',
    'Build with lettuce, tomato, onion, pickle, and condiments.',
  ],
  'macaroni-and-cheese': [
    'Boil pasta until just shy of done. Make a butter-flour roux and whisk in milk.',
    'Melt in cheddar off the heat. Fold in the pasta.',
    'Bake if you want a browned top.',
  ],
  'bbq-pork-ribs': [
    'Rub ribs with sugar, paprika, garlic, salt, and pepper.',
    'Slow-cook until tender, then glaze with barbecue sauce and finish under heat to caramelize.',
    'Rest, slice, and serve.',
  ],
  'buffalo-wings': [
    'Pat wings dry and roast or fry until crisp.',
    'Toss with melted butter and hot sauce.',
    'Serve with celery and blue cheese.',
  ],
  meatloaf: [
    'Mix beef with crumbs, egg, onion, milk, and seasonings. Shape into a loaf.',
    'Glaze with ketchup and bake until cooked through.',
    'Rest 10 minutes before slicing.',
  ],
  'clam-chowder': [
    'Render bacon; sweat onion, celery, and potato in the fat with a little flour.',
    'Add clam liquor, milk, and cream; simmer until the potatoes are tender.',
    'Stir in clams, season, and serve hot.',
  ],
  'buttermilk-pancakes': [
    'Whisk dry ingredients, then fold in buttermilk, eggs, and melted butter.',
    'Cook scoops on a buttered griddle until bubbles set; flip once.',
    'Serve with butter and maple syrup.',
  ],
  'caesar-salad': [
    'Blend or whisk oil, lemon, garlic, egg or mayo, Worcestershire, and Parmesan into a dressing.',
    'Toss with torn romaine and croutons.',
    'Finish with more Parmesan and black pepper.',
  ],
  'southern-fried-chicken': [
    'Soak thighs in buttermilk. Dredge in seasoned flour.',
    'Fry in oil until deep golden and cooked through.',
    'Drain on a rack and salt while hot.',
  ],
  'apple-pie': [
    'Make a butter pastry and chill. Toss apples with sugar, cinnamon, and lemon.',
    'Fill the crust, top with the second crust, and vent.',
    'Bake until the juices bubble and the crust is brown. Cool before slicing.',
  ],
  'spaghetti-carbonara': [
    'Cook spaghetti in well-salted water. Crisp pancetta in a pan.',
    'Mix egg and cheese. Off the heat, toss pasta with pancetta, then the egg mixture and a little pasta water.',
    'Season aggressively with black pepper. Do not scramble the eggs.',
  ],
  'pizza-margherita': [
    'Stretch dough, spread a thin layer of crushed tomato, and add torn mozzarella.',
    'Bake as hot as your oven allows until the crust blisters.',
    'Finish with basil, oil, and salt.',
  ],
  'lasagna-bolognese': [
    'Simmer a meat sauce with tomato, onion, and garlic. Mix ricotta with egg and herbs if using.',
    'Layer pasta, sauce, ricotta, mozzarella, and Parmesan.',
    'Bake covered, then uncovered until browned. Rest before cutting.',
  ],
  'chicken-parmesan': [
    'Pound chicken, bread it, and brown in oil.',
    'Top with tomato sauce, mozzarella, and Parmesan.',
    'Bake until the cheese melts and the chicken is cooked through.',
  ],
  'fettuccine-alfredo': [
    'Cook fettuccine. Melt butter with cream and garlic.',
    'Toss pasta with the cream and a lot of Parmesan until silky.',
    'Finish with pepper and parsley.',
  ],
  'risotto-milanese': [
    'Sweat onion in butter and oil. Toast arborio, then add hot broth a ladle at a time, stirring.',
    'When the rice is creamy and al dente, beat in butter and Parmesan.',
    'Rest one minute and serve immediately.',
  ],
  minestrone: [
    'Sauté onion, carrot, and celery in olive oil.',
    'Add tomato, broth, vegetables, beans, and a little pasta.',
    'Simmer until everything is tender. Finish with oil and Parmesan.',
  ],
  'eggplant-parmesan': [
    'Salt eggplant, then fry or roast slices.',
    'Layer with tomato sauce, mozzarella, and Parmesan.',
    'Bake until bubbling and golden.',
  ],
  'caprese-salad': [
    'Slice tomato and mozzarella.',
    'Arrange with basil, olive oil, salt, and pepper.',
    'Serve at room temperature.',
  ],
  tiramisu: [
    'Whip mascarpone with egg yolks and sugar (or a cooked zabaglione-style cream).',
    'Dip ladyfingers in espresso and layer with the cream.',
    'Chill several hours and dust with cocoa.',
  ],
  'kung-pao-chicken': [
    'Marinate diced chicken with soy, starch, and a little oil.',
    'Stir-fry dried chiles, Sichuan pepper, garlic, and ginger; add chicken.',
    'Add sauce, peanuts, and green onion; toss until glazed.',
  ],
  'mapo-tofu': [
    'Fry doubanjiang in oil with garlic, ginger, and ground pork.',
    'Add broth and cubed tofu; simmer gently.',
    'Thicken with starch, finish with Sichuan pepper and green onion.',
  ],
  'sweet-and-sour-pork': [
    'Coat pork with starch and fry until crisp.',
    'Stir-fry pepper, onion, and pineapple.',
    'Add ketchup-vinegar-sugar sauce, toss in the pork, and glaze.',
  ],
  'egg-fried-rice': [
    'Scramble eggs and set aside. Stir-fry aromatics and vegetables in a hot wok.',
    'Add cold cooked rice and break up clumps.',
    'Season with soy and sesame oil; fold the egg back in.',
  ],
  'beef-chow-mein': [
    'Boil and drain wheat noodles. Stir-fry sliced beef and remove.',
    'Stir-fry cabbage, carrot, and aromatics; add noodles and sauces.',
    'Return the beef and toss until everything is coated.',
  ],
  'pork-dumplings': [
    'Mix ground pork with napa, ginger, green onion, soy, and sesame oil.',
    'Fill wrappers, pleat, and seal well.',
    'Boil, steam, or pan-fry until cooked through. Serve with soy and vinegar.',
  ],
  'hot-and-sour-soup': [
    'Simmer broth with mushrooms, tofu, soy, vinegar, and white pepper.',
    'Thicken with starch. Stream in beaten egg while stirring.',
    'Finish with sesame oil and green onion.',
  ],
  'general-tsos-chicken': [
    'Coat chicken and fry until crisp.',
    'Build a sauce with soy, hoisin, vinegar, sugar, garlic, and chile.',
    'Toss the chicken in the bubbling sauce and garnish with green onion.',
  ],
  'char-siu-pork': [
    'Marinate pork in hoisin, soy, honey, five-spice, and garlic.',
    'Roast, basting, until lacquered and cooked through.',
    'Rest and slice. Serve with rice.',
  ],
  'wonton-soup': [
    'Fill wrappers with seasoned pork and seal.',
    'Simmer broth with ginger. Cook wontons in the broth.',
    'Add bok choy at the end and finish with sesame oil and green onion.',
  ],
}
