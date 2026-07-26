type JourneyShareImageInput = {
  title: string;
  summary: string;
  publicId: string;
  peopleCount: number;
  finalRunway?: string;
};

const WIDTH = 1200;
const HEIGHT = 1500;
const INK = "#292332";
const PAPER = "#fff9ed";
const SUN = "#ffd833";
const PINK = "#ec4d76";
const TEAL = "#55d3ce";

function clean(value: string, fallback: string) {
  return value.trim().replace(/\s+/g, " ") || fallback;
}

function shareImageFilename(title: string) {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 52);
  return `idea-hero-${slug || "jornada"}.png`;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.closePath();
}

function wrapLines(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  maxLines: number,
) {
  const lines: string[] = [];
  let line = "";
  for (const word of value.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const clipped = lines.slice(0, maxLines);
  let lastLine = clipped[maxLines - 1];
  while (context.measureText(`${lastLine}...`).width > maxWidth)
    lastLine = lastLine.slice(0, -1).trimEnd();
  clipped[maxLines - 1] = `${lastLine}...`;
  return clipped;
}

function drawTextBlock(
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
) {
  lines.forEach((line, index) =>
    context.fillText(line, x, y + index * lineHeight),
  );
}

/** Creates a social-ready PNG instead of making people share a plain text snippet. */
export async function createJourneyShareImage(
  input: JourneyShareImageInput,
): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("Nao foi possivel criar a imagem para compartilhar.");

  const title = clean(input.title, "Nossa grande ideia");
  const summary = clean(
    input.summary,
    "Uma ideia criada em grupo no IDEA HERO.",
  );
  context.fillStyle = PAPER;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = TEAL;
  context.beginPath();
  context.arc(1110, 70, 205, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = SUN;
  context.beginPath();
  context.arc(105, 1375, 220, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.translate(112, 114);
  context.rotate(-0.055);
  context.fillStyle = INK;
  roundedRect(context, 12, 14, 970, 1190, 46);
  context.fill();
  context.fillStyle = "#fffdf8";
  roundedRect(context, 0, 0, 970, 1190, 46);
  context.fill();
  context.fillStyle = PINK;
  roundedRect(context, 64, 66, 255, 68, 34);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "800 27px Inter, Arial, sans-serif";
  context.fillText("IDEA HERO", 94, 110);

  context.strokeStyle = INK;
  context.lineWidth = 11;
  context.beginPath();
  context.moveTo(720, 92);
  context.lineTo(868, 92);
  context.moveTo(794, 19);
  context.lineTo(794, 165);
  context.moveTo(742, 40);
  context.lineTo(846, 144);
  context.moveTo(846, 40);
  context.lineTo(742, 144);
  context.stroke();
  context.fillStyle = INK;
  context.font = "700 32px Inter, Arial, sans-serif";
  context.fillText("JORNADA CONCLUIDA", 64, 218);
  context.font = "800 98px Inter, Arial, sans-serif";
  const titleLines = wrapLines(context, title, 840, 3);
  drawTextBlock(context, titleLines, 64, 345, 110);
  const titleBottom = 345 + (titleLines.length - 1) * 110;
  context.fillStyle = PINK;
  roundedRect(context, 64, titleBottom + 78, 260, 18, 9);
  context.fill();
  context.fillStyle = "#f3e7cb";
  roundedRect(context, 64, titleBottom + 152, 842, 250, 32);
  context.fill();
  context.fillStyle = INK;
  context.font = "600 43px Inter, Arial, sans-serif";
  drawTextBlock(
    context,
    wrapLines(context, summary, 752, 4),
    109,
    titleBottom + 224,
    58,
  );

  const statY = titleBottom + 430;
  context.fillStyle = TEAL;
  roundedRect(context, 64, statY, 400, 184, 32);
  context.fill();
  context.fillStyle = SUN;
  roundedRect(context, 506, statY, 400, 184, 32);
  context.fill();
  context.fillStyle = INK;
  context.font = "800 25px Inter, Arial, sans-serif";
  context.fillText("CRIADA POR", 98, statY + 57);
  context.fillText(
    input.finalRunway ? "RUNWAY FINAL" : "JORNADA",
    540,
    statY + 57,
  );
  context.font = "800 62px Inter, Arial, sans-serif";
  context.fillText(
    `${input.peopleCount} ${input.peopleCount === 1 ? "HEROI" : "HEROIS"}`,
    98,
    statY + 131,
  );
  context.font = input.finalRunway
    ? "700 34px Inter, Arial, sans-serif"
    : "700 42px Inter, Arial, sans-serif";
  context.fillText(input.finalRunway ?? `#${input.publicId}`, 540, statY + 127);
  context.restore();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("Nao foi possivel finalizar a imagem.")),
      "image/png",
    );
  });
  return new File([blob], shareImageFilename(title), { type: "image/png" });
}
