# TerraPulse AI — four-minute summary video

Use the English narration below as a draft. Rehearse with a timer: approximately 490 words, plus pauses and clicks. Aim for 3:50–3:58, then export a video no longer than the required four minutes. Replace the team contribution section with what your team actually did. Do not claim the future features already work.

## 0:00–0:30 · Team and problem

**Show:** Team Neurastra / TerraPulse AI title for a few seconds, then the explorer.

**Say:**

“We are Team Neurastra, and this is TerraPulse AI, our prototype for Be An Earth System Trend Detective. Environmental change can be difficult to understand from a collection of numbers. A hot year is not necessarily a long-term trend. We want people to investigate what is changing, by how much, and how strong the evidence really is.”

## 0:30–1:00 · NASA data

**Click:** Data & methodology. Point to the source and coordinates.

**Say:**

“Our first case study examines the Dhaka region in Bangladesh. We use 528 monthly air-temperature values from NASA POWER, covering 1981 through 2024. These values come from MERRA-2 reanalysis. They represent air temperature at two meters over a regional grid, rather than satellite land surface temperature or individual streets. We preserve the original response and link to the exact NASA request.”

## 1:00–2:20 · Working demo

**Click:** Trend explorer → full record → chart tooltip → Monthly → Annual → 2001–2024.

**Say:**

“Here is the working explorer. The annual chart shows how temperature varies from year to year. The dashed line is the fitted trend, while the shaded area shows uncertainty in the fitted mean trend.

“For the full record, this dataset gives a downward estimate of about 0.24 degrees Celsius per decade. Its approximate confidence interval runs from minus 0.34 to minus 0.14. This is an exploratory result for this regional model grid. It does not tell us the cause, and it is not evidence against global warming.

“The monthly view reveals the seasonal cycle. Our trend calculations use annual means, so we do not mistake seasonal changes for a long-term trend.

“Now we select 2001 to 2024. The estimated trend is about plus 0.03 degrees per decade. Its interval includes zero, and the p-value is approximately 0.599. We report no clear trend detected for this period. That does not prove that nothing changed. It shows why the time window and uncertainty matter.”

## 2:20–3:00 · Explanation and analysis

**Click:** How certain is it? → Where is the data from?

**Say:**

“TerraAgent translates these calculated results into accessible explanations. In this prototype, the explanations are deterministic; a live language-model agent is future work.

“Our Python analysis validates the monthly data, weights months by their number of days, and keeps complete years. It fits an annual trend and adjusts its uncertainty for short-lag dependence. Users can inspect the method, download the annual values, and export findings.”

## 3:00–3:30 · Usefulness and limits

**Show:** Data & methodology → limitations.

**Say:**

“The prototype helps users move from a chart to an evidence-based interpretation. However, the source is a coarse regional model. The intervals do not include every source of model uncertainty, and results depend on assumptions. Unexpected findings need comparison with independent observations and investigation of possible breaks in the record. A trend alone cannot identify causes or predict the future.”

## 3:30–4:00 · Team and next steps

**Show:** Return to the explorer. End with the project and team name.

**Say:**

“Our team’s contributions include [briefly name the work members actually completed]. This working sample combines a React dashboard with reproducible Python analysis. Next, we plan to compare more regions, include satellite surface temperature and other environmental variables, and connect an AI assistant to verified analysis tools. TerraPulse AI makes environmental trends easier to explore, question, and understand.”

## Recording instructions — Banglish

1. `npm run dev` diye app chalu koro; browser-e `http://127.0.0.1:5173/` open koro.
2. Browser and microphone recording age 10-second test koro. Voice clear kina shuno.
3. Narration practice koro. Script-er bracket-e nijeder actual team contribution boshao.
4. Full record and recent period-er result duitai dekhao. Cooling result-ke global climate conclusion bolo na.
5. “AI fully working”, “future prediction”, “street-level map” claim koro na—ei version-e egulo nei.
6. Recording-e error hole short section abar record kore edit koro. Total duration 4 minute-er moddhe rakho.
7. Exported video open kore sound, text, and last frame check koro. Submission format and revised deadline organizer-er instructions theke confirm koro.

## Short project description

TerraPulse AI helps people investigate environmental trends using NASA Earth-system data. Our Dhaka prototype combines temperature charts, statistical uncertainty, and clear explanations to show how results depend on the selected period. Users can inspect the source, compare time windows, and export findings.
