import { mkdirSync, writeFileSync, rmSync } from "node:fs";
mkdirSync("public/media", { recursive: true });
mkdirSync("data/seed-media", { recursive: true });
const save = (name, body, w = 1200, h = 720) => {
  const isPrivate = /^(cat-[1-3]|todo)$/.test(name);
  if (isPrivate) rmSync(`public/media/${name}.svg`, { force: true });
  writeFileSync(
    `${isPrivate ? "data/seed-media" : "public/media"}/${name}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`,
  );
};
const palettes = [
  ["#cfc3eb", "#212538", "#e1ad86", "#49342c"],
  ["#bbd8da", "#284246", "#ecc39f", "#292b32"],
  ["#edd3bb", "#33334f", "#c88d6f", "#201d28"],
  ["#c4d2ee", "#202940", "#e8bb9a", "#23202d"],
  ["#c6d7c5", "#3d384d", "#b87c5b", "#3c2929"],
  ["#e7c9cf", "#53405d", "#f0ccad", "#512f27"],
];
for (let n = 1; n <= 16; n++) {
  const [bg, shirt, skin, hair] = palettes[(n - 1) % palettes.length];
  save(
    `avatar-${n}`,
    `<defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="${shirt}"/></linearGradient></defs><rect width="240" height="240" fill="url(#b)"/><circle cx="190" cy="38" r="90" fill="white" opacity=".08"/><path d="M30 240Q35 166 120 165Q205 166 215 240" fill="${shirt}"/><path d="M98 152v30q22 19 44 0v-30" fill="${skin}"/><ellipse cx="120" cy="107" rx="53" ry="65" fill="${skin}"/><path d="M66 108Q48 29 116 27Q188 24 174 115L158 76Q120 85 92 60L79 109Z" fill="${hair}"/>${n % 3 === 0 ? '<path d="M73 75Q46 142 66 178l30-18-14-87m82 0q29 64 11 104l-25-17 13-88" fill="' + hair + '"/>' : ""}<path d="M95 110h10m31 0h10" stroke="#302c31" stroke-width="5" stroke-linecap="round"/><path d="M109 140q12 9 24-1" stroke="#8e5752" stroke-width="4" fill="none" stroke-linecap="round"/>${n % 4 === 0 ? '<g fill="none" stroke="#292b3c" stroke-width="4"><rect x="83" y="98" width="31" height="24" rx="8"/><rect x="128" y="98" width="31" height="24" rx="8"/><path d="M114 106h14"/></g>' : ""}`,
    240,
    240,
  );
}
const sky = (a, b) =>
  `<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><linearGradient id="water" x2="0" y2="1"><stop stop-color="#809aaf"/><stop offset="1" stop-color="#273c54"/></linearGradient><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".09"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter></defs><rect width="1200" height="720" fill="url(#sky)"/>`;
