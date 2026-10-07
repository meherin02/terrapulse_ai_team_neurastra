# TerraPulse AI

**Team Neurastra · NASA Space Apps Challenge 2026**

TerraPulse AI is an environmental trend explorer built around a simple question: how do we tell a long-term change from ordinary year-to-year variation?

Our first prototype focuses on air temperature around Dhaka, Bangladesh. It uses NASA POWER data to show the historical record, estimate a trend, and explain how certain that estimate is. Changing the time period lets users see why a conclusion should depend on evidence rather than on a single hot or cold year.

The project addresses **Be An Earth System Trend Detective!** through four questions: what is changing, where, by how much, and whether the selected record supports a statistically significant trend.

## What works

- Annual and monthly temperature charts for Dhaka, covering 1981–2024.
- Three analysis periods: 1981–2024, 2001–2024, and 2015–2024.
- Trend estimates in °C per decade, approximate 95% confidence intervals, and p-values.
- A regional locator, source links, and an explanation of the analysis method.
- Guided TerraAgent explanations of the calculated results.
- A Team introduction page with member roles and email contacts.
- Annual CSV downloads and a text export of the findings.
- An Earth illustration with subtle pointer and scroll parallax, pause controls, and a Simple view option. If the image cannot load, the original header appears automatically. System reduced-motion preferences disable animation.

This is a working prototype with one location and one variable. TerraAgent includes prepared explanations and an optional live chat integration using Google Gemini's API and read-only evidence tools. Additional regions and environmental variables are planned improvements. Live AI needs a locally configured API key; without it, the guided explanations remain usable.

## Try the optional live TerraAgent

This integration is experimental. The tool loop has been checked with a simulated provider and one real Gemini 3.5 Flash-Lite question about the 2001–2024 Dhaka trend. The live answer matched the saved slope, interval, and p-value and identified the nonsignificant result. This is a smoke check, not a guarantee that every generated answer is correct. Live access requires a locally configured Gemini key and available quota.

1. Copy `.env.example` to `.env` in the project root.
2. Enter your own `GEMINI_API_KEY` in `.env`. Do not put it in React, chat messages, screenshots, or Git. The file is ignored by Git.
3. In one terminal, run `npm run server`. Restart this server after changing `.env`.
4. In a second terminal, run `npm run dev`.
5. Open the explorer and scroll to **Ask TerraAgent**. Click **Check connection**, then ask a question.

The default model is `gemini-3.5-flash-lite`; `GEMINI_MODEL` can be changed to an accessible Gemini model supporting function calling. Use a Free Tier project without enabling paid billing; free usage is quota-limited. If quota is exhausted, the guided explanations remain available. The backend requires no additional npm dependencies and uses Node.js 24's HTTP server and fetch API.

The agent has three tools: `get_temperature_trend`, `compare_periods`, and `get_data_source`. They read the saved NASA dataset, validate supported periods, and return existing calculations. The model receives the tool outputs and explains them; it does not calculate new slopes or fetch live observations. The first model request requires a tool call. Chat answers show which tools were used and a source link. Instructions constrain scope, but generated answers can still contain mistakes and must be checked.

