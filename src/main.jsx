import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowDownRight, ArrowUpRight, Check, ChevronDown, Download, ExternalLink, Globe2, Info, Layers, MapPin, Menu, MessageSquare, Microscope, Pause, Play, RefreshCw, ShieldCheck, Thermometer, X } from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './styles.css';

const signed = (n, digits = 2) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(digits)}`;
const pformat = p => p < 0.001 ? '< 0.001' : `= ${p.toFixed(3)}`;

function download(name, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function LocationMap() {
  const [geo, setGeo] = useState(null);
  useEffect(() => { fetch('/data/region.json').then(r => r.ok ? r.json() : null).then(setGeo).catch(() => {}); }, []);
  const project = ([lon, lat]) => [(lon - 86.8) / 8.5 * 500, (27.5 - lat) / 7 * 330];
  const polygonPath = coordinates => coordinates.map(ring => ring.map((p, i) => `${i ? 'L' : 'M'}${project(p).join(',')}`).join(' ') + 'Z').join(' ');
  const point = project([90.4125, 23.8103]);
  return <div className="locator">
    <svg viewBox="0 0 500 330" role="img" aria-label="Regional locator showing Dhaka in Bangladesh. This is not a temperature map.">
      <defs><pattern id="grid" width="58.82" height="47.14" patternUnits="userSpaceOnUse"><path d="M58.82 0H0V47.14" fill="none" stroke="#ffffff0e" /></pattern></defs>
      <rect width="500" height="330" fill="#173a39"/><rect width="500" height="330" fill="url(#grid)"/>
      {geo?.features.map((feature, i) => <path key={i} d={feature.geometry.type === 'Polygon' ? polygonPath(feature.geometry.coordinates) : feature.geometry.coordinates.map(polygonPath).join(' ')} fill={feature.properties.name === 'Bangladesh' ? '#486453' : '#254745'} stroke="#749084" strokeWidth="1"/>) }
      <text x="65" y="85" className="map-label">INDIA</text><text x="346" y="243" className="map-label">MYANMAR</text>
      <text x="160" y="303" className="water-label">Bay of Bengal</text>
      {geo && <text x="194" y="110" className="map-label country">BANGLADESH</text>}
      <circle cx={point[0]} cy={point[1]} r="23" fill="#caee8514"/>
      <circle cx={point[0]} cy={point[1]} r="12" fill="#caee8525" stroke="#caee8570"/>
      <circle cx={point[0]} cy={point[1]} r="5" fill="#d3f095"/>
      <rect x={point[0]+17} y={point[1]-14} width="75" height="29" rx="5" fill="#f4f8ef"/>
      <text x={point[0]+31} y={point[1]+5} fill="#163531" fontSize="14" fontWeight="700">Dhaka</text>
    </svg>
    <span className="map-caption">{geo ? 'Regional locator · Natural Earth' : 'Coordinate locator · boundaries unavailable'}</span>
  </div>;
}

function ChartTip({ active, payload, label, monthly }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return <div className="chart-tooltip"><strong>{label}</strong><p>{row.temperature.toFixed(2)} °C <span>{monthly ? 'monthly mean' : 'annual mean'}</span></p>{!monthly && <small>Fitted trend: {row.trend.toFixed(2)} °C</small>}</div>;
}

function ExplorerIntro({ onExport }) {
  const surface = useRef(null);
  const pendingFrame = useRef(0);
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  const [simple, setSimple] = useState(false), [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const scenic = ready && !simple && !failed;

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const node = surface.current;
    let frame = 0;
    const reset = () => {
      node.style.setProperty('--pointer-x', '0px');
      node.style.setProperty('--pointer-y', '0px');
      node.style.setProperty('--scroll-y', '0px');
    };
    reset();
    if (!scenic || paused || reducedMotion) return;
    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      node.style.setProperty('--scroll-y', `${Math.min(28, Math.max(-28, (108 - rect.top) * 0.12))}px`);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', scroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', scroll);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(pendingFrame.current);
      pendingFrame.current = 0;
    };
  }, [scenic, paused, reducedMotion]);

  const pointer = event => {
    if (!scenic || paused || reducedMotion || event.pointerType === 'touch') return;
    const node = surface.current;
    const rect = node.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 22;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 14;
    cancelAnimationFrame(pendingFrame.current);
    pendingFrame.current = requestAnimationFrame(() => {
      node.style.setProperty('--pointer-x', `${x}px`);
      node.style.setProperty('--pointer-y', `${y}px`);
      pendingFrame.current = 0;
    });
  };
  const resetPointer = () => {
    cancelAnimationFrame(pendingFrame.current);
    pendingFrame.current = 0;
    surface.current.style.setProperty('--pointer-x', '0px');
    surface.current.style.setProperty('--pointer-y', '0px');
  };

  return <section ref={surface} className={`page-heading explorer-intro ${scenic ? 'with-image' : ''}`} aria-label="Trend explorer introduction" onPointerMove={pointer} onPointerLeave={resetPointer}>
    {!failed && <img className="intro-image" src="/earth-horizon.png" alt="" aria-hidden="true" onLoad={() => setReady(true)} onError={() => {setFailed(true); setReady(false);}} fetchPriority="high"/>}
    <div className="intro-shade" aria-hidden="true"/>
    <div className="intro-copy"><p className="eyebrow">BE AN EARTH SYSTEM TREND DETECTIVE</p><h1>Every trend tells a story.</h1><p className="subtitle">Investigate what is changing around Dhaka, by how much, and whether the trend is statistically significant.</p>
      {scenic && <span className="intro-caption">Earth illustration · AI-generated</span>}
    </div>
    <div className="intro-actions"><button className="button secondary" onClick={onExport}><Download size={16}/>Export findings</button>
      {ready && !failed && <div className="intro-view-tools">
        {scenic && !reducedMotion && <button className="intro-tool" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={13}/> : <Pause size={13}/>}<span>{paused ? 'Resume motion' : 'Pause motion'}</span></button>}
        <button className="intro-tool" aria-pressed={simple} onClick={() => setSimple(!simple)}><Layers size={13}/><span>{simple ? 'Scenic view' : 'Simple view'}</span></button>
      </div>}
    </div>
  </section>;
}

function App() {
  const [data, setData] = useState(null), [error, setError] = useState('');
  const [periodKey, setPeriodKey] = useState('1981-2024'), [view, setView] = useState('annual');
  const [tab, setTab] = useState('explore'), [answer, setAnswer] = useState('trend');
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    fetch('/data/dhaka.json').then(r => { if (!r.ok) throw new Error('The prepared NASA dataset is unavailable.'); return r.json(); })
      .then(setData).catch(e => setError(e.message));
  }, []);
  if (!data) return <main className="loading"><Activity size={36}/><h1>TerraPulse AI</h1><p>{error || 'Opening the NASA data snapshot…'}</p>{error && <button onClick={() => window.location.reload()}><RefreshCw size={16}/>Try again</button>}</main>;
  const result = data.periods[periodKey];
  const monthly = view === 'monthly';
  const rows = monthly ? data.monthly.filter(r => r.year >= result.start && r.year <= result.end) : result.rows;
  const direction = result.slopePerDecade >= 0 ? 'warming' : 'cooling';
  const significantText = result.significant ? `Evidence of ${direction}` : 'No clear trend detected';
  const interval = `${signed(result.ci95[0])} to ${signed(result.ci95[1])}`;
  const explanations = {
    trend: `For ${result.start}–${result.end}, the NASA POWER grid estimate near Dhaka has an estimated ${direction} rate of ${signed(result.slopePerDecade)} °C per decade. The approximate 95% confidence interval is ${interval} °C per decade. ${result.significant ? 'The interval excludes zero, supporting a trend under this analysis’s assumptions.' : 'The interval includes zero, so this period does not provide clear evidence of a trend under this analysis’s assumptions. This does not prove that no change occurred.'}`,
    confidence: `The approximate 95% interval (${interval} °C per decade) expresses uncertainty in the fitted slope. We use annual means and a Newey–West adjustment for short-lag dependence. It does not include every uncertainty in the NASA model. The two-sided p-value is ${pformat(result.pValue)}; our exploratory threshold is 0.05.`,
    source: `These are NASA POWER T2M values derived from MERRA-2 reanalysis: air temperature at 2 meters. The source combines a model with assimilated observations. Its approximately 0.5° × 0.625° grid describes a broader region around Dhaka, not individual streets or a city-boundary average.`,
    period: 'Shorter periods can be dominated by year-to-year variability. Try the full record and then 2001–2024 using the period selector. A change in significance is a reason to discuss uncertainty—not to choose whichever period tells the most dramatic story.'
  };
  function exportCsv() {
    const selected = data.annual.filter(r => r.year >= result.start && r.year <= result.end);
    download(`terrapulse-dhaka-${periodKey}.csv`, 'year,air_temperature_c,source,parameter,latitude,longitude\n' + selected.map(r => `${r.year},${r.temperature},NASA POWER MERRA-2,T2M,23.8103,90.4125`).join('\n'), 'text/csv');
  }
  function exportReport() {
    download(`terrapulse-dhaka-${periodKey}-report.txt`, `TerraPulse AI | Team Neurastra\n\n${explanations.trend}\n\nSOURCE\n${explanations.source}\n${data.source.url}\nRetrieved: ${data.source.retrievedAt}\nRaw SHA256: ${data.source.sha256}\n\nMETHOD\n${result.method}\nMonthly means weighted by days in each month; complete years only; NASA month 13 excluded.\n\nLIMITATIONS\n${data.limitations.join('\n')}\n\nThis prototype uses prepared data and deterministic explanations, not a live LLM.\n`);
  }
  return <div className="app-shell">
    <aside className={`sidebar ${menu ? 'open' : ''}`}>
      <a className="brand" href="#" onClick={e => {e.preventDefault(); setTab('explore');}}><span className="brand-mark"><Activity size={24}/></span><span>TerraPulse <b>AI</b></span></a>
      <div className="workspace-label">EARTH OBSERVATORY</div>
      <nav aria-label="Main navigation">
        <button className={tab === 'explore' ? 'active' : ''} onClick={() => {setTab('explore'); setMenu(false);}}><Globe2 size={19}/>Trend explorer</button>
        <button className={tab === 'method' ? 'active' : ''} onClick={() => {setTab('method'); setMenu(false);}}><Microscope size={19}/>Data & methodology</button>
      </nav>
      <div className="sidebar-note"><Layers size={21}/><strong>One place. A longer view.</strong><p>Investigate change with evidence you can trace.</p><span>1981 — 2024</span></div>
      <div className="team"><span className="avatar">N</span><div><strong>Team Neurastra</strong><small>Space Apps · prototype</small></div></div>
    </aside>
    {menu && <button className="backdrop" aria-label="Close navigation" onClick={() => setMenu(false)}/>}
    <div className="main-shell">
      <header className="topbar"><button className="mobile-menu icon-btn" aria-label="Toggle navigation" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button><div className="breadcrumb">Workspace <span>/</span> <strong>{tab === 'explore' ? 'Trend explorer' : 'Data & methodology'}</strong></div><span className="snapshot"><span/>Verified NASA data snapshot</span></header>
      <main>
        {tab === 'explore' ? <ExplorerIntro onExport={exportReport}/> : <div className="page-heading"><div><p className="eyebrow">BE AN EARTH SYSTEM TREND DETECTIVE</p><h1>Follow the evidence.</h1><p className="subtitle">A transparent path from NASA data to an interpretable result.</p></div></div>}

        {tab === 'explore' && <>
          <section className="controls" aria-label="Analysis settings"><div className="control"><MapPin size={18}/><div><span>LOCATION</span><strong>Dhaka, Bangladesh</strong></div><span className="tiny-tag">Study region</span></div><div className="control"><Thermometer size={18}/><div><span>VARIABLE</span><strong>2-meter air temperature</strong></div></div><label className="control period"><div><span>ANALYSIS PERIOD</span><select value={periodKey} onChange={e => {setPeriodKey(e.target.value); setAnswer('trend');}} aria-label="Analysis period"><option value="1981-2024">1981 – 2024 · full record</option><option value="2001-2024">2001 – 2024 · recent decades</option><option value="2015-2024">2015 – 2024 · short record</option></select></div><ChevronDown size={16}/></label></section>
          <div className="section-label"><span>THE EVIDENCE AT A GLANCE</span><span>{result.n} complete years · {result.n * 12} monthly values</span></div>
          <section className="metrics" aria-label="Trend results">
            <article className="metric"><div className="metric-label">Estimated temperature trend{direction === 'warming' ? <ArrowUpRight size={19}/> : <ArrowDownRight size={19}/>}</div><div className="metric-value">{signed(result.slopePerDecade)}<span>°C / decade</span></div><p>{direction === 'warming' ? 'Upward' : 'Downward'} fitted trend · {result.start}–{result.end}</p></article>
            <article className="metric"><div className="metric-label">95% confidence interval<Info size={17}/></div><div className="metric-value interval">{signed(result.ci95[0])}<span className="to">to</span>{signed(result.ci95[1])}</div><p>°C / decade · approximate, HAC-adjusted</p></article>
            <article className={`metric evidence ${result.significant ? 'supported' : ''}`}><div className="metric-label">Statistical evidence<ShieldCheck size={18}/></div><div className="evidence-title">{significantText}</div><p>p {pformat(result.pValue)} · threshold 0.05</p></article>
          </section>
          <div className="analysis-grid">
            <section className="panel chart-panel"><div className="panel-heading"><div><h2>Temperature through time</h2><p>{monthly ? 'Monthly values reveal seasonal variation' : 'Annual means and the estimated trend'} · °C</p></div><div className="segmented" aria-label="Chart view"><button aria-pressed={!monthly} className={!monthly ? 'selected' : ''} onClick={() => setView('annual')}>Annual</button><button aria-pressed={monthly} className={monthly ? 'selected' : ''} onClick={() => setView('monthly')}>Monthly</button></div></div>
              <div className="chart-legend"><span><i className="legend-line"/> {monthly ? 'Monthly' : 'Annual'} temperature</span>{!monthly && <><span><i className="legend-dashed"/> Fitted trend</span><span><i className="legend-band"/> 95% mean-trend band</span></>}</div>
              <div className="chart" role="img" aria-label={`${monthly ? 'Monthly' : 'Annual'} temperature chart for Dhaka, ${result.start} to ${result.end}. Estimated trend ${signed(result.slopePerDecade)} degrees Celsius per decade.`}>
                <ResponsiveContainer width="100%" height="100%"><ComposedChart data={rows} margin={{top:12,right:14,left:-16,bottom:8}} accessibilityLayer><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e7ece8"/><XAxis dataKey={monthly ? 'date' : 'year'} tickLine={false} axisLine={false} minTickGap={40} tick={{fontSize:12,fill:'#74817b'}} tickFormatter={v => monthly ? String(v).slice(0,4) : v}/><YAxis domain={['auto','auto']} tickLine={false} axisLine={false} tick={{fontSize:12,fill:'#74817b'}} tickFormatter={v => v.toFixed(1)}/><Tooltip content={<ChartTip monthly={monthly}/>} />{!monthly && <Area dataKey="band" stroke="none" fill="#dce8d4" fillOpacity={0.7} isAnimationActive={false}/>}{!monthly && <Line type="linear" dataKey="trend" stroke="#526842" strokeWidth={2} strokeDasharray="6 5" dot={false} isAnimationActive={false}/>}<Line type="linear" dataKey="temperature" stroke="#1b7c68" strokeWidth={monthly ? 1.5 : 2.5} dot={monthly ? false : {r:3,fill:'#ffffff',strokeWidth:2}} activeDot={{r:5}} isAnimationActive={false}/></ComposedChart></ResponsiveContainer>
              </div><div className="chart-footer"><span><Check size={14}/> Complete years only · no gap filling</span><button className="text-button" onClick={exportCsv}><Download size={14}/>Download annual CSV</button></div>
              {monthly && <p className="chart-notice">Trend statistics above use annual means. The monthly view shows seasonality; no monthly trend is fitted.</p>}
            </section>
            <section className="panel location-panel"><div className="panel-heading"><div><h2>A closer look at the place</h2><p>Dhaka region · Bangladesh</p></div><MapPin size={20}/></div><LocationMap/><div className="location-meta"><span>23.8103° N · 90.4125° E</span><p>Regional grid estimate. This locator does not show temperature coverage or city-scale detail.</p></div></section>
          </div>
          <section className="insight"><div className="insight-icon"><MessageSquare size={22}/></div><div className="insight-content"><div className="insight-heading"><h2>TerraAgent <span>Explain the evidence</span></h2><span className="tiny-tag">Guided explanations · no live AI</span></div><div className="question-chips">{[['trend','What does this trend mean?'],['confidence','How certain is it?'],['source','Where is the data from?'],['period','Why does the period matter?']].map(([key,label]) => <button key={key} className={answer === key ? 'selected' : ''} aria-pressed={answer === key} onClick={() => setAnswer(key)}>{label}</button>)}</div><p className="answer" aria-live="polite">{explanations[answer]}</p><a href={data.source.documentation} target="_blank" rel="noreferrer">Source: NASA POWER / MERRA-2<ExternalLink size={12}/></a></div></section>
          <div className="honesty-note"><Info size={17}/><p>This is an exploratory analysis of a regional model estimate. Statistical significance does not establish a cause, and a nonsignificant trend does not prove no change. <button onClick={() => setTab('method')}>Read the methodology</button></p></div>
        </>}

        {tab === 'method' && <div className="method-grid"><section className="panel prose"><h2>01 / The source</h2><p>NASA POWER provides <strong>T2M: air temperature at 2 meters</strong>, derived here from the MERRA-2 reanalysis model. These are regional model estimates informed by observations, not a direct satellite surface-temperature record.</p><dl><dt>Requested location</dt><dd>23.8103° N, 90.4125° E</dd><dt>Spatial resolution</dt><dd>{data.source.resolution}</dd><dt>Record</dt><dd>January 1981 – December 2024</dd><dt>Valid monthly values</dt><dd>{data.quality.validMonths} / {data.quality.expectedMonths}</dd><dt>Retrieved</dt><dd>{new Date(data.source.retrievedAt).toLocaleDateString('en-GB', {timeZone:'UTC'})} UTC</dd></dl><div className="source-links"><a href={data.source.url} target="_blank" rel="noreferrer">Exact NASA API request<ExternalLink size={14}/></a><a href={data.source.documentation} target="_blank" rel="noreferrer">Monthly API documentation<ExternalLink size={14}/></a><a href={data.source.resolutionDocumentation} target="_blank" rel="noreferrer">Resolution and data FAQ<ExternalLink size={14}/></a><a href="/data/dhaka.json" download>Download prepared dataset<Download size={14}/></a></div></section>
          <section className="panel prose"><h2>02 / From data to a trend</h2><ol><li>Validate the monthly values and exclude the fill value. Do not treat NASA’s month 13 summary as an extra month.</li><li>Weight each monthly mean by the number of calendar days. Keep years with all 12 months; do not interpolate gaps.</li><li>Fit an ordinary least-squares line to annual means. Report its slope in °C per decade.</li><li>Estimate covariance using Newey–West HAC with one annual lag, Bartlett weights, and n/(n−2) correction.</li><li>Use an approximate t distribution with n−2 degrees of freedom for a two-sided p-value and 95% interval.</li></ol><p>The green band is uncertainty in the fitted <strong>mean trend</strong>, not a prediction interval for individual years. The p-value and interval are exploratory and depend on the method’s assumptions.</p><a href="https://www.statsmodels.org/stable/generated/statsmodels.stats.sandwich_covariance.cov_hac.html" target="_blank" rel="noreferrer">HAC method reference<ExternalLink size={14}/></a></section>
          <section className="panel prose limitations"><h2>03 / What this cannot tell us</h2><ul>{data.limitations.map(text => <li key={text}>{text}</li>)}</ul><p>Periods are fixed in advance in this prototype. Compare all three rather than selecting a period only because its result is significant. No correction is made for comparing multiple periods.</p><p>A local cooling estimate is not evidence against global warming. Regional variability, changes in assimilated observations, and possible breaks in a reanalysis series need further investigation. We have not established a cause for this result.</p><p>TerraAgent currently uses deterministic explanations of the computed results. A live LLM, more locations, and satellite land surface temperature are future work.</p><a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Locator boundaries: Natural Earth, public domain<ExternalLink size={14}/></a></section></div>}

        <footer><span>TerraPulse AI <span className="footer-dot">/</span> Team Neurastra</span><span>NASA data. Transparent methods. Clearer understanding.</span></footer>
      </main>
    </div>
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
