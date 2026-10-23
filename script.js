/* Mindcast: front end for the Mental Health Prediction API */

// Change this if your FastAPI server runs somewhere else.
const API_URL = 'http://127.0.0.1:8000';

// Dataset means from the notebook's df.describe().
const MEAN = 6.2, SMIN = 3, SMAX = 10;
const AVG = { sleep: 6.6, study: 3.0, move: 1.75, screen: 5.1 };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- build the form controls ---------- */

const SLIDERS = [
  ['sleep_hours_per_night', 'Sleep per night', 2, 12, 0.1, 6.6, ' h', '5.6 – 7.5 h'],
  ['study_hours', 'Study per day', 0, 12, 0.1, 3, ' h', '1.5 – 4.2 h'],
  ['physical_activity_hours', 'Physical activity per day', 0, 5, 0.1, 1.7, ' h', '1.3 – 2.2 h'],
  ['avg_daily_usage_hours', 'Social media per day', 0, 16, 0.1, 5, ' h', '3.8 – 6.3 h'],
  ['daily_unlocks', 'Phone unlocks per day', 0, 400, 1, 171, '', '140 – 204'],
];

$('#sliders').innerHTML = SLIDERS.map(([k, l, min, max, step, v, u, typ]) => `
  <div class="sl">
    <div class="sl-h"><label for="${k}">${l}</label><output id="o-${k}"></output></div>
    <input type="range" id="${k}" min="${min}" max="${max}" step="${step}" value="${v}">
    <p class="hint">Middle half of students: ${typ}</p>
  </div>`).join('');

const seg = (name, opts, def, cls = {}) => opts.map(([v, t]) =>
  `<label class="${cls[v] || ''}"><input type="radio" name="${name}" value="${v}" ${v === def ? 'checked' : ''}><span>${t}</span></label>`).join('');

$('#g-gender').innerHTML = seg('gender', [['Female', 'Female'], ['Male', 'Male']], '');
$('#g-academic').innerHTML = seg('academic_level', [['High School', 'High school'], ['Undergraduate', 'Undergraduate'], ['Graduate', 'Graduate']], 'Undergraduate');
$('#g-purpose').innerHTML = seg('purpose_of_use', ['Entertainment', 'Networking', 'Education', 'News'].map(x => [x, x]), 'Entertainment');
$('#g-stress').innerHTML = seg('stress_level', [['Low', 'Low'], ['Medium', 'Medium'], ['High', 'High'], ['Very High', 'Very high']], 'Medium',
  { Low: 'l', Medium: 'm', High: 'h', 'Very High': 'v' });

$('#country').innerHTML = '<option value="" disabled selected>Choose a country</option>' +
  ['India', 'USA', 'Canada', 'Australia', 'UK', 'Germany', 'Mexico', 'Turkey', 'France'].map(c => `<option>${c}</option>`).join('') +
  '<option value="Other">Another country</option>';

$('#platform').innerHTML = [['Instagram'], ['TikTok'], ['Facebook'], ['LinkedIn'], ['YouTube'], ['Twitter', 'Twitter / X'],
  ['Snapchat'], ['WhatsApp'], ['LINE'], ['VKontakte'], ['KakaoTalk'], ['WeChat']]
  .map(([v, t]) => `<option value="${v}">${t || v}</option>`).join('');

const val = k => Number($('#' + k).value);

/* ---------- live slider readouts + day budget ---------- */

function paintSlider(el) {
  const p = ((el.value - el.min) / (el.max - el.min)) * 100;
  el.style.setProperty('--p', p + '%');
  const u = SLIDERS.find(s => s[0] === el.id)[6];
  $('#o-' + el.id).textContent = (el.step < 1 ? Number(el.value).toFixed(1) : el.value) + u;
}

function paintBudget() {
  const s = val('sleep_hours_per_night'), st = val('study_hours'), m = val('physical_activity_hours');
  const total = s + st + m;
  $('#b-sleep').style.width = Math.min(s / 24 * 100, 100) + '%';
  $('#b-study').style.width = Math.min(st / 24 * 100, 100 - s / 24 * 100) + '%';
  $('#b-move').style.width = Math.min(m / 24 * 100, Math.max(100 - (s + st) / 24 * 100, 0)) + '%';
  const over = total > 24;
  $('.budget').classList.toggle('over', over);
  $('#b-text').textContent = over
    ? `Sleep, study and activity add up to ${total.toFixed(1)} h, more than a day.`
    : `Sleep, study and activity cover ${total.toFixed(1)} of 24 hours. Social media overlaps with the rest.`;
}

$$('input[type=range]').forEach(el => {
  paintSlider(el);
  el.addEventListener('input', () => { paintSlider(el); paintBudget(); });
});
paintBudget();

/* ---------- age + API status ---------- */

const age = $('#age');
const checkAge = () => { const a = +age.value; $('#age-note').hidden = !(a && (a < 18 || a > 24)); };
age.addEventListener('input', checkAge);
checkAge();

