# meat

Codename **meat** — a personal calorie tracker with a customized daily plan.

## Run

```bash
cd meat
npm install
npm run dev
```

## Features

### Personalized plan
- Form: name, sex, age, height, weight, activity level, goal (lose / maintain / gain)
- Optional weekly kg rate for loss or gain
- Calculates **BMR** (Mifflin–St Jeor), **TDEE**, daily calorie target, protein/carbs/fat, and water glasses
- Save plan to use as today’s goals

### Daily tracker
- Calorie ring (eaten vs goal)
- Macro progress bars
- Water intake (tap glasses)
- Meal diary (Breakfast / Lunch / Dinner / Snack)
- Log custom food or one-tap quick adds
- Delete entries

### History
- Past days with totals, macros, water, and food list

### Themes
Grove · Ignite · Citrus · Slate · Berry (switch anytime in the header)

## Data

Everything is stored in `localStorage` under `meat-app-v1` (plan, food log, water, theme). No backend yet.
