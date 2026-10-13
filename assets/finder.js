/* LocalPlumbers finder: pick country → region → job → urgency, then see a
   plan for that area on /find-a-plumber/. Pages opt in with <div data-finder>
   (form) and <div data-finder-result> (plan). Choices travel in the URL hash
   (#uk/london/boiler/now). The optional town / postcode never leaves the
   browser: it's kept in sessionStorage only. */
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var store = function (kind) {
    return {
      get: function (k) { try { return window[kind].getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { window[kind].setItem(k, v); } catch (e) { /* storage blocked */ } },
    };
  };
  var local = store('localStorage'), session = store('sessionStorage');
  var slug = function (s) { return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };

  /* ---------- Data ---------- */
  var UK_REGIONS = [
    ['England', ['London', 'South East England', 'South West England', 'East of England', 'East Midlands', 'West Midlands', 'Yorkshire and the Humber', 'North West England', 'North East England']],
    ['Scotland', ['Scotland']], ['Wales', ['Wales']], ['Northern Ireland', ['Northern Ireland']],
  ];
  var US_STATES = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
  var US_GROUPS = [
    ['Northeast', ['Connecticut', 'Maine', 'Massachusetts', 'New Hampshire', 'New Jersey', 'New York', 'Pennsylvania', 'Rhode Island', 'Vermont']],
    ['Midwest', ['Illinois', 'Indiana', 'Iowa', 'Kansas', 'Michigan', 'Minnesota', 'Missouri', 'Nebraska', 'North Dakota', 'Ohio', 'South Dakota', 'Wisconsin']],
    ['South', ['Alabama', 'Arkansas', 'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Kentucky', 'Louisiana', 'Maryland', 'Mississippi', 'North Carolina', 'Oklahoma', 'South Carolina', 'Tennessee', 'Texas', 'Virginia', 'West Virginia']],
    ['West', ['Alaska', 'Arizona', 'California', 'Colorado', 'Hawaii', 'Idaho', 'Montana', 'Nevada', 'New Mexico', 'Oregon', 'Utah', 'Washington', 'Wyoming']],
  ];
  var COUNTRIES = {
    uk: { name: 'United Kingdom', short: 'UK', regionLabel: 'Region or nation', townLabel: 'Town or postcode', townHint: 'e.g. Leeds or LS1', groups: UK_REGIONS },
    us: { name: 'United States', short: 'USA', regionLabel: 'State', townLabel: 'City or ZIP code', townHint: 'e.g. Austin or 78701', groups: US_GROUPS },
  };
  // [id, label, guide page, gas work?]
  var JOBS = {
    uk: [
      ['leak', 'Leak or burst pipe', 'leaks-and-burst-pipes'],
      ['boiler', 'Boiler repair, service or new boiler', 'boiler-repair', true],
      ['heating', 'Central heating or radiators', 'boiler-repair', true],
      ['drain', 'Blocked drain, sink or toilet', 'blocked-drains'],
      ['fix', 'Dripping tap, toilet or shower fault', 'leaks-and-burst-pipes'],
      ['install', 'Bathroom or kitchen installation', 'bathroom-plumbing'],
      ['hotwater', 'Hot water cylinder or no hot water', 'boiler-repair'],
      ['other', 'Something else', 'choosing-a-plumber'],
    ],
    us: [
      ['leak', 'Leak or burst pipe', 'leaks-and-burst-pipes'],
      ['waterheater', 'Water heater repair or replacement', 'water-heater-repair', true],
      ['drain', 'Clogged drain, sink or toilet', 'blocked-drains'],
      ['sewer', 'Sewer line problem', 'blocked-drains'],
      ['fix', 'Dripping faucet, running toilet or shower fault', 'leaks-and-burst-pipes'],
      ['install', 'Bathroom or kitchen remodel plumbing', 'bathroom-plumbing'],
      ['sump', 'Sump pump or garbage disposal', 'choosing-a-plumber'],
      ['other', 'Something else', 'choosing-a-plumber'],
    ],
  };
  var WHEN = [['now', 'Emergency: today'], ['week', 'In the next few days'], ['plan', 'Planning ahead']];

  var regionsOf = function (c) { return COUNTRIES[c].groups.reduce(function (a, g) { return a.concat(g[1]); }, []); };
  var findRegion = function (c, id) { return regionsOf(c).filter(function (r) { return slug(r) === id; })[0]; };
  var findJob = function (c, id) { return JOBS[c].filter(function (j) { return j[0] === id; })[0]; };

  /* ---------- Country preference (header switch) ---------- */
  var getCountry = function () { var c = local.get('lp-country'); return COUNTRIES[c] ? c : ''; };
  function setCountry(c) {
    if (!COUNTRIES[c]) return;
    local.set('lp-country', c);
    $$('[data-set-country]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setCountry === c)); });
    document.documentElement.dataset.country = c;
    // Referral links carry the region, so /go/ picks the right partner URL
    $$('a[href^="https://shmor.ai/go/"]').forEach(function (a) {
      var u = new URL(a.href); u.searchParams.set('r', c); a.href = u.toString();
    });
  }
  $$('[data-set-country]').forEach(function (b) {
    b.addEventListener('click', function () {
      setCountry(b.dataset.setCountry);
      $$('[data-finder] input[name=country]').forEach(function (r) { if (r.value === b.dataset.setCountry && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } });
    });
  });

  /* ---------- Finder form ---------- */
  var saved = function () { try { return JSON.parse(session.get('lp-find') || '{}'); } catch (e) { return {}; } };
  function fromHash() {
    var h = location.hash.replace(/^#/, '').split('/');
    if (!COUNTRIES[h[0]]) return null;
    return { country: h[0], region: h[1] || '', job: h[2] || '', when: h[3] || '' };
  }

  function buildForm(box) {
    var pre = fromHash() || saved();
    var country = pre.country || getCountry();
    box.innerHTML =
      '<form class="finder-form" novalidate>' +
      '<div class="finder-head"><span class="finder-kicker">Plumber finder</span><span class="finder-steps" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>' +
      '<fieldset class="f-step f-country"><legend><span class="f-num">1</span>Where are you?</legend><div class="seg">' +
      ['uk', 'us'].map(function (c) {
        return '<label class="seg-opt"><input type="radio" name="country" value="' + c + '"' + (c === country ? ' checked' : '') + ' required>' +
          '<span><b>' + COUNTRIES[c].short + '</b><small>' + COUNTRIES[c].name + '</small></span></label>';
      }).join('') + '</div></fieldset>' +
      '<div class="f-row">' +
      '<label class="f-step f-field"><span class="f-label"><span class="f-num">2</span><span data-region-label>Region</span></span><select name="region" required disabled><option value="">Choose your country first</option></select></label>' +
      '<label class="f-step f-field"><span class="f-label"><span class="f-num">3</span><span data-town-label>Town</span> <em>(optional)</em></span><input name="town" type="text" autocomplete="address-level2" maxlength="60" disabled></label>' +
      '</div><div class="f-row">' +
      '<label class="f-step f-field"><span class="f-label"><span class="f-num">4</span>What needs doing?</span><select name="job" required disabled><option value="">Choose your country first</option></select></label>' +
      '<fieldset class="f-step f-when"><legend class="f-label">How soon?</legend><div class="when">' +
      WHEN.map(function (w, i) { return '<label><input type="radio" name="when" value="' + w[0] + '"' + ((pre.when || 'week') === w[0] ? ' checked' : '') + '><span>' + w[1] + '</span></label>'; }).join('') +
      '</div></fieldset></div>' +
      '<button class="finder-go" type="submit" disabled><span data-go-label>Select your country and region</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></button>' +
      '<p class="finder-note">Free, no sign-up. Your town or postcode stays in your browser.</p>' +
      '</form>';

    var f = $('form', box);
    var region = f.elements.region, job = f.elements.job, town = f.elements.town, go = $('.finder-go', f);
    var steps = $$('.finder-steps i', f);

    function fill(c) {
      var C = COUNTRIES[c];
      $('[data-region-label]', f).textContent = C.regionLabel;
      $('[data-town-label]', f).textContent = C.townLabel;
      town.placeholder = C.townHint;
      region.innerHTML = '<option value="">Choose your ' + C.regionLabel.toLowerCase() + '</option>' + C.groups.map(function (g) {
        var opts = g[1].map(function (r) { return '<option value="' + slug(r) + '">' + esc(r) + '</option>'; }).join('');
        return g[1].length > 1 ? '<optgroup label="' + esc(g[0]) + '">' + opts + '</optgroup>' : opts;
      }).join('');
      job.innerHTML = '<option value="">Choose a job</option>' + JOBS[c].map(function (j) { return '<option value="' + j[0] + '">' + esc(j[1]) + '</option>'; }).join('');
      region.disabled = job.disabled = town.disabled = false;
    }
    function update() {
      var c = (f.elements.country.value || ''), r = region.value, j = job.value;
      steps.forEach(function (s, i) { s.classList.toggle('on', [c, r, j, c && r][i] ? true : false); });
      go.disabled = !(c && r);
      $('[data-go-label]', f).textContent = !c ? 'Select your country and region' : !r ? 'Now choose your ' + COUNTRIES[c].regionLabel.toLowerCase()
        : 'Compare plumbers in ' + findRegion(c, r);
    }
    f.addEventListener('change', function (e) {
      if (e.target.name === 'country') {
        fill(e.target.value); setCountry(e.target.value);
        if (window.innerWidth < 700) region.focus();
      }
      update();
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var c = f.elements.country.value, r = region.value;
      if (!c || !r) { (c ? region : $('input[name=country]', f)).focus(); return; }
      var data = { country: c, region: r, job: job.value, when: f.elements.when.value, town: town.value.trim().slice(0, 60) };
      session.set('lp-find', JSON.stringify(data));
      var hash = '#' + [c, r, data.job || 'any', data.when].join('/');
      if (location.pathname === '/find-a-plumber/') { history.replaceState(null, '', hash); renderResult(); var res = $('[data-finder-result]'); if (res) res.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      else location.href = '/find-a-plumber/' + hash;
    });

    if (country) {
      fill(country);
      if (pre.region && findRegion(country, pre.region)) region.value = pre.region;
      if (pre.job && findJob(country, pre.job)) job.value = pre.job;
      if (saved().town && saved().country === country) town.value = saved().town;
    }
    update();
  }

  /* ---------- Plan for the chosen area ---------- */
  var link = function (href, text) { return '<a href="' + href + '" rel="noopener" target="_blank">' + text + '</a>'; };
  function checks(c, region, j) {
    var gas = j && j[3];
    if (c === 'uk') {
      var out = [];
      if (gas) out.push('<strong>Gas work must be done by a Gas Safe registered engineer.</strong> Check the business on the ' + link('https://www.gassaferegister.co.uk/', 'Gas Safe Register') + ', ask to see the engineer’s ID card, and check the back of it lists the type of appliance they’ll work on.');
      out.push('Look for plumbers on ' + link('https://www.watersafe.org.uk/', 'WaterSafe') + ', the UK register of approved plumbers, or members of a trade body such as ' + link('https://www.ciphe.org.uk/', 'CIPHE') + (region === 'Scotland' || region === 'Northern Ireland' ? ' or ' + link('https://www.snipef.org/', 'SNIPEF') + ' (Scotland and Northern Ireland)' : '') + '.');
      out.push('Get at least three written quotes that say what’s included, and ask about public liability insurance and any guarantee on the work.');
      if (j && (j[0] === 'install' || j[0] === 'hotwater')) out.push('Some jobs, such as fitting an unvented hot water cylinder, must meet Building Regulations. Ask whether your plumber can self-certify the work or whether building control needs to be told.');
      return out;
    }
    var us = [];
    us.push('<strong>Check the plumber’s license.</strong> In most states plumbers are licensed by a state board with an online license lookup; in some places licensing is handled by the city or county. Search the official site for “' + esc(region) + ' plumbing license lookup”.');
    if (gas) us.push('Gas water heaters and gas lines need a plumber or gas fitter licensed for gas work under your local rules.');
    us.push('Ask for proof of liability insurance (and workers’ compensation if they have employees), and whether a permit is needed. Water heater replacement, repiping and sewer work often need one.');
    us.push('Get at least three written estimates with the scope of work, and ask what warranty covers parts and labor.');
    return us;
  }
  function safety(c, region, when) {
    if (when !== 'now') return '';
    var gasLine = c === 'uk'
      ? (region === 'Northern Ireland' ? 'Smell gas? Call the Northern Ireland Gas Emergency Service on <a href="tel:0800002001">0800 002 001</a>.' : 'Smell gas? Call the National Gas Emergency Service on <a href="tel:0800111999">0800 111 999</a>.')
      : 'Smell gas? Leave the building, then call 911 or your gas utility from outside.';
    var water = c === 'uk' ? 'Turn off your stopcock (often under the kitchen sink) and switch off the electrics if water is near sockets or lights.'
      : 'Turn off your main water shutoff valve and switch off power at the breaker if water is near outlets or fixtures.';
    return '<div class="plan-alert" role="note"><b>Emergency first steps</b><p>' + water + '</p><p>' + gasLine + '</p><a href="/emergency-plumbers/">Emergency plumbing guide →</a></div>';
  }

  function renderResult() {
    var box = $('[data-finder-result]');
    if (!box) return;
    var h = fromHash();
    if (!h) { box.hidden = true; return; }
    var C = COUNTRIES[h.country], region = findRegion(h.country, h.region);
    if (!region) { box.hidden = true; return; }
    var j = findJob(h.country, h.job), when = WHEN.filter(function (w) { return w[0] === h.when; })[0];
    var s = saved(), town = s.country === h.country && s.region === h.region ? s.town : '';
    var where = (town ? esc(town) + ', ' : '') + esc(region) + ', ' + C.short;
    var partners = PARTNERS;

    box.hidden = false;
    box.innerHTML =
      '<div class="plan-ticket">' +
      '<p class="plan-kicker">Your plumber plan</p>' +
      '<h2>' + (j ? esc(j[1]) : 'Plumbing help') + ' in ' + where + '</h2>' +
      '<ul class="plan-tags"><li>' + esc(C.name) + '</li><li>' + esc(region) + '</li>' + (when ? '<li>' + esc(when[1]) + '</li>' : '') + '</ul>' +
      '<a class="plan-edit" href="#finder-top">Change search</a></div>' +
      safety(h.country, region, h.when) +
      '<div class="plan-grid">' +
      '<section class="plan-card plan-intro"><span class="plan-step">1</span><h3>Get introduced</h3><div data-plan-partners></div></section>' +
      '<section class="plan-card"><span class="plan-step">2</span><h3>Check before you book</h3><ul class="ticks">' + checks(h.country, region, j).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></section>' +
      '<section class="plan-card"><span class="plan-step">3</span><h3>Know the job</h3><p>Read our guide so you can describe the problem clearly and compare quotes like-for-like.</p>' +
      '<a class="plan-link" href="/' + (j ? j[2] : 'choosing-a-plumber') + '/">' + (j ? 'Guide: ' + esc(j[1].toLowerCase()) : 'How to choose a plumber') + ' →</a>' +
      '<a class="plan-link" href="/' + (h.country === 'uk' ? 'plumbers-uk' : 'plumbers-usa') + '/">Plumbers in the ' + C.short + ': rules and registers →</a>' +
      '<a class="plan-link" href="/plumber-costs/">What affects the price →</a></section>' +
      '</div>';

    var slot = $('[data-plan-partners]', box);
    if (partners) { slot.appendChild(partners); partners.classList.add('in-plan'); }
    else slot.innerHTML = '<p>We’re adding quote partners that cover ' + esc(region) + '. When they’re live, this is where you’ll send one request and get matched with local plumbers.</p>' +
      '<p>Until then, use the registers in step 2 to find and check plumbers near you, and ask each for a written quote.</p>';
    setCountry(h.country);
  }

  /* ---------- Start ---------- */
  var PARTNERS = $('.partners'); // built from the page's "partners"; moved into the plan
  $$('[data-finder]').forEach(buildForm);
  renderResult();
  window.addEventListener('hashchange', function () { $$('[data-finder]').forEach(buildForm); renderResult(); });
  var c0 = (fromHash() || {}).country || getCountry();
  if (c0) setCountry(c0);
})();