async function pingApi() {
  const el = $('#status');
  try {
    const r = await fetch(`${API_URL}/`);
    if (!r.ok) throw 0;
    el.dataset.state = 'ok'; el.textContent = 'API connected';
  } catch { el.dataset.state = 'down'; el.textContent = 'API not reachable'; }
}
pingApi();

/* ---------- validation + payload (unchanged logic) ---------- */

const form = $('#form');
const setInvalid = (el, on) => { el.classList.toggle('invalid', on); const m = $('.msg', el); if (m) m.hidden = !on; };
form.addEventListener('change', e => {
  if (e.target.name === 'gender') setInvalid($('#f-gender'), false);
  if (e.target.id === 'country') setInvalid($('#f-country'), false);
});

const showError = t => { const b = $('#error'); b.textContent = t; b.hidden = false; };

function validate() {
  const bad = [];
  if (!form.elements.gender.value) { setInvalid($('#f-gender'), true); bad.push($('#f-gender')); }
  if (!$('#country').value) { setInvalid($('#f-country'), true); bad.push($('#f-country')); }
  const a = +age.value;
  if (!a || a < 10 || a > 100) { showError('Age needs to be between 10 and 100.'); bad.push($('#f-age')); }
  const booked = val('sleep_hours_per_night') + val('study_hours') + val('physical_activity_hours');
  if (booked > 24) {
    showError(`Sleep, study and activity add up to ${booked.toFixed(1)} hours, which is more than a day. Trim ${(booked - 24).toFixed(1)} hours and try again.`);
    bad.push($('.budget'));
  }
  if (bad.length) bad[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  return !bad.length;
}

function buildPayload() {
  const f = form.elements;
  return {
    age: parseInt(age.value, 10),
    gender: f.gender.value,
    country: $('#country').value,
    academic_level: f.academic_level.value,
    most_used_platform: $('#platform').value,
    purpose_of_use: f.purpose_of_use.value,
    avg_daily_usage_hours: val('avg_daily_usage_hours'),
    daily_unlocks: Math.round(val('daily_unlocks')),
    study_hours: val('study_hours'),
    physical_activity_hours: val('physical_activity_hours'),
    sleep_hours_per_night: val('sleep_hours_per_night'),
    stress_level: f.stress_level.value,
  };
}

function explain(status, body) {
  if (status === 422 && body && Array.isArray(body.detail))
    return 'The API rejected these answers: ' + body.detail.map(d => `${d.loc[d.loc.length - 1]} (${d.msg})`).join('; ') + '.';
  return `The API returned an error (${status}). Check the server logs for details.`;
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  $('#error').hidden = true;
  if (!validate()) return;

  const btn = $('#go'), label = $('#go-label');
  btn.disabled = true; label.textContent = 'Analysing your day…';

  try {
    const res = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload()),
    });
    let body = null;
    try { body = await res.json(); } catch { /* non-JSON error page */ }
    if (!res.ok) throw Object.assign(new Error('api'), { status: res.status, body });
    showResults(body.predicted_mental_health_score, buildPayload());
    label.textContent = 'Update my estimate';
  } catch (err) {
    label.textContent = 'Generate my estimate';
    if (err.status) showError(explain(err.status, err.body));
    else { showError(`Could not reach the API at ${API_URL}. Make sure the FastAPI server is running and that the address in script.js matches it.`); pingApi(); }
  } finally { btn.disabled = false; }
});

/* ---------- results dashboard ---------- */

