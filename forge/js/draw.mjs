import { WORLD_H, WORLD_W } from "./types.mjs";
const ink = "#ecebe3";
const acid = "#d6ff00";
const hazard = "#ff7f5c";
const steel = "#b7c2a4";
const wood = "#c4895a";
const muted = "#a3a89b";
const line = "#2a2e25";
const panel = "#141810";
const edge = "#4a5141";
function drawFrame(ctx, width, height, frame) {
  const sx = width / WORLD_W;
  const sy = height / WORLD_H;
  const X = (x) => x * sx;
  const Y = (y) => (WORLD_H - y) * sy;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0a0b09";
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(frame.shakeX, frame.shakeY);
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= WORLD_W; x += 1) {
    ctx.moveTo(X(x), 0);
    ctx.lineTo(X(x), height);
  }
  for (let y = 0; y <= WORLD_H; y += 1) {
    ctx.moveTo(0, Y(y));
    ctx.lineTo(width, Y(y));
  }
  ctx.stroke();
  const strokePath = (pts, color, widthPx, dash) => {
    if (pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = widthPx;
    ctx.setLineDash(dash);
    ctx.beginPath();
    const first = pts[0];
    if (!first) return;
    ctx.moveTo(X(first.x), Y(first.y));
    for (const p of pts) ctx.lineTo(X(p.x), Y(p.y));
    ctx.stroke();
    ctx.restore();
  };
  strokePath(frame.ghostTrail, edge, Math.max(2, sx * 0.06), [6, 6]);
  strokePath(frame.trail, acid, Math.max(2, sx * 0.07), []);
  if (frame.arc) strokePath(frame.arc, acid, Math.max(1.5, sx * 0.045), [4, 6]);
  for (const body of frame.ghost) paint(ctx, body, sx, sy, X, Y, true, false);
  for (const body of frame.bodies) paint(ctx, body, sx, sy, X, Y, false, body.id === frame.highlight);
  for (const spark of frame.sparks) {
    ctx.globalAlpha = Math.max(0, spark.life);
    ctx.fillStyle = acid;
    ctx.fillRect(X(spark.x) - 2, Y(spark.y) - 2, 4, 4);
    ctx.globalAlpha = 1;
  }
  ctx.font = `${Math.max(12, sx * 0.28)}px ui-monospace, Menlo, Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const mark of frame.labels) {
    ctx.fillStyle = mark.tone === "hazard" ? hazard : mark.tone === "acid" ? acid : muted;
    ctx.fillText(mark.text, X(mark.x), Y(mark.y));
  }
  ctx.restore();
}
function paint(ctx, body, sx, sy, X, Y, ghost, hot) {
  ctx.save();
  ctx.translate(X(body.x), Y(body.y));
  ctx.rotate(-body.angle);
  const w = body.w * sx;
  const h = body.h * sy;
  if (ghost) {
    ctx.strokeStyle = acid;
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2;
    if (body.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(body.r, body.w / 2) * sx, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(-w / 2, -h / 2, w, h);
    }
    ctx.restore();
    return;
  }
  const box = () => {
    ctx.fillRect(-w / 2, -h / 2, w, h);
  };
  const circle = (r) => {
    ctx.beginPath();
    ctx.arc(0, 0, r * sx, 0, Math.PI * 2);
    ctx.fill();
  };
  switch (body.kind) {
    case "ball": {
      ctx.fillStyle = acid;
      circle(body.r);
      ctx.fillStyle = "#0a0b09";
      ctx.beginPath();
      ctx.arc(-body.r * sx * 0.25, -body.r * sy * 0.2, body.r * sx * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "crate":
    case "block": {
      ctx.fillStyle = wood;
      box();
      ctx.strokeStyle = "#0a0b09";
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.moveTo(w / 2, -h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.stroke();
      break;
    }
    case "beam":
    case "sail": {
      ctx.fillStyle = body.kind === "sail" ? acid : steel;
      box();
      ctx.fillStyle = "#0a0b09";
      const rivet = Math.max(2, sx * 0.05);
      ctx.fillRect(-w / 2 + 4, -rivet / 2, rivet, rivet);
      ctx.fillRect(w / 2 - 4 - rivet, -rivet / 2, rivet, rivet);
      break;
    }
    case "bumper":
    case "stop": {
      ctx.fillStyle = body.kind === "stop" ? hazard : "#0a0b09";
      circle(body.r);
      ctx.strokeStyle = hazard;
      ctx.lineWidth = Math.max(3, sx * 0.08);
      ctx.beginPath();
      ctx.arc(0, 0, body.r * sx, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "pad": {
      ctx.fillStyle = acid;
      box();
      ctx.strokeStyle = "#0a0b09";
      ctx.lineWidth = 1;
      for (let i = -w / 2; i < w / 2; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, -h / 2);
        ctx.lineTo(i + h, h / 2);
        ctx.stroke();
      }
      break;
    }
    case "cup": {
      ctx.fillStyle = steel;
      box();
      break;
    }
    case "wall":
    case "pier": {
      ctx.fillStyle = body.kind === "pier" ? panel : "#10140e";
      box();
      ctx.strokeStyle = edge;
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      break;
    }
    case "bay":
    case "dock": {
      ctx.strokeStyle = acid;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = "rgba(214,255,0,0.12)";
      box();
      break;
    }
    case "pit": {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-w / 2, -h / 2, w, h);
      ctx.clip();
      ctx.fillStyle = "#140c0a";
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = hazard;
      ctx.lineWidth = 3;
      for (let i = -w; i < w; i += 10) {
        ctx.beginPath();
        ctx.moveTo(i, h / 2);
        ctx.lineTo(i + h, -h / 2);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case "ledge": {
      ctx.fillStyle = "#1c2218";
      box();
      ctx.fillStyle = steel;
      ctx.fillRect(-w / 2, -h / 2, w, Math.max(2, h * 0.22));
      break;
    }
    case "gate": {
      ctx.strokeStyle = acid;
      ctx.lineWidth = 3;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(0, h / 2);
      ctx.stroke();
      break;
    }
    case "bell": {
      ctx.fillStyle = acid;
      box();
      break;
    }
    case "fan": {
      ctx.strokeStyle = muted;
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.setLineDash([]);
      ctx.strokeStyle = acid;
      ctx.beginPath();
      ctx.moveTo(-w * 0.2, 0);
      ctx.lineTo(w * 0.15, 0);
      ctx.lineTo(w * 0.02, -h * 0.12);
      ctx.moveTo(w * 0.15, 0);
      ctx.lineTo(w * 0.02, h * 0.12);
      ctx.stroke();
      break;
    }
    case "weight":
    case "mass": {
      ctx.fillStyle = body.kind === "weight" ? hazard : steel;
      circle(body.r || body.w / 2);
      ctx.fillStyle = "#0a0b09";
      ctx.fillRect(-w * 0.18, -2, w * 0.36, 4);
      break;
    }
    case "payload": {
      ctx.fillStyle = steel;
      box();
      ctx.strokeStyle = acid;
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      break;
    }
    case "rope": {
      ctx.strokeStyle = muted;
      ctx.lineWidth = Math.max(2, h);
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(w / 2, 0);
      ctx.stroke();
      break;
    }
    case "com": {
      ctx.strokeStyle = acid;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 8);
      ctx.stroke();
      break;
    }
    default: {
      ctx.fillStyle = edge;
      if (body.shape === "circle") circle(body.r || body.w / 2);
      else box();
    }
  }
  if (hot) {
    ctx.strokeStyle = acid;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    if (body.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, (body.r || body.w / 2) * sx + 4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6);
    }
  }
  ctx.restore();
}
export {
  drawFrame
};
