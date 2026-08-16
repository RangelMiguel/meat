# meat

Codename **meat** — a personal calorie tracker with a customized daily plan.

## Run

PostgreSQL + `AUTH_SECRET` (same setup as misfinanzas-family). Copy `.env.example` to `.env` and point `DATABASE_URL` / `DIRECT_URL` at a dedicated database — do not reuse the misfinanzas schema.

```bash
cd meat
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

On Vercel set `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET` (min 16 chars) for Production and Builds.

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

Accounts and household data live in PostgreSQL (Prisma). Sessions are httpOnly JWT cookies (`meat_session`), matching misfinanzas-family. Theme/locale still cache in `localStorage`.