const GAUGE_LEN = 2 * Math.PI * 80 * 0.75;
const frac = s => Math.min(Math.max((s - SMIN) / (SMAX - SMIN), 0), 1);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function countUp(el, to) {
  if (reduce) { el.textContent = to; return; }
  const t0 = performance.now();
  const tick = n => {
    const t = Math.min((n - t0) / 1100, 1);
    el.textContent = Math.round(to * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function band(score) {
  if (score >= 7) return ['mid-high', 'Healthy range', 'A strong result: above the middle of what students reported.'];
  if (score >= 6) return ['mid', 'Balanced', 'Around the middle of what students reported.'];
  if (score === 5) return ['mid', 'Worth watching', 'A little below the middle of what students reported.'];
  return ['low', 'Needs attention', 'Near the bottom of what students in the data reported.'];
}

function indicators(p) {
  const lvl = (v, good, watch, higherBetter) =>
    higherBetter ? (v >= good ? 'good' : v >= watch ? 'watch' : 'alert') : (v <= good ? 'good' : v <= watch ? 'watch' : 'alert');
  const sleepS = p.sleep_hours_per_night >= 7 && p.sleep_hours_per_night <= 9 ? 'good'
    : p.sleep_hours_per_night >= 6 && p.sleep_hours_per_night <= 10 ? 'watch' : 'alert';
  const stressS = { Low: 'good', Medium: 'watch', High: 'alert', 'Very High': 'alert' }[p.stress_level];
  return [
    ['Sleep', `${p.sleep_hours_per_night.toFixed(1)} h`, sleepS, p.sleep_hours_per_night / 10, 'Aim for 7–9 h'],
    ['Physical activity', `${p.physical_activity_hours.toFixed(1)} h`, lvl(p.physical_activity_hours, 1.5, 0.75, true), p.physical_activity_hours / 4, 'Aim for 1.5 h or more'],
    ['Social media', `${p.avg_daily_usage_hours.toFixed(1)} h`, lvl(p.avg_daily_usage_hours, 4, 6.5, false), p.avg_daily_usage_hours / 10, 'Student average is 5.1 h'],
    ['Stress', p.stress_level, stressS, { Low: .25, Medium: .5, High: .75, 'Very High': 1 }[p.stress_level], 'Self-reported'],
  ];
}
const CHIP = { good: 'On track', watch: 'Watch', alert: 'Needs attention' };

function showResults(score, p) {
  const [cls, title, text] = band(score);
  const diff = score - MEAN, ad = Math.abs(diff).toFixed(1);
  const rel = Math.abs(diff) < 0.5 ? 'That is right at the student average of 6.2.'
    : `That is ${ad} ${ad === '1.0' ? 'point' : 'points'} ${diff > 0 ? 'above' : 'below'} the student average of 6.2.`;

  $('#empty').hidden = true;
  const dash = $('#dash');
  dash.hidden = false;
  dash.classList.remove('show'); void dash.offsetWidth; dash.classList.add('show');
  $('#res-sub').textContent = 'Based on the answers you just submitted.';

  const b = $('#band');
  b.textContent = title; b.className = 'band ' + (cls === 'mid' ? 'mid' : cls === 'low' ? 'low' : '');
  $('#res-text').textContent = `${text} ${rel}`;
  $('#care').hidden = score > 5;
  $('#s-avg').style.left = frac(MEAN) * 100 + '%';

  // reset, then animate in
  $('#g-fill').style.strokeDasharray = `0 ${GAUGE_LEN * 2}`;
  $('#s-fill').style.width = '0%';
  const ind = indicators(p);
  $('#ind').innerHTML = ind.map(([n, v, s, w, hint]) => `
    <li class="${s}"><span><span class="n">${n}</span><span class="v">${v}</span></span><span class="chip">${CHIP[s]}</span>
    <div class="trk" role="img" aria-label="${n}: ${v}, ${CHIP[s]}. ${hint}"><i data-w="${Math.min(Math.max(w, .04), 1) * 100}"></i></div></li>`).join('');

  const rows = [['Sleep', p.sleep_hours_per_night, AVG.sleep], ['Study', p.study_hours, AVG.study],
    ['Activity', p.physical_activity_hours, AVG.move], ['Social media', p.avg_daily_usage_hours, AVG.screen]];
  $('#cmp').innerHTML = rows.map(([n, you, avg]) => {
    const max = Math.max(you, avg, 0.5) * 1.05;
    return `<div class="row"><span>${n}</span><div class="bars">
      <div class="b you"><i data-w="${you / max * 70}"></i>${you.toFixed(1)} h</div>
      <div class="b avg"><i data-w="${avg / max * 70}"></i>${avg.toFixed(1)} h</div></div></div>`;
  }).join('');

  // plain-language observations from the inputs (not model internals)
  const notes = [];
  if (p.sleep_hours_per_night < 7) notes.push(['alert', 'Sleep is short', `${p.sleep_hours_per_night.toFixed(1)} h is under the 7–9 h commonly recommended.`]);
  else if (p.sleep_hours_per_night <= 9) notes.push(['good', 'Sleep is on track', `${p.sleep_hours_per_night.toFixed(1)} h sits inside the 7–9 h range.`]);
  if (p.avg_daily_usage_hours > AVG.screen + 1) notes.push(['watch', 'Heavy social media use', `${p.avg_daily_usage_hours.toFixed(1)} h is above the student average of 5.1 h.`]);
  else if (p.avg_daily_usage_hours <= 4) notes.push(['good', 'Light social media use', `${p.avg_daily_usage_hours.toFixed(1)} h is below the student average.`]);
  if (p.physical_activity_hours < 1) notes.push(['watch', 'Little movement', 'Under an hour of activity a day. Short walks count.']);
  if (['High', 'Very High'].includes(p.stress_level)) notes.push(['alert', 'Stress is elevated', 'High stress is worth addressing alongside sleep and screen habits.']);
  if (!notes.length) notes.push(['good', 'Balanced routine', 'Your habits sit close to healthy ranges across the board.']);
  $('#ins').innerHTML = notes.slice(0, 4).map(([c, t, d]) => `<li class="${c}"><b>${t}</b><span>${d}</span></li>`).join('');

  countUp($('#score'), score);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $('#g-fill').style.strokeDasharray = `${frac(score) * GAUGE_LEN} ${GAUGE_LEN * 2}`;
    $('#s-fill').style.width = frac(score) * 100 + '%';
    $$('[data-w]', dash).forEach(i => { i.style.width = i.dataset.w + '%'; });
  }));

  $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}