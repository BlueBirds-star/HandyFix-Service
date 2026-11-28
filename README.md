# HandyFix Services Landing Page

**HandyFix Services** provides electrical and plumbing repairs in Benin City. This project is a mobile‑first landing page that helps customers:

- Recognise emergencies (sparks, burning smell, flooding) and get quick safety instructions.
- Submit a structured request for a visit.
- Find answers to the most common questions without calling.

## Features

- **Header** with business name, "Request a Visit" button and tap‑to‑call.
- **Hero** section with a value statement, AI‑generated image and primary/secondary actions.
- **Emergency box** highlighting safety steps and an emergency request button.
- **Services** cards for Electrical and Plumbing.
- **How it works** three‑step flow.
- **Areas covered** (Oregbeni & nearby Benin City).
- **FAQ** accordion covering the top 8 questions.
- **Request form** (Name, Phone/WhatsApp, Area, Type of work, Emergency flag, Description) with inline validation and a confirmation that no price is given before the job is seen.
- **Footer** with contact details, hours and the "never‑price" note.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | **Astro** (recommended for minimal JavaScript) – Next.js is an alternative |
| Styling | Tailwind CSS (or plain CSS) |
| Form handling | Formspree / Web3Forms (emails submission) – optional WhatsApp link |
| Chatbot | Chatbase embed (optional) |
| Hosting | Vercel (free tier) |
| Source control | GitHub |

## Design Direction

- **Palette**: Navy `#0F172A`, Slate `#1E293B`, Amber `#F59E0B` (electrical), Aqua `#0284C7` (plumbing), Crimson `#DC2626` (emergency).
- **Typography**: Clean sans‑serif, large body text.
- **Layout**: Single‑column mobile layout with generous spacing and large tap targets.
- **Tone**: Calm, clear, practical – no jargon, no lorem ipsum.
- **Non‑functional**: Mobile‑first, fast loading (Lighthouse 90+), accessible (contrast, focus states, alt text), SEO‑ready, privacy‑conscious.

## Installation & Development

```bash
# Clone the repository (if not already cloned)
git clone https://github.com/BlueBirds-star/Handy.git
cd Handy

# Install dependencies
npm install

# Run locally
npm run dev
```

## Deployment

The project is deployed on Vercel. After pushing to the `main` branch, Vercel automatically builds and publishes a preview URL. To create a production deployment:

```bash
# Ensure Vercel CLI is authenticated (use a valid Vercel token)
vercel --prod --yes
```

The deployment URL will be displayed after the command completes.

## License

This project is for the AG Southern AI Class Capstone and may be used under the terms agreed with the client.