Recent chat history is kept in browser memory and sent with the question and tool evidence to Google Gemini when live AI is configured. It is cleared on page reload. No database stores the chat. Free-tier content may be used by Google to improve its products. The app sends questions and public NASA evidence, not team emails. See [Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling) and [free-tier pricing and data use](https://ai.google.dev/gemini-api/docs/pricing).

Run `npm run test:agent` to check exact tool values, unsupported inputs, simulated tool round trips, bounded loops, HTTP validation, origin checks, and missing-key handling. These tests make no paid AI requests. The dashboard build is checked with `npm run build`.

The local backend listens on `127.0.0.1:3001`, with Vite proxying `/api` during development and local preview. Vercel uses the same request handler through `api/chat.js` and `api/agent/status.js`. `vercel.json` includes the saved NASA dataset in the function bundle and sets a 60-second execution limit. The Gemini request loop has a 55-second overall deadline. The handler supports both raw HTTP request bodies and Vercel's parsed bodies, and accepts the same hosted origin as well as the local UI.

## Deploy on Vercel

1. Import the GitHub repository into Vercel with the Vite preset, repository root directory, build command `npm run build`, and output directory `dist`.
2. In **Project Settings → Environment Variables**, add `GEMINI_API_KEY` with your private Gemini key and `GEMINI_MODEL` with `gemini-3.5-flash-lite`. Select **Production**, and **Preview** if you want AI in preview deployments. Do not use a `VITE_` prefix for the key.
3. Redeploy after saving the variables. Your local `.env` is ignored by Git and is not automatically transferred to Vercel.
4. Open `/api/agent/status` on your deployed domain. It should return `configured: true` and the model name; it never exposes the key. Then test **Ask TerraAgent**.

Deploy the repository, not only the `dist/` folder: the hosted chat needs the `api/` functions. Do not rewrite `/api/*` to `index.html`. Same-domain API calls need no separate server URL.

This remains a prototype. Request and concurrency limits are per function instance, not durable per-user quotas across Vercel's scaling. For broader public use, add authentication and a shared rate limiter. Free Gemini quota can still run out; the guided explanations remain available. Your account's Vercel and Gemini plan limits apply independently.

## Run the website

Node.js 24 was used to build and check this version. Python is optional for viewing the dashboard; it is needed only to reproduce the data analysis.

Open the project folder in VS Code, select **Terminal → New Terminal**, and run:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/**. Keep the terminal running while using the app. Press **Ctrl+C** to stop it. Start it again with `npm run dev` when you return.

The address above is local to your computer. If it stops opening, check that the server is running and read any error shown in the terminal. A GitHub repository link shares the source code; it does not automatically host the website.

For a production build and local preview:

```sh
npm run build
npm run preview
```

The preview opens at **http://127.0.0.1:4173/**. The generated `dist/` directory can be deployed on a static hosting service. The prepared data and country boundaries are included, so the explorer does not require a live NASA API connection. Optional web fonts use system font fallbacks when unavailable.

## NASA data and other sources

**NASA POWER Monthly Point API**, using `T2M` from **MERRA-2 reanalysis**:

- Variable: air temperature at 2 meters, in degrees Celsius.
- Requested point: latitude **23.8103**, longitude **90.4125**, near Dhaka.
- Period: January 1981 through December 2024.
- Coverage: **528 valid monthly values**, producing **44 complete annual means**.
- Approximate source resolution: **0.5° latitude × 0.625° longitude**.

[Exact NASA request](https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M&community=RE&longitude=90.4125&latitude=23.8103&start=1981&end=2024&format=JSON) · [Monthly API documentation](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/) · [NASA data FAQ](https://power.larc.nasa.gov/docs/faqs/data/)

The raw response is in `data/raw/`, alongside a receipt containing the source URL, retrieval time, and SHA256 checksum. The app reads the prepared `public/data/dhaka.json` snapshot.

The locator uses public-domain [Natural Earth country boundaries](https://www.naturalearthdata.com/about/terms-of-use/). It locates Dhaka; it is not a temperature coverage map. The map preparation script records the source URL in the bundled GeoJSON.

## How the analysis works

Monthly values are checked for missing data and fill values. NASA's month 13 annual summary is excluded. Months are weighted by their number of calendar days, and only years with all 12 months are retained.

The Python script fits an ordinary least-squares line to the annual means. Uncertainty is estimated with Newey–West HAC covariance using one annual lag, Bartlett weights, and an n/(n−2) correction. Approximate two-sided t inference with n−2 degrees of freedom produces the confidence interval and p-value. The exploratory significance threshold is 0.05. [HAC method reference](https://www.statsmodels.org/stable/generated/statsmodels.stats.sandwich_covariance.cov_hac.html)

The shaded chart band describes uncertainty in the fitted mean trend. It is not a prediction interval for an individual year.

| Period | Trend, °C/decade | Approximate 95% interval | p-value |
|---|---:|---|---:|
| 1981–2024 | −0.2386 | −0.3413 to −0.1358 | 0.00003 |
| 2001–2024 | +0.0343 | −0.0990 to +0.1677 | 0.59868 |
| 2015–2024 | −0.2540 | −1.1783 to +0.6702 | 0.54385 |

The full record has a downward fitted trend under this method; the two shorter periods do not provide clear evidence of a trend. These are results for one regional model grid. They do not explain the cause of the change or establish a conclusion about global climate.

The source represents a coarse regional estimate, rather than a city-boundary average or weather station. It is air temperature, not satellite land surface temperature. The NASA response's `time_standard: LST` means **local solar time**. Confidence intervals do not include all model uncertainty; lag-one HAC only addresses short-lag dependence. The selected periods have no multiple-comparison adjustment. A nonsignificant result does not prove no change. Unexpected findings need further checking against independent observations and possible breaks in the reanalysis record.

## Reproduce and check the analysis

The analysis environment was tested with Python 3.14, NumPy 2.5.3, and SciPy 1.18.1. On Windows:

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install -r scripts/requirements-lock.txt
.venv/Scripts/python scripts/prepare_data.py
.venv/Scripts/python scripts/test_analysis.py
```

On macOS/Linux, replace `.venv/Scripts/python` with `.venv/bin/python`. The saved raw response is used by default. Add `--refresh` to `prepare_data.py` to fetch an updated NASA response; this requires internet access and may change the results if the source has been revised. `prepare_map.py` can refresh the locator boundaries.

The five calculation checks cover calendar weighting, exclusion of incomplete years, known slopes, invalid time axes, and agreement of the actual-data slope with SciPy's regression calculation. Passing them verifies these implementation checks; it is not independent scientific validation of the dataset or its interpretation.

## Project files

```text
terrapulse-ai/
  src/                  React dashboard and styling
  server/               Optional live AI backend, evidence tools, and checks
  api/                  Vercel entry points for live chat and status
  public/               Earth illustration, favicon, and prepared data
  scripts/              Python preprocessing, checks, and requirements
  data/raw/             Original NASA response and source receipt
  index.html
  vite.config.js
  vercel.json
  package.json
  package-lock.json
  .gitignore
  .env.example
  LICENSE
  README.md
```

Generated files, local environments, dependency folders, and credentials are excluded through `.gitignore`. They are not part of the submission ZIP.

## AI assistance

ChatGPT/Codex was used substantially during development: discussing the architecture, generating the initial React interface and Python analysis implementation, helping with setup and troubleshooting, writing calculation checks, and drafting documentation and presentation material. The source data was downloaded from NASA; AI did not invent the temperature values.

The team supplied the selected challenge, requested the environmental trend explorer, and guided the intended scope. Team members should add only their actual contributions when preparing the final submission. AI assistance does not replace understanding, reviewing, and validating the work.

The examples below summarize useful requests for the assisted parts. They are **reproducible example prompts, not a verbatim historical prompt log**.

**Dashboard:**

> Help build a React dashboard for TerraPulse AI. Show Dhaka's prepared NASA air-temperature data in annual and monthly charts. Include period selection, trend estimates, uncertainty, source links, and a layout that works on mobile. Clearly label features that are still prototypes.

**Data processing and statistics:**

> Help process NASA POWER T2M monthly data. Exclude month 13 and missing values, calculate day-weighted complete annual means, and estimate an annual trend. Explain the uncertainty method and its assumptions. Keep the raw response and provenance, and do not manufacture values or claim causation.

**Troubleshooting and documentation:**

> Help diagnose why the local React app is not opening, check its build and calculations, and explain how a beginner can run it. Write an accurate README covering data sources, implemented features, limitations, and AI assistance. Keep the project structure small.

## Technologies and credits

### Decorative background

`public/earth-horizon.png` was generated with the built-in image generation tool for this prototype. It is a decorative illustration, not a NASA photograph, observation, or scientific heatmap. The dashboard labels it as AI-generated. No extra API key is needed to display the bundled image.

Final image prompt:

> Use case: stylized-concept. Asset type: wide background image for TerraPulse AI environmental trend explorer header. Create a cinematic, elegant Earth horizon seen from low orbit, with the curved planet occupying the right two thirds and bottom edge, misty cloud layers and deep ocean, a delicate luminous teal atmosphere against very dark emerald-black space. Premium editorial space photography-inspired digital illustration; clearly decorative, not a scientific heatmap. Wide landscape composition about 3:1 with generous calm dark negative space on the left for white interface text. Restrained palette: deep forest teal, blue-green ocean, pale mint highlights, subtle warm sunlight at the upper right horizon. Realistic atmospheric depth, gentle soft cloud textures, sophisticated and quiet. No text, no logos, no numbers, no borders, no spacecraft, no UI or charts, no exaggerated lens flares. Final asset intended for a subtle pointer and scroll parallax background behind a small dashboard intro.

React, Vite, Recharts, and Lucide React are used for the frontend. Python, NumPy, and SciPy are used for preprocessing and statistics. The interface uses plain CSS and optional Google Fonts (DM Sans and Manrope). Third-party tools and assets retain their respective licenses.

Original project code is available under the MIT license in `LICENSE`. NASA data and third-party assets remain subject to their own source terms. A public GitHub repository containing this project is suitable for the source-code field; test its access without signing in before submitting.
