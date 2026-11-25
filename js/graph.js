function readPalette() {
  const styles = getComputedStyle(document.documentElement);
  return {
    bg: styles.getPropertyValue('--bg').trim() || '#EEEAE1',
    surface: styles.getPropertyValue('--surface').trim() || '#F6F3EC',
    ink: styles.getPropertyValue('--ink').trim() || '#16150F',
    muted: styles.getPropertyValue('--muted').trim() || '#6E6A5E',
    line: styles.getPropertyValue('--line').trim() || '#D9D4C7',
    accent: styles.getPropertyValue('--accent').trim() || '#FF4A1C'
  };
}

export function initGraph({ canvas, tooltip, projects, concepts, onSelectProject }) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let palette = readPalette();
  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Build nodes: 6 project nodes + 12 concept nodes
  const nodes = [];
  const nodeById = new Map();

  projects.forEach((p, idx) => {
    const angle = (idx / projects.length) * Math.PI * 2;
    const node = {
      id: p.id,
      label: p.title,
      kind: 'project',
      radius: 10,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      seedAngle: angle,
      phase: idx * 1.1
    };
    nodes.push(node);
    nodeById.set(node.id, node);
  });

  concepts.forEach((c, idx) => {
    const angle = (idx / concepts.length) * Math.PI * 2 + 0.3;
    const node = {
      id: `concept:${c}`,
      label: c.toLowerCase(),
      kind: 'concept',
      radius: 4.5,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      seedAngle: angle,
      phase: idx * 0.7
    };
    nodes.push(node);
    nodeById.set(node.id, node);
  });

  // Build edges between projects and concepts
  const edges = [];
  const adjacency = new Map(nodes.map((n) => [n.id, new Set()]));

  projects.forEach((p) => {
    (p.concepts || []).forEach((c) => {
      const targetId = `concept:${c}`;
      if (nodeById.has(targetId)) {
        edges.push({ source: p.id, target: targetId });
        adjacency.get(p.id).add(targetId);
        adjacency.get(targetId).add(p.id);
      }
    });
  });

  function seedPositions() {
    const cx = width * 0.54;
    const cy = height * 0.52;
    const rx = Math.max(120, width * 0.24);
    const ry = Math.max(90, height * 0.24);

    nodes.forEach((n) => {
      const spread = n.kind === 'project' ? 0.72 : 1.05;
      n.x = cx + Math.cos(n.seedAngle) * rx * spread;
      n.y = cy + Math.sin(n.seedAngle) * ry * spread;
      n.vx = 0;
      n.vy = 0;
    });
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width || window.innerWidth;
    height = rect.height || 480;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!nodes[0].x) {
      seedPositions();
    }
  }

  function stepSimulation(alpha) {
    const cx = width * 0.54;
    const cy = height * 0.52;
    const repulsion = width < 640 ? 1800 : 3200;
    const springLen = width < 640 ? 78 : 112;

    // Pairwise repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distSq = dx * dx + dy * dy + 0.01;
        const dist = Math.sqrt(distSq);
        const force = (repulsion / distSq) * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // Spring attraction along edges
    for (const edge of edges) {
      const a = nodeById.get(edge.source);
      const b = nodeById.get(edge.target);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const diff = (dist - springLen) * 0.032 * alpha;
      const fx = (dx / dist) * diff;
      const fy = (dy / dist) * diff;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Gentle centering + top-left text clearance
    const padX = width < 640 ? 44 : 72;
    const padY = 56;
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.008 * alpha;
      n.vy += (cy - n.y) * 0.01 * alpha;

      // Softly push nodes away from top-left title zone
      if (n.x < width * 0.36 && n.y < height * 0.34) {
        n.vx += 0.35 * alpha;
        n.vy += 0.35 * alpha;
      }

      n.vx *= 0.84;
      n.vy *= 0.84;
      n.x = Math.max(padX, Math.min(width - padX, n.x + n.vx));
      n.y = Math.max(padY, Math.min(height - padY, n.y + n.vy));
    }
  }

  let hoveredNode = null;
  let tick = 0;
  let time = 0;
  let rafId = null;
  let isVisible = true;
  let isTabActive = !document.hidden;

  function draw() {
    ctx.clearRect(0, 0, width, height);

    const activeId = hoveredNode ? hoveredNode.id : null;
    const connected = activeId ? adjacency.get(activeId) : null;

    // Draw edges
    for (const edge of edges) {
      const a = nodeById.get(edge.source);
      const b = nodeById.get(edge.target);
      const isHighlighted = activeId && (edge.source === activeId || edge.target === activeId);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      if (isHighlighted) {
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.95;
      } else {
        ctx.strokeStyle = palette.line;
        ctx.lineWidth = 1;
        ctx.globalAlpha = activeId ? 0.16 : 0.75;
      }
      ctx.stroke();
    }

    // Draw nodes
    for (const n of nodes) {
      const isHovered = activeId === n.id;
      const isNeighbor = connected ? connected.has(n.id) : false;
      const faded = activeId && !isHovered && !isNeighbor;

      const driftX = reducedMotion || tick < 120 ? 0 : Math.sin(time * 0.4 + n.phase) * 0.18;
      const driftY = reducedMotion || tick < 120 ? 0 : Math.cos(time * 0.35 + n.phase) * 0.18;
      const x = n.x + driftX;
      const y = n.y + driftY;
      const r = isHovered ? n.radius * 1.45 : n.radius;

      ctx.globalAlpha = faded ? 0.2 : 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);

      if (n.kind === 'project') {
        ctx.fillStyle = isHovered ? palette.accent : palette.surface;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isHovered || isNeighbor ? palette.accent : palette.ink;
        ctx.stroke();

        // Label project nodes
        ctx.font = '400 11.5px "IBM Plex Mono", monospace';
        ctx.fillStyle = isHovered ? palette.accent : palette.ink;
        ctx.textAlign = 'center';
        ctx.fillText(n.label.toLowerCase(), x, y + r + 15);
      } else {
        ctx.fillStyle = isHovered || isNeighbor ? palette.accent : palette.muted;
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
  }

  function loop() {
    if (!isVisible || !isTabActive) {
      rafId = null;
      return;
    }

    if (tick < 125) {
      const alpha = Math.max(0.15, 1 - tick / 125);
      stepSimulation(alpha);
      tick++;
    } else {
      time += 0.016;
    }

    draw();
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (reducedMotion) {
      for (let i = 0; i < 160; i++) {
        stepSimulation(Math.max(0.12, 1 - i / 160));
      }
      tick = 160;
      draw();
      return;
    }
    if (!rafId && isVisible && isTabActive) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function hitTest(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let closest = null;
    let minDist = Infinity;

    for (const n of nodes) {
      const hitR = n.kind === 'project' ? 22 : 14;
      const dist = Math.hypot(n.x - x, n.y - y);
      if (dist <= hitR && dist < minDist) {
        closest = n;
        minDist = dist;
      }
    }
    return closest;
  }

  function updateTooltip(node) {
    if (!tooltip) return;
    if (!node) {
      tooltip.hidden = true;
      return;
    }
    tooltip.textContent = node.kind === 'project'
      ? `${node.label.toLowerCase()} → open case file`
      : node.label;
    tooltip.style.left = `${node.x}px`;
    tooltip.style.top = `${node.y - node.radius}px`;
    tooltip.hidden = false;
  }

  canvas.addEventListener('pointermove', (e) => {
    const hit = hitTest(e.clientX, e.clientY);
    if (hit !== hoveredNode) {
      hoveredNode = hit;
      canvas.style.cursor = hit && hit.kind === 'project' ? 'pointer' : hit ? 'default' : 'default';
      updateTooltip(hit);
      if (reducedMotion) draw();
    }
  });

  canvas.addEventListener('pointerdown', (e) => {
    const hit = hitTest(e.clientX, e.clientY);
    hoveredNode = hit;
    updateTooltip(hit);
    if (reducedMotion) draw();
  });

  canvas.addEventListener('pointerleave', () => {
    hoveredNode = null;
    updateTooltip(null);
    canvas.style.cursor = 'default';
    if (reducedMotion) draw();
  });

  canvas.addEventListener('click', (e) => {
    const hit = hitTest(e.clientX, e.clientY);
    if (hit && hit.kind === 'project' && onSelectProject) {
      onSelectProject(hit.id);
    }
  });

  window.addEventListener('themechange', () => {
    palette = readPalette();
    draw();
  });

  window.addEventListener('resize', () => {
    resize();
    if (reducedMotion) draw();
  });

  document.addEventListener('visibilitychange', () => {
    isTabActive = !document.hidden;
    if (isTabActive) startLoop();
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
        if (isVisible) startLoop();
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);
  }

  resize();
  startLoop();
}
