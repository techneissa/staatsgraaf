/**
 * Lucide icons as plain path data that can be moved, scaled and turned, so
 * the graph canvas can join hundreds of them into one `<path>` per sector the
 * way it joins the marks themselves (one element per icon would not pan
 * inside the frame budget).
 *
 * An icon is parsed once into absolute drawing commands in its own 24-unit
 * box; `iconPathAt` then writes it centred on a point at a given size, turned
 * by a given angle. Only what lucide uses is supported: path, circle,
 * ellipse, rect (with rx), line, polyline, polygon.
 */

type IconElement = readonly [string, Readonly<Record<string, string | number | undefined>>];
export type IconNodeLike = readonly IconElement[];

/** One absolute command: M, L, C, Q, A or Z, with its numbers. */
type Command = { op: "M" | "L" | "C" | "Q" | "A" | "Z"; args: number[] };

export type ParsedIcon = Command[];

function tokens(d: string): (string | number)[] {
  const out: (string | number)[] = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(d))) out.push(match[1] ?? Number(match[2]));
  return out;
}

/** Arc flags may be written without separators ("a2 2 0 012 2"); split them. */
function arcTokens(d: string): (string | number)[] {
  const out: (string | number)[] = [];
  const raw = tokens(d);
  let command = "";
  let argIndex = 0;
  for (const token of raw) {
    if (typeof token === "string") {
      command = token;
      argIndex = 0;
      out.push(token);
      continue;
    }
    if ((command === "a" || command === "A") && (argIndex % 7 === 3 || argIndex % 7 === 4)) {
      const text = String(token);
      if (text.length > 1 && /^[01]/.test(text) && !text.startsWith("0.")) {
        out.push(Number(text[0]));
        argIndex += 1;
        const rest = text.slice(1);
        if (argIndex % 7 === 4 && /^[01]/.test(rest) && rest.length > 1 && !rest.startsWith("0.")) {
          out.push(Number(rest[0]));
          argIndex += 1;
          out.push(Number(rest.slice(1)));
          argIndex += 1;
          continue;
        }
        out.push(Number(rest));
        argIndex += 1;
        continue;
      }
    }
    out.push(token);
    argIndex += 1;
  }
  return out;
}

const ARITY: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

/** A path's `d` as absolute M, L, C, Q, A and Z commands. */
function parsePath(d: string): Command[] {
  const list = arcTokens(d);
  const out: Command[] = [];
  let i = 0;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let lastControl: { x: number; y: number } | null = null;
  let lastOp = "";
  let op = "";
  while (i < list.length) {
    if (typeof list[i] === "string") {
      op = list[i] as string;
      i += 1;
    }
    const upper = op.toUpperCase();
    const relative = op !== upper;
    const n = ARITY[upper];
    if (n === 0) {
      out.push({ op: "Z", args: [] });
      x = startX;
      y = startY;
      lastControl = null;
      lastOp = "Z";
      continue;
    }
    const args = list.slice(i, i + n) as number[];
    i += n;
    if (args.length < n) break;
    const ox = relative ? x : 0;
    const oy = relative ? y : 0;
    switch (upper) {
      case "M":
        x = ox + args[0];
        y = oy + args[1];
        startX = x;
        startY = y;
        out.push({ op: "M", args: [x, y] });
        op = relative ? "l" : "L";
        lastControl = null;
        break;
      case "L":
        x = ox + args[0];
        y = oy + args[1];
        out.push({ op: "L", args: [x, y] });
        lastControl = null;
        break;
      case "H":
        x = ox + args[0];
        out.push({ op: "L", args: [x, y] });
        lastControl = null;
        break;
      case "V":
        y = oy + args[0];
        out.push({ op: "L", args: [x, y] });
        lastControl = null;
        break;
      case "C": {
        const c = [ox + args[0], oy + args[1], ox + args[2], oy + args[3], ox + args[4], oy + args[5]];
        out.push({ op: "C", args: c });
        lastControl = { x: c[2], y: c[3] };
        x = c[4];
        y = c[5];
        break;
      }
      case "S": {
        const reflect: { x: number; y: number } =
          lastControl && (lastOp === "C" || lastOp === "S") ? { x: 2 * x - lastControl.x, y: 2 * y - lastControl.y } : { x, y };
        const c: number[] = [reflect.x, reflect.y, ox + args[0], oy + args[1], ox + args[2], oy + args[3]];
        out.push({ op: "C", args: c });
        lastControl = { x: c[2], y: c[3] };
        x = c[4];
        y = c[5];
        break;
      }
      case "Q": {
        const c = [ox + args[0], oy + args[1], ox + args[2], oy + args[3]];
        out.push({ op: "Q", args: c });
        lastControl = { x: c[0], y: c[1] };
        x = c[2];
        y = c[3];
        break;
      }
      case "T": {
        const reflect: { x: number; y: number } =
          lastControl && (lastOp === "Q" || lastOp === "T") ? { x: 2 * x - lastControl.x, y: 2 * y - lastControl.y } : { x, y };
        const c: number[] = [reflect.x, reflect.y, ox + args[0], oy + args[1]];
        out.push({ op: "Q", args: c });
        lastControl = reflect;
        x = c[2];
        y = c[3];
        break;
      }
      case "A": {
        const c = [args[0], args[1], args[2], args[3], args[4], ox + args[5], oy + args[6]];
        out.push({ op: "A", args: c });
        x = c[5];
        y = c[6];
        lastControl = null;
        break;
      }
    }
    lastOp = upper;
  }
  return out;
}

