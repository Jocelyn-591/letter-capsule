const capsuleStation = (() => {
  const find = name => document.getElementById('capsule-' + name);
  const stage = document.getElementById('capsules');
  const shell = find('shell');
  const machine = find('machine');
  const stock = find('stock');
  const draw = find('draw');
  const chute = find('chute');
  const collection = find('collection');
  const overlay = find('overlay');
  const flight = find('flight');
  const paper = find('paper');
  const dismiss = find('close');
  const content = find('content');
  const playSong = find('play');
  let song;

  function prepareSong(src) {
    const player = new Audio(src);
    player.loop = true;
    song = player;
    player.muted = true;
    player.play().then(() => {
      if (song === player && player.muted) player.pause();
    }).catch(() => {});
  }

  async function startSong() {
    const player = song;
    if (!player) return;
    player.muted = false;
    player.currentTime = 0;
    try {
      await player.play();
      playSong.hidden = true;
    } catch {
      if (song === player) playSong.hidden = false;
    }
  }

  playSong.addEventListener('click', startSong);
  const ordinary = [...ordinaryCapsules].sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const catalog = [...ordinary, hiddenCapsule].map((item,index) => ({...item,collectionPosition:index + 1}));
  const total = catalog.length;
  const capacity = Math.min(total, Math.max(1, Math.floor(capsuleConfig.capacity)));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const saveButton = find('save');
  const resetButton = find('reset');
  const saveStatus = find('save-status');
  const collectionKey = 'birthday-capsules-complete-v1';
  let saved = false;
  try { saved = localStorage.getItem(collectionKey) === 'yes'; } catch {}
  const progress = {collected:new Set(saved ? catalog.map(item => item.id) : []), pending:null};

  function saveCollection() {
    if (state !== 'idle' || progress.collected.size !== total) return;
    try {
      localStorage.setItem(collectionKey,'yes');
      saved = true;
      saveStatus.textContent = '已保存，下次打开可以直接重读。';
    } catch {
      saveStatus.textContent = '这个浏览器无法保存收藏。';
    }
    renderControls();
  }

  function resetCollection() {
    if (state !== 'idle' || !progress.collected.size) return;
    try {
      localStorage.removeItem(collectionKey);
      saveStatus.textContent = '';
    } catch {
      if (saved) {
        saveStatus.textContent = '这个浏览器无法清除已保存的收藏。';
        return;
      }
    }
    saved = false;
    progress.collected.clear();
    progress.pending = null;
    catalog.forEach(renderSlot);
    renderStock();
    renderControls();
    window.scrollTo({top:0,behavior:motion.matches ? 'instant' : 'smooth'});
  }

  saveButton.addEventListener('click',saveCollection);
  resetButton.addEventListener('click',resetCollection);
  let state = 'idle';
  let active;
  let returnFocus;
  let keyboard = false;
  let point;
  const slots = new Map();

  function remainingOrdinary() {
    return ordinary.filter(item => !progress.collected.has(item.id) && progress.pending !== item.id);
  }

  function selectCapsule() {
    const remaining = remainingOrdinary();
    if (!remaining.length) return catalog.find(item => item.id === hiddenCapsule.id && !progress.collected.has(item.id));
    const selected = capsuleConfig.drawMode === 'date' ? remaining[0] : remaining[Math.floor(Math.random() * remaining.length)];
    return catalog.find(item => item.id === selected.id);
  }

  function orb(color) {
    const ball = document.createElement('span');
    ball.className = 'orb';
    ball.style.setProperty('--color',color);
    ball.setAttribute('aria-hidden','true');
    return ball;
  }

  const packedPositions = [
    [32,83],[50,84],[68,83],
    [14,68],[32,68],[50,69],[68,68],[86,68],
    [13,51],[31,51],[50,52],[69,51],[87,51],
    [23,35],[41,34],[59,35],[77,35],
    [32,21],[50,19],[68,21]
  ];

  function renderStock() {
    const count = Math.min(capacity, total - progress.collected.size - Number(Boolean(progress.pending)));
    const ordinaryLeft = remainingOrdinary();
    const packed = capacity === packedPositions.length;
    stock.classList.toggle('stock-packed',packed);
    const colorAt = index => ordinaryLeft[index]?.color ?? (ordinaryLeft.length ? '#d5c5b8' : hiddenCapsule.color);
    if (packed) {
      stock.replaceChildren(...packedPositions.slice(0,count).map(([x,y],index) => {
        const ball = orb(colorAt(index));
        ball.style.left = x + '%';
        ball.style.top = y + '%';
        ball.style.zIndex = Math.round(y);
        return ball;
      }));
      return;
    }
    const columns = Math.max(2, Math.ceil(Math.sqrt(capacity * 1.4)));
    const rows = Math.ceil(capacity / columns);
    const size = Math.min((stock.clientWidth - 3 * (columns - 1)) / columns, stock.clientHeight / rows);
    stock.style.setProperty('--ball-size',Math.max(1,size) + 'px');
    const fragment = document.createDocumentFragment();
    const rowStarts = capacity === 10 ? [0,3,7] : null;
    let row;
    for (let index=0; index<count; index++) {
      if (rowStarts ? rowStarts.includes(index) : index % columns === 0) {
        row = document.createElement('div');
        row.className = 'stock-row';
        fragment.append(row);
      }
      row.append(orb(colorAt(index)));
    }
    stock.replaceChildren(fragment);
  }

  function renderControls() {
    const finished = progress.collected.size === total;
    saveButton.disabled = state !== 'idle' || !finished || saved;
    saveButton.textContent = saved ? '已保存' : '保存收藏';
    resetButton.disabled = state !== 'idle' || !progress.collected.size;
    draw.disabled = state !== 'idle' || finished;
    draw.textContent = finished ? '抽完' : progress.pending ? '继续' : '扭蛋';
    find('status').textContent = finished ? '29 颗扭蛋已全部收藏'
      : progress.pending && state === 'idle' ? '还有一封信待阅读'
      : progress.collected.size === ordinary.length ? '最后一颗扭蛋已解锁' : '';
    find('count').textContent = progress.collected.size + ' / ' + total;
  }

  function renderSlot(item) {
    const button = slots.get(item.id);
    const collected = progress.collected.has(item.id);
    button.disabled = !collected;
    button.setAttribute('aria-disabled',String(!collected));
    button.setAttribute('aria-label',collected ? '重读' + item.title + (item.date ? '，' + item.date : '') : '第 ' + item.collectionPosition + ' 格，空');
    button.replaceChildren(...(collected && active?.id !== item.id ? [orb(item.color)] : []));
  }

  function initializeCollection() {
    for (const item of catalog) {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'slot';
      slot.dataset.position = item.collectionPosition;
      slot.addEventListener('click',event => {
        if (state === 'idle' && progress.collected.has(item.id)) {
          if (item.audio) prepareSong(item.audio);
          open(item,slot,'collection',event.detail === 0);
        }
      });
      slots.set(item.id,slot);
      collection.append(slot);
      renderSlot(item);
    }
  }

  function setState(next) {
    state = next;
    stage.dataset.phase = next;
    renderControls();
  }

  function animate(element, frames, duration, easing='ease-in-out') {
    return element.animate(frames,{duration:motion.matches ? 0 : duration,easing}).finished;
  }

  function center(element) {
    const {left,top,width,height} = element.getBoundingClientRect();
    return {x:left+width/2,y:top+height/2};
  }

  function placement(p,scale=1,angle=0) {
    return 'translate(' + (p.x-32) + 'px,' + (p.y-32) + 'px) rotate(' + angle + 'deg) scale(' + scale + ')';
  }

  async function moveBall(frames,duration,destination) {
    flight.style.transform = destination;
    await animate(flight,frames,duration,'cubic-bezier(.22,.72,.23,1)');
  }

  function fillLetter(item) {
    content.classList.toggle('capsule-afterword',item.id === hiddenCapsule.id);
    find('title').textContent = item.title;
    find('date').textContent = item.date ?? '';
    const paragraphs = item.content.map(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      return paragraph;
    });
    const picture = (src, alt) => {
      const image = document.createElement('img');
      image.src = src;
      image.alt = alt ?? '信件配图';
      return image;
    };
    if (item.inlineImages) {
      const {afterParagraph,sources} = item.inlineImages;
      paragraphs.splice(afterParagraph,0,...sources.map(src => picture(src)));
    }
    if (item.image) paragraphs.unshift(...[item.image].flat().map(src => picture(src,item.imageAlt)));
    if (item.endImage) paragraphs.push(...[item.endImage].flat().map(src => picture(src,item.endImageAlt)));
    content.replaceChildren(...paragraphs);
    content.scrollTop = 0;
  }

  async function open(item, source, origin, useKeyboard) {
    active = item;
    keyboard = useKeyboard;
    returnFocus = source;
    setState(origin === 'machine' ? 'dispensing' : 'opening');
    const start = center(source);
    if (origin === 'collection') renderSlot(item);
    flight.hidden = false;
    flight.style.transform = placement(start,.5);
    for (const half of flight.children) half.style.setProperty('--color',item.color);
    overlay.hidden = false;
    document.body.classList.add('capsule-reading');
    shell.inert = true;
    point = center(overlay);
    if (origin === 'machine') {
      await Promise.all([
        animate(draw,[{transform:'rotate(0deg)'},{transform:'rotate(72deg)'},{transform:'rotate(0deg)'}],300),
        animate(stock,[{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}],300)
      ]);
      renderStock();
    }
    await moveBall([
      {transform:placement(start,.5)},
      {transform:placement({x:start.x+8,y:start.y+23},.68,55),offset:.3},
      {transform:placement(point)}
    ],460,placement(point));
    setState('opening');
    const halves = [...flight.children];
    await Promise.all(halves.map((half,index) => animate(half,[
      {transform:'translateY(0)'},{transform:'translateY(' + (index ? 18 : -18) + 'px)'}
    ],180,'ease-out')));
    halves.forEach((half,index) => {half.style.transform = 'translateY(' + (index ? 18 : -18) + 'px)'});
    fillLetter(item);
    paper.hidden = false;
    dismiss.disabled = true;
    await animate(paper,[
      {transform:'scale(.13,.02)',opacity:.4},
      {transform:'scale(.8,.22)',opacity:1,offset:.35},
      {transform:'scale(1)'}
    ],360,'ease-out');
    flight.hidden = true;
    dismiss.disabled = false;
    setState('reading');
    if (item.audio) void startSong();
    if (keyboard) dismiss.focus({preventScroll:true});
  }

  async function closeLetter() {
    if (state !== 'reading') return;
    setState('closing');
    song?.pause();
    song = null;
    playSong.hidden = true;
    dismiss.disabled = true;
    flight.hidden = false;
    point = center(overlay);
    flight.style.transform = placement(point);
    await animate(paper,[
      {transform:'scale(1)'},{transform:'scale(.8,.22)',offset:.6},{transform:'scale(.13,.02)',opacity:.2}
    ],300);
    paper.hidden = true;
    await Promise.all([...flight.children].map(half => animate(half,[
      {transform:half.style.transform},{transform:'translateY(0)'}
    ],160)));
    for (const half of flight.children) half.style.transform = '';
    setState('returning');
    document.body.classList.remove('capsule-reading');
    const target = slots.get(active.id);
    target.scrollIntoView({block:'center',behavior:'instant'});
    await new Promise(resolve => requestAnimationFrame(resolve));
    const end = center(target);
    const landingBall = orb(active.color);
    landingBall.style.visibility = 'hidden';
    target.append(landingBall);
    const ballSize = landingBall.getBoundingClientRect().width;
    const landing = placement(end, ballSize / flight.offsetWidth);
    await moveBall([
      {transform:placement(point)},
      {transform:landing}
    ],430,landing);
    const item = active;
    active = null;
    progress.collected.add(item.id);
    if (progress.pending === item.id) progress.pending = null;
    renderSlot(item);
    overlay.hidden = flight.hidden = true;
    shell.inert = false;
    setState('idle');
    if (keyboard) (returnFocus === chute ? target : returnFocus).focus({preventScroll:true});
  }

  draw.addEventListener('click',event => {
    if (state !== 'idle' || progress.collected.size === total) return;
    const item = progress.pending ? catalog.find(entry => entry.id === progress.pending) : selectCapsule();
    if (!item) return;
    progress.pending = item.id;
    if (item.audio) prepareSong(item.audio);
    open(item,chute,'machine',event.detail === 0);
  });
  dismiss.addEventListener('click',closeLetter);
  overlay.addEventListener('keydown',event => {
    if (event.key === 'Escape') closeLetter();
  });
  window.addEventListener('resize',() => {if (!stage.hidden) renderStock()});
  initializeCollection();
  setState('idle');

  return {
    enter(fromKeyboard = false) {
      document.querySelector('main').hidden = true;
      stage.hidden = false;
      window.scrollTo(0,0);
      renderStock();
      if (fromKeyboard) find('heading').focus({preventScroll:true});
    }
  };
})();
document.getElementById('station-button').addEventListener('click', event => capsuleStation.enter(event.detail === 0));
