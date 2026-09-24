/* Ak Ilbirs — interactions. No libraries. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  /* ───────── Tunduk particle field ─────────
     Snow falls during the intro, then gathers into the crown of the yurt:
     an outer ring crossed by two sets of three arched bars. */
  const canvas = $('#tunduk');
  const ctx = canvas.getContext('2d');
  let W, H, R, cx, cy, dpr, parts = [], formed = false, running = true;
  const mouse = { x: -1e4, y: -1e4 };

  function tundukPoints(n) {
    const pts = [];
    const ringShare = 0.46;
    for (let i = 0; i < n; i++) {
      if (i < n * ringShare) {
        const a = Math.random() * Math.PI * 2;
        const r = R * (0.97 + Math.random() * 0.06);
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      } else if (i < n * 0.54) {
        // a few loose points scattered inside, like snow seen through the opening
        const a = Math.random() * Math.PI * 2, r = R * Math.sqrt(Math.random()) * 0.95;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      } else {
        const k = [-0.42, 0, 0.42][i % 3];
        const vertical = Math.floor(i / 3) % 2 === 0;
        const lim = Math.sqrt(1 - k * k);
        const t = (Math.random() * 2 - 1) * lim;             // along the bar, -lim..lim
        const bow = 0.14 * (1 - (t / lim) ** 2) * Math.sign(k || 1) * (k === 0 ? 0 : 1);
        let x = t * R, y = (k + bow) * R;
        x += (Math.random() - 0.5) * 4; y += (Math.random() - 0.5) * 4;
        pts.push(vertical ? [y, x] : [x, y]);
      }
    }
    return pts;
  }

  function layout() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) * (W < 760 ? 0.34 : 0.27);
    cx = W / 2; cy = H * (W < 760 ? 0.4 : 0.47);
    const n = Math.round(Math.min(2200, Math.max(900, (W * H) / 900)));
    const targets = tundukPoints(n);
    if (parts.length !== n) {
      parts = targets.map(([tx, ty]) => ({
        x: Math.random() * W, y: Math.random() * H - H,
        vx: 0, vy: 0.3 + Math.random() * 0.9,
        tx, ty, s: Math.random() * 1.4 + 0.4, a: Math.random() * 0.7 + 0.3,
        ember: Math.random() < 0.035,
      }));
    } else {
      parts.forEach((p, i) => { p.tx = targets[i][0]; p.ty = targets[i][1]; });
    }
    placeOrbit();
  }

  let rot = 0;
  function frame(t) {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    rot += formed ? 0.0006 : 0;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const breathe = 1 + Math.sin(t / 2400) * 0.012;
    for (const p of parts) {
      if (formed) {
        const gx = cx + (p.tx * cos - p.ty * sin) * breathe;
        const gy = cy + (p.tx * sin + p.ty * cos) * breathe;
        p.vx += (gx - p.x) * 0.012; p.vy += (gy - p.y) * 0.012;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 9000) { const f = (9000 - d2) / 9000 * 2.2; const d = Math.sqrt(d2) || 1; p.vx += dx / d * f; p.vy += dy / d * f; }
        p.vx *= 0.86; p.vy *= 0.86;
      } else {
        p.vx += (Math.random() - 0.5) * 0.04;
        if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
      }
      p.x += p.vx; p.y += p.vy;
      ctx.globalAlpha = p.a;
      ctx.fillStyle = p.ember ? '#e3a24f' : '#eef2f5';
      ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  function placeOrbit() {
    const items = $$('.orbit li');
    const rr = R * 1.42;
    items.forEach((li, i) => {
      const a = -Math.PI / 2 + (i / items.length) * Math.PI * 2 + 0.2;
      li.style.left = cx + Math.cos(a) * rr + 'px';
      li.style.top = cy + Math.sin(a) * rr + 'px';
      li.classList.toggle('top', Math.sin(a) < -0.3);
    });
  }

  addEventListener('resize', layout);
  canvas.parentElement.addEventListener('pointermove', e => {
    const b = canvas.getBoundingClientRect(); mouse.x = e.clientX - b.left; mouse.y = e.clientY - b.top;
  });
  canvas.parentElement.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });
  new IntersectionObserver(([e]) => {
    const was = running; running = e.isIntersecting;
    if (running && !was) requestAnimationFrame(frame);
  }).observe(canvas);

  layout();
  requestAnimationFrame(frame);

  /* ───────── Intro sequence ───────── */
  const lines = $$('.intro-line');
  let introTimers = [];
  function endIntro() {
    introTimers.forEach(clearTimeout);
    lines.forEach(l => l.classList.remove('on'));
    formed = true;
    document.body.classList.remove('is-intro');
    store.set('akilbirs-seen-intro', true);
  }
  if (reduced || store.get('akilbirs-seen-intro', false) || location.hash.length > 1) {
    endIntro();
  } else {
    lines.forEach((l, i) => {
      introTimers.push(setTimeout(() => l.classList.add('on'), 800 + i * 3600));
      introTimers.push(setTimeout(() => l.classList.remove('on'), 800 + i * 3600 + 2100));
    });
    introTimers.push(setTimeout(endIntro, 800 + lines.length * 3600));
  }
  $('.skip-intro').addEventListener('click', endIntro);

  /* ───────── Menu ───────── */
  const menuBtn = $('.menu-btn');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open);
    $('.menu').setAttribute('aria-hidden', !open);
  }
  menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('.menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ───────── Scroll reveals ───────── */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.15 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ───────── 1. Journey toggle ───────── */
  const journey = $('.journey');
  $$('.journey-toggle button').forEach(b => b.addEventListener('click', () => {
    $$('.journey-toggle button').forEach(x => x.setAttribute('aria-selected', x === b));
    journey.dataset.view = b.dataset.view;
  }));

  /* ───────── 2. The five ───────── */
  const FIVE = [
    { native: 'ЖАНЫБАР', name: 'Janybar', meaning: '“He has a soul.”',
      story: 'In Kyrgyz, jan is the soul and bar means “has.” His name says what this whole memorial says: a snow leopard has a life and a soul, not a price.' },
    { native: 'ТҮНДҮК', name: 'Tunduk', meaning: 'The crown of the yurt — the opening to the sky.',
      story: 'He always hid at the very top of the enclosure, as close to the sky as he could get. The tunduk is on our flag and is passed down through families as a sign of home. He climbed toward a home he could see and could not return to.' },
    { native: 'НИКОЛАЙ', name: 'Niki', meaning: 'Nikolay — found by a Russian hunter.',
      story: 'Not every hunter is an enemy. A hunter found Niki and brought him in, and that is why he lived. The same hands that can take a life can also save one.' },
    { native: 'ХАМЕЛЕОН', name: 'Chameleon', meaning: 'The one who disappears.',
      story: 'He could vanish inside his own enclosure — you would look straight at the rocks and not see him. People call snow leopards the ghosts of the mountains. He stayed a ghost, even behind a fence.' },
    { native: 'СОКОЛИНЫЙ ГЛАЗ', name: 'Hawkeye', meaning: 'Named after the Avenger.',
      story: 'The last to arrive — the other four were there before him. He fell from a cliff and was found badly injured. His left eye was hurt and he lost teeth, so he cannot hunt, and he has a hard time eating on his own. The mountains did this, not people. They are beautiful and cruel at the same time.' },
  ];
  const card = $('.leopard-card');
  const leopards = $$('.leopard');
  function showLeopard(i) {
    const d = FIVE[i];
    leopards.forEach((b, j) => b.setAttribute('aria-selected', i === j));
    $('.native', card).textContent = d.native;
    $('h3', card).textContent = d.name;
    $('.meaning', card).textContent = d.meaning;
    $('.story', card).textContent = d.story;
    card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
  }
  leopards.forEach(b => b.addEventListener('click', () => showLeopard(+b.dataset.i)));
  showLeopard(0);

  const stage = $('.names-stage');
  $('#sayNames').addEventListener('click', () => {
    stage.innerHTML = '';
    FIVE.forEach((d, i) => setTimeout(() => {
      const s = document.createElement('span');
      s.textContent = d.name;
      if (i === FIVE.length - 1) s.classList.add('last');
      stage.appendChild(s);
    }, i * 1100));
  });

  /* ───────── 3. Cage video ───────── */
  const cageVid = $('#cage video');
  new IntersectionObserver(([e]) => { e.isIntersecting ? cageVid.play().catch(() => {}) : cageVid.pause(); }, { threshold: 0.4 }).observe(cageVid);
  $('.sound-btn').addEventListener('click', e => {
    cageVid.muted = !cageVid.muted;
    e.currentTarget.textContent = cageVid.muted ? 'Sound off' : 'Sound on';
    e.currentTarget.setAttribute('aria-label', cageVid.muted ? 'Turn sound on' : 'Turn sound off');
    if (!cageVid.muted) cageVid.play().catch(() => {});
  });

  /* ───────── 4. Glacier slider ───────── */
  const GLACIER = [
    { snow: 1, text: 'The <b>1970s</b>. The glaciers of the Tien Shan feed the rivers of Central Asia, and the high, cold ridges are the snow leopard\'s whole world.' },
    { snow: 0.55, text: '<b>Today.</b> In about fifty years the Tien Shan has lost roughly <b>27% of its glacier mass</b> and <b>18% of its area</b>. As the mountains warm, the treeline, the herds and the herders move higher — into the leopard\'s range.' },
    { snow: 0.08, text: '<b>2100.</b> Projections show the Tien Shan losing <b>69–93%</b> of the glacier ice it has now. This is the part of the loss no fence or ranger can stop — only we can.' },
  ];
  const yr = $('#year'), gImg = $('.glacier-img'), gTxt = $('#glacierText');
  function setGlacier() { const g = GLACIER[yr.value]; gImg.style.setProperty('--snow', g.snow); gTxt.innerHTML = g.text; }
  yr.addEventListener('input', setGlacier);
  setGlacier();

  /* ───────── 5. Layers of tradition ───────── */
  const rings = $$('.ring'), layerArts = $$('.layer-text article');
  rings.forEach(r => r.addEventListener('click', e => {
    e.stopPropagation();
    const i = +r.dataset.layer;
    rings.forEach(x => x.setAttribute('aria-selected', x === r));
    layerArts.forEach((a, j) => a.hidden = i !== j);
  }));

  /* ───────── 6. The Ash: countdown + steps ───────── */
  function nextOct23() {
    const now = new Date();
    let d = new Date(now.getFullYear(), 9, 23);
    if (now >= new Date(now.getFullYear(), 9, 24)) d = new Date(now.getFullYear() + 1, 9, 23);
    return d;
  }
  function tick() {
    const ms = Math.max(0, nextOct23() - new Date());
    $('#cd-d').textContent = Math.floor(ms / 864e5);
    $('#cd-h').textContent = Math.floor(ms / 36e5) % 24;
    $('#cd-m').textContent = Math.floor(ms / 6e4) % 60;
  }
  tick(); setInterval(tick, 30000);

  const STEPS = [
    ['Preparation', 'The work of the hands. People raise a yurt, cook, and carry food — the same way my town carried food up the mountain.'],
    ['The circle', 'Everyone sits together under the tunduk and eats from the same pot, like our sohbet. No one carries this alone.'],
    ['Naming', 'The five are named out loud — Janybar, Tunduk, Niki, Chameleon, Hawkeye — the way we call the names of our ancestors at their graves.'],
    ['Lament', 'Anyone who needs to can cry out. Grief is allowed here, and so is anger at the trade that puts a price on their fur.'],
    ['Bata', 'A respected elder gives the blessing: for the leopards still in the wild, for the people who protect them, and for the year ahead.'],
    ['The trust', 'Each person names one thing they will do before next October. That promise is the amanah — the trust — kept.'],
  ];
  const dots = $('.step-dots'), body = $('.step-body');
  let step = 0;
  STEPS.forEach(([t], i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button role="tab" aria-selected="false"><span>${i + 1}. ${t}</span></button>`;
    li.firstChild.addEventListener('click', () => showStep(i));
    dots.appendChild(li);
  });
  function showStep(i) {
    step = (i + STEPS.length) % STEPS.length;
    $$('button', dots).forEach((b, j) => b.setAttribute('aria-selected', j === step));
    $('h3', body).textContent = STEPS[step][0];
    $('p', body).textContent = STEPS[step][1];
    body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap');
  }
  $('#prevStep').addEventListener('click', () => showStep(step - 1));
  $('#nextStep').addEventListener('click', () => showStep(step + 1));
  showStep(0);

  /* ───────── 7. Share a loss ───────── */
  const SEED = [
    { title: 'Ak Ilbirs of the Tien Shan', place: 'Kyrgyzstan', year: '1980s–2000', text: 'From 600–700 snow leopards to 150–200 in twenty years. Now slowly coming back.' },
    { title: 'Tokitae', place: 'Salish Sea', year: '1970–2023', text: 'Taken from her pod as a calf, held in a tank for more than fifty years. The Lummi Nation called her home until the end.' },
    { title: 'The glaciers of the Tien Shan', place: 'Central Asia', year: '1970s–today', text: 'More than a quarter of their ice, gone in one lifetime.' },
    { title: 'Okjökull', place: 'Iceland', year: '2014', text: 'The first glacier lost to climate change. In 2019 people held a funeral and left “A letter to the future.”' },
  ];
  const list = $('.memories');
  const mine = store.get('akilbirs-memories', []);
  function memItem(m, isMine, isNew) {
    const li = document.createElement('li');
    if (isMine) li.classList.add('mine');
    if (isNew) li.classList.add('new');
    const dot = document.createElement('span'); dot.className = 'dot'; dot.textContent = (m.title.trim()[0] || '·').toUpperCase();
    const wrap = document.createElement('div');
    const h = document.createElement('h4'); h.textContent = m.title;
    const meta = document.createElement('p'); meta.className = 'meta'; meta.textContent = [m.year, m.place].filter(Boolean).join(' · ');
    wrap.append(h, meta);
    const text = document.createElement('p'); text.className = 'text'; text.textContent = m.text || '';
    li.append(dot, wrap, text);
    li.addEventListener('click', () => li.classList.toggle('open'));
    return li;
  }
  [...mine].reverse().forEach(m => list.appendChild(memItem(m, true)));
  SEED.forEach(m => list.appendChild(memItem(m, false)));

  $('.memory-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const m = Object.fromEntries(['title', 'place', 'year', 'text'].map(k => [k, (f.get(k) || '').trim()]));
    if (!m.title) return;
    mine.push(m); store.set('akilbirs-memories', mine);
    const li = memItem(m, true, true);
    li.classList.add('open');
    list.prepend(li); list.scrollTop = 0;
    e.target.reset();
  });

  /* ───────── 8. Pledges ───────── */
  const pledged = new Set(store.get('akilbirs-pledges', []));
  const boxes = $$('.pledges input');
  const countEl = $('.pledge-count');
  function updateCount() {
    const n = boxes.filter(b => b.checked).length;
    countEl.textContent = n === 0 ? '' : n === 1 ? 'One promise made. That is how a trust is kept.' : `${n} promises made. That is how a trust is kept.`;
  }
  boxes.forEach(b => {
    b.checked = pledged.has(b.dataset.p);
    b.addEventListener('change', () => {
      b.checked ? pledged.add(b.dataset.p) : pledged.delete(b.dataset.p);
      store.set('akilbirs-pledges', [...pledged]);
      updateCount();
    });
  });
  updateCount();
})();
