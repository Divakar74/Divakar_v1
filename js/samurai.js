const DIALOGUES = [
  ['runs on filter coffee', 'and 2am stack traces'],
  ['spent hrs on a bug once', 'turns out it was stale cache'],
  ['loves ink & watercolor', 'pencil shading? not his fav'],
  ['learning guitar lately', 'right after doomscrolling memes'],
  ['2am research rabbit holes', 'from rag graphs to random lore'],
  ['fixed an unescaped & in svg', 'shipped clean, zero errors']
];

export function initSamurai(actorA, actorB, footerEl) {
  if (!actorA || !actorB || !footerEl) return;

  const bubbleA = actorA.querySelector('.samurai-hi');
  const bubbleB = actorB.querySelector('.samurai-hi');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  let cycle = 0;
  let posA = -70;
  let posB = (footerEl.clientWidth || window.innerWidth) + 70;
  let phase = 'approach'; // 'approach' | 'talkA' | 'talkB' | 'depart'
  let timer = 0;
  let lastTs = 0;
  let isVisible = true;
  let rafId = null;

  function setClass(el, cls) {
    el.classList.remove('is-walking', 'is-waving', 'is-talking', 'is-bowing');
    if (cls) el.classList.add(cls);
  }

  function step(ts) {
    if (!isVisible || document.hidden) {
      lastTs = 0;
      rafId = null;
      return;
    }

    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    const stageW = footerEl.clientWidth || window.innerWidth;
    const speed = stageW < 640 ? 64 : 88;
    const meetA = stageW * 0.5 - 78;
    const meetB = stageW * 0.5 + 18;
    const [lineA, lineB] = DIALOGUES[cycle % DIALOGUES.length];

    if (phase === 'approach') {
      setClass(actorA, 'is-walking');
      setClass(actorB, 'is-walking');
      posA += speed * dt;
      posB -= speed * dt;

      if (posA >= meetA && posB <= meetB) {
        posA = meetA;
        posB = meetB;
        phase = 'talkA';
        timer = 0;
        if (bubbleA) bubbleA.textContent = lineA;
        if (bubbleB) bubbleB.textContent = lineB;
        setClass(actorA, 'is-talking');
        setClass(actorB, 'is-bowing');
      }
    } else if (phase === 'talkA') {
      timer += dt;
      if (timer >= 2.0) {
        phase = 'talkB';
        timer = 0;
        setClass(actorA, 'is-waving');
        setClass(actorB, 'is-talking');
      }
    } else if (phase === 'talkB') {
      timer += dt;
      if (timer >= 2.1) {
        phase = 'depart';
        setClass(actorA, 'is-walking');
        setClass(actorB, 'is-walking');
      }
    } else if (phase === 'depart') {
      setClass(actorA, 'is-walking');
      setClass(actorB, 'is-walking');
      posA += speed * 1.1 * dt;
      posB -= speed * 1.1 * dt;

      if (posA > stageW + 70 && posB < -70) {
        posA = -70;
        posB = stageW + 70;
        phase = 'approach';
        cycle++;
      }
    }

    actorA.style.transform = `translate3d(${posA.toFixed(1)}px, 0, 0)`;
    actorB.style.transform = `translate3d(${posB.toFixed(1)}px, 0, 0)`;
    rafId = requestAnimationFrame(step);
  }

  function start() {
    if (!rafId && isVisible && !document.hidden) {
      rafId = requestAnimationFrame(step);
    }
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
        footerEl.classList.toggle('is-paused', !isVisible);
        if (isVisible) start();
      },
      { threshold: 0.02 }
    );
    io.observe(footerEl);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) start();
  });

  start();
}