const num = (value: string | number | undefined, fallback = 0) => (value === undefined ? fallback : Number(value));

function ellipse(cx: number, cy: number, rx: number, ry: number): Command[] {
  return [
    { op: "M", args: [cx - rx, cy] },
    { op: "A", args: [rx, ry, 0, 1, 0, cx + rx, cy] },
    { op: "A", args: [rx, ry, 0, 1, 0, cx - rx, cy] },
    { op: "Z", args: [] },
  ];
}

function points(list: string, close: boolean): Command[] {
  const values = (list.match(/-?(?:\d+\.?\d*|\.\d+)/g) ?? []).map(Number);
  const out: Command[] = [];
  for (let i = 0; i + 1 < values.length; i += 2) out.push({ op: i === 0 ? "M" : "L", args: [values[i], values[i + 1]] });
  if (close) out.push({ op: "Z", args: [] });
  return out;
}

/** An icon's elements as one list of absolute commands in its 24-unit box. */
export function parseIcon(node: IconNodeLike): ParsedIcon {
  const out: Command[] = [];
  for (const [tag, attrs] of node) {
    switch (tag) {
      case "path":
        out.push(...parsePath(String(attrs.d ?? "")));
        break;
      case "circle":
        out.push(...ellipse(num(attrs.cx), num(attrs.cy), num(attrs.r), num(attrs.r)));
        break;
      case "ellipse":
        out.push(...ellipse(num(attrs.cx), num(attrs.cy), num(attrs.rx), num(attrs.ry)));
        break;
      case "line":
        out.push({ op: "M", args: [num(attrs.x1), num(attrs.y1)] }, { op: "L", args: [num(attrs.x2), num(attrs.y2)] });
        break;
      case "polyline":
        out.push(...points(String(attrs.points ?? ""), false));
        break;
      case "polygon":
        out.push(...points(String(attrs.points ?? ""), true));
        break;
      case "rect": {
        const x = num(attrs.x);
        const y = num(attrs.y);
        const w = num(attrs.width);
        const h = num(attrs.height);
        const r = Math.min(num(attrs.rx, num(attrs.ry)), w / 2, h / 2);
        if (r <= 0) {
          out.push(
            { op: "M", args: [x, y] },
            { op: "L", args: [x + w, y] },
            { op: "L", args: [x + w, y + h] },
            { op: "L", args: [x, y + h] },
            { op: "Z", args: [] },
          );
        } else {
          out.push(
            { op: "M", args: [x + r, y] },
            { op: "L", args: [x + w - r, y] },
            { op: "A", args: [r, r, 0, 0, 1, x + w, y + r] },
            { op: "L", args: [x + w, y + h - r] },
            { op: "A", args: [r, r, 0, 0, 1, x + w - r, y + h] },
            { op: "L", args: [x + r, y + h] },
            { op: "A", args: [r, r, 0, 0, 1, x, y + h - r] },
            { op: "L", args: [x, y + r] },
            { op: "A", args: [r, r, 0, 0, 1, x + r, y] },
            { op: "Z", args: [] },
          );
        }
        break;
      }
    }
  }
  return out;
}

const f = (value: number) => (Math.round(value * 100) / 100).toString();

/**
 * The icon as path data centred on (cx, cy), `size` units across its 24-unit
 * box, turned by `turn` radians about its own centre.
 */
export function iconPathAt(icon: ParsedIcon, cx: number, cy: number, size: number, turn = 0): string {
  const k = size / 24;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const at = (x: number, y: number) => {
    const u = (x - 12) * k;
    const v = (y - 12) * k;
    return `${f(cx + u * cos - v * sin)} ${f(cy + u * sin + v * cos)}`;
  };
  const parts: string[] = [];
  for (const command of icon) {
    const a = command.args;
    switch (command.op) {
      case "M":
      case "L":
        parts.push(`${command.op}${at(a[0], a[1])}`);
        break;
      case "C":
        parts.push(`C${at(a[0], a[1])} ${at(a[2], a[3])} ${at(a[4], a[5])}`);
        break;
      case "Q":
        parts.push(`Q${at(a[0], a[1])} ${at(a[2], a[3])}`);
        break;
      case "A":
        parts.push(`A${f(a[0] * k)} ${f(a[1] * k)} ${f(a[2] + (turn * 180) / Math.PI)} ${a[3]} ${a[4]} ${at(a[5], a[6])}`);
        break;
      case "Z":
        parts.push("Z");
        break;
    }
  }
  return parts.join("");
}