save(
  "scene-1",
  sky("#d2adad", "#eedcc7") +
    '<g filter="url(#grain)"><circle cx="815" cy="190" r="65" fill="#ffe4c0"/><path d="M0 440L170 257 310 371 485 127 731 437 870 285 1200 466V720H0Z" fill="#687686"/><path d="M310 371L485 127 550 211 510 198 493 223 466 199 428 250Z" fill="#e1d8d0"/><path d="M0 478L173 352 389 485 742 310 1017 493 1200 420V720H0Z" fill="#3a5364"/><path d="M0 518Q420 438 1200 525V720H0Z" fill="url(#water)"/><path d="M410 540h330m-225 33h390m-453 45h400" stroke="#c7b9b7" stroke-width="3" opacity=".45"/><path d="M0 720V531l38-99 39 103 39-170 60 171 44-76 39 155 50-53v158Z" fill="#1c333b"/><path d="M1200 720V472l-40-126-42 128-54-186-57 203-56-83-37 185-74-17v144Z" fill="#1c333b"/></g>',
);
save(
  "scene-2",
  sky("#c7b2c1", "#e3bea5") +
    '<circle cx="870" cy="250" r="88" fill="#f8d3a8"/><path d="M0 408Q420 368 1200 410V720H0" fill="#667d8c"/><path d="M0 485Q500 430 1200 475V720H0" fill="#375969"/><path d="M0 658Q400 440 1200 610V720H0" fill="#d3b694"/><path d="M162 720Q260 350 210 145" fill="none" stroke="#343f44" stroke-width="26"/><g fill="#34494a"><path d="M210 145Q48 46 22 211q85-79 188-66M210 145Q315 4 422 117q-130-17-212 28M210 145Q346 123 391 269q-117-100-181-124M210 145Q112 84 88 19q-36 106 122 126"/></g><path d="M560 512q190-34 390-4m-350 24q112-21 218-7" stroke="#d2c6b4" opacity=".6" fill="none" stroke-width="4"/>',
);
save(
  "scene-3",
  sky("#7589ab", "#dbb0b6") +
    '<circle cx="900" cy="210" r="68" fill="#e9bfae"/><g fill="#354354"><path d="M0 720V310h120v410m30 0V220h130v500m32 0V370h110v350m30 0V160h160v560m30 0V290h170v430m30 0V210h130v510m30 0V340h180v380"/></g><g fill="#d7b68d" opacity=".8">' +
    Array.from(
      { length: 65 },
      (_, i) =>
        `<rect x="${(i % 13) * 94 + 24}" y="${Math.floor(i / 13) * 70 + 380}" width="13" height="24" rx="2"/>`,
    ).join("") +
    '</g><path d="M0 720L400 490H800l400 230" fill="#242d3d"/><path d="M490 720L585 498m130 222L620 498" stroke="#b5a9ac" stroke-width="4" opacity=".5"/>',
);
save(
  "scene-4",
  '<defs><radialGradient id="g"><stop stop-color="#b3947b"/><stop offset="1" stop-color="#504842"/></radialGradient></defs><rect width="1200" height="720" fill="url(#g)"/><path d="M0 280L1200 100v340L0 620Z" fill="#9e7f62"/><path d="M100 550l370-65 50 193-370 40Z" fill="#d9d0b8"/><path d="M153 574l284-45m-273 70l280-44m-267 70l280-44" stroke="#a9a28e" stroke-width="3"/><ellipse cx="760" cy="440" rx="210" ry="145" fill="#302b2a" opacity=".3"/><ellipse cx="733" cy="393" rx="196" ry="143" fill="#dbd4c5"/><path d="M863 301q156-40 140 69-5 62-98 55" fill="none" stroke="#e7e0ce" stroke-width="34"/><ellipse cx="733" cy="365" rx="151" ry="111" fill="#f4e8d1"/><ellipse cx="733" cy="363" rx="134" ry="96" fill="#835a3c"/><path d="M731 420Q604 347 689 324q31-4 44 32 33-65 69-29 42 38-71 93Z" fill="#e7d0a5"/><path d="M676 208q-25-49 6-97m67 92q-25-49 6-97" fill="none" stroke="#e6d5c0" stroke-width="8" opacity=".25"/>',
);
save(
  "scene-5",
  sky("#95b4b4", "#d6ceac") +
    '<path d="M0 475Q300 260 650 449T1200 379V720H0" fill="#5f7f72"/><path d="M0 580Q400 375 800 499T1200 450V720H0" fill="#36594d"/>' +
    Array.from(
      { length: 18 },
      (_, i) =>
        `<path d="M${i * 79 - 30} 720V${250 + (i % 4) * 50}l-90 230h55l-70 110h80v130m0-420l87 200h-50l75 110h-78" fill="${i % 2 ? "#284a42" : "#203e38"}"/>`,
    ).join("") +
    '<path d="M520 720Q780 580 700 475" fill="none" stroke="#c8b38d" stroke-width="36"/>',
);
save(
  "scene-6",
  sky("#b7c6d7", "#d9d9c5") +
    '<path d="M0 330Q350 300 1200 350V720H0" fill="#8fa8b0"/><path d="M0 575Q300 400 1200 640V720H0" fill="#ded3b4"/><path d="M150 625L370 396h150L300 640Z" fill="#86765f"/><path d="M410 434l150-25 130 63-121 30Z" fill="#ece7d7"/><path d="M565 500v168m-18-269v-195" stroke="#5b6868" stroke-width="8"/><path d="M552 206l155 190-145-20Z" fill="#ede6cf"/><path d="M555 222L440 380h109Z" fill="#c2c9c3"/>',
);
for (let n = 7; n <= 8; n++)
  save(
    `scene-${n}`,
    sky(n === 7 ? "#a698be" : "#c8c3af", n === 7 ? "#dfb2a8" : "#a2b7ab") +
      '<circle cx="850" cy="220" r="90" fill="#e9cdb0"/><path d="M0 530L250 260 500 520 760 290 1200 570V720H0" fill="#686f80"/><path d="M0 640L360 400 720 620 1000 370 1200 480V720H0" fill="#3e555d"/><path d="M0 690Q500 550 1200 680V720H0" fill="#2b454b"/>',
  );
for (let n = 1; n <= 3; n++)
  save(
    `cat-${n}`,
    `<rect width="1200" height="720" fill="${["#c9b5a2", "#aebdb5", "#c0b6ce"][n - 1]}"/><ellipse cx="620" cy="650" rx="330" ry="60" fill="#202934" opacity=".1"/><path d="M420 330L390 110l175 128q90-34 167 0l165-123-26 232q99 307-225 311-312 4-226-328" fill="${n === 1 ? "#d5a469" : n === 2 ? "#5e6570" : "#e5d6bb"}"/><path d="M440 281l-17-111 92 86m267-1l91-86-14 112" fill="#d3918d"/><ellipse cx="533" cy="390" rx="28" ry="36" fill="#d2d3a0"/><ellipse cx="755" cy="390" rx="28" ry="36" fill="#d2d3a0"/><path d="M533 364v52m222-52v52" stroke="#25323b" stroke-width="14"/><path d="M622 455l44 0-22 27Z" fill="#a26768"/><path d="M644 483q-12 28-37 11m37-11q16 27 40 10m-192-54-115-20m115 40-118 14m389-34 115-20m-115 40 118 14" stroke="#584c46" stroke-width="6" fill="none"/>`,
  );
save(
  "todo",
  '<rect width="1200" height="720" fill="#b4b9c6"/><rect x="300" y="55" width="600" height="630" rx="12" fill="#eeeadd"/><text x="370" y="145" font-family="Arial" font-size="38" fill="#4f5665">THINGS I DID TODAY</text>' +
    [240, 330, 420, 510]
      .map(
        (y) =>
          `<rect x="370" y="${y}" width="30" height="30" rx="4" fill="none" stroke="#9b9d9b" stroke-width="3"/><path d="M440 ${y + 25}h380" stroke="#c3c1b8" stroke-width="3"/>`,
      )
      .join(""),
);
console.log("Local original SVG media ready.");
