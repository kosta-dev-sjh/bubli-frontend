import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assets = {
  appIcon: join(root, "public/brand/icon-app-512.png"),
  headerOutput: join(root, "src-tauri/icons/installer-header.bmp"),
  sidebarOutput: join(root, "src-tauri/icons/installer-sidebar.bmp"),
};

for (const [name, filePath] of Object.entries(assets)) {
  if (name.endsWith("Output")) {
    continue;
  }
  if (!existsSync(filePath)) {
    throw new Error(`Missing installer art source asset: ${filePath}`);
  }
}

function makeDataUri(filePath) {
  const extension = extname(filePath).slice(1).toLowerCase().replace("jpg", "jpeg");
  return `data:image/${extension};base64,${readFileSync(filePath).toString("base64")}`;
}

function bmpFromRaw({ data, info }) {
  const { width, height, channels } = info;
  const rowStride = Math.ceil((width * 3) / 4) * 4;
  const pixelSize = rowStride * height;
  const fileSize = 54 + pixelSize;
  const output = Buffer.alloc(fileSize);

  output.write("BM", 0, 2, "ascii");
  output.writeUInt32LE(fileSize, 2);
  output.writeUInt32LE(54, 10);
  output.writeUInt32LE(40, 14);
  output.writeInt32LE(width, 18);
  output.writeInt32LE(height, 22);
  output.writeUInt16LE(1, 26);
  output.writeUInt16LE(24, 28);
  output.writeUInt32LE(0, 30);
  output.writeUInt32LE(pixelSize, 34);
  output.writeInt32LE(2835, 38);
  output.writeInt32LE(2835, 42);

  for (let y = 0; y < height; y += 1) {
    const srcY = height - 1 - y;
    for (let x = 0; x < width; x += 1) {
      const src = (srcY * width + x) * channels;
      const dst = 54 + y * rowStride + x * 3;
      output[dst] = data[src + 2];
      output[dst + 1] = data[src + 1];
      output[dst + 2] = data[src];
    }
  }

  return output;
}

async function writeBmp(image, outputPath) {
  const raw = await image.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  writeFileSync(outputPath, bmpFromRaw(raw));
}

async function renderHeader() {
  const width = 150;
  const height = 57;
  const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#FCFDFF"/>
          <stop offset="0.58" stop-color="#F4FAFF"/>
          <stop offset="1" stop-color="#F8F6FF"/>
        </linearGradient>
        <linearGradient id="word" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#3A78B8"/>
          <stop offset="0.66" stop-color="#6FB8F2"/>
          <stop offset="1" stop-color="#6E63B8"/>
        </linearGradient>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#506E82" flood-opacity="0.12"/>
        </filter>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#paper)"/>
      <rect x="45" y="13" width="91" height="30" rx="15" fill="#FFFFFF" opacity="0.74" stroke="#D8F0FF" filter="url(#soft)"/>
      <circle cx="125" cy="17" r="9" fill="#DCD8F8" opacity="0.58"/>
      <text x="53" y="28" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="850" fill="url(#word)">Bubli</text>
      <text x="53" y="39" font-family="Segoe UI, Arial, sans-serif" font-size="6.5" font-weight="720" fill="#586978">Desktop workspace</text>
    </svg>
  `);

  await writeBmp(
    sharp(svg).composite([
      {
        input: await sharp(assets.appIcon).resize(30, 30, { fit: "contain" }).png().toBuffer(),
        left: 12,
        top: 13,
      },
    ]),
    assets.headerOutput,
  );
}

async function renderSidebar() {
  const width = 164;
  const height = 314;
  const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#FCFDFF"/>
          <stop offset="0.48" stop-color="#F3FAFF"/>
          <stop offset="1" stop-color="#F8F6FF"/>
        </linearGradient>
        <linearGradient id="word" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#3A78B8"/>
          <stop offset="0.64" stop-color="#6FB8F2"/>
          <stop offset="1" stop-color="#6E63B8"/>
        </linearGradient>
        <filter id="cardShadow" x="-45%" y="-45%" width="190%" height="190%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#506E82" flood-opacity="0.14"/>
        </filter>
        <filter id="bubbleShadow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="9" stdDeviation="8" flood-color="#3A78B8" flood-opacity="0.18"/>
        </filter>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#paper)"/>
      <circle cx="29" cy="35" r="27" fill="#D8F0FF" opacity="0.72"/>
      <circle cx="132" cy="55" r="31" fill="#DCD8F8" opacity="0.44"/>
      <circle cx="132" cy="263" r="48" fill="#F6DDEB" opacity="0.36"/>

      <rect x="19" y="64" width="126" height="126" rx="24" fill="#FFFFFF" opacity="0.86" stroke="#FFFFFF" filter="url(#cardShadow)"/>
      <rect x="34" y="84" width="68" height="10" rx="5" fill="#D8F0FF"/>
      <rect x="34" y="102" width="96" height="22" rx="11" fill="#F2F7FC" stroke="#E5E7EB"/>
      <circle cx="47" cy="113" r="5" fill="#6FB8F2"/>
      <rect x="58" y="108" width="54" height="6" rx="3" fill="#586978" opacity="0.72"/>
      <rect x="34" y="133" width="82" height="22" rx="11" fill="#FFFFFF" stroke="#D8F0FF"/>
      <circle cx="47" cy="144" r="5" fill="#B0A8E0"/>
      <rect x="58" y="139" width="44" height="6" rx="3" fill="#586978" opacity="0.58"/>

      <circle cx="82" cy="151" r="37" fill="#FFFFFF" opacity="0.18"/>
      <circle cx="82" cy="151" r="32" fill="#EAF7FF" opacity="0.42"/>
      <circle cx="82" cy="151" r="25" fill="#FFFFFF" opacity="0.62"/>
      <path d="M61 160 C68 141, 82 132, 101 143 C98 161, 85 174, 68 171 C66 168, 63 164, 61 160 Z" fill="#6FB8F2" opacity="0.42" filter="url(#bubbleShadow)"/>

      <rect x="29" y="205" width="106" height="34" rx="17" fill="#FFFFFF" opacity="0.78" stroke="#D8F0FF" filter="url(#cardShadow)"/>
      <circle cx="47" cy="222" r="8" fill="#93CFA8" opacity="0.92"/>
      <rect x="61" y="215" width="52" height="6" rx="3" fill="#23303B" opacity="0.82"/>
      <rect x="61" y="226" width="40" height="5" rx="2.5" fill="#586978" opacity="0.5"/>

      <text x="82" y="265" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="850" fill="url(#word)">Bubli</text>
      <text x="82" y="282" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="8.6" font-weight="750" fill="#586978">Windows desktop app</text>
      <text x="82" y="296" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="7" font-weight="700" fill="#8A94A0">Work stays beside you</text>
    </svg>
  `);

  await writeBmp(
    sharp(svg).composite([
      {
        input: await sharp(assets.appIcon).resize(48, 48, { fit: "contain" }).png().toBuffer(),
        left: 58,
        top: 118,
      },
    ]),
    assets.sidebarOutput,
  );
}

await renderHeader();
await renderSidebar();
console.log("Generated Tauri NSIS installer art.");
