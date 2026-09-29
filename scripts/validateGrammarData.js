const fs = require('fs');
const path = require('path');

const DATA_FILES = [
  path.join(__dirname, '..', 'src', 'data', 'n4GrammarPhrases.js'),
];

const SEPARATORS = /[～〜／\/…&、,\s]+/;
const READING_PARENS = /[（(][^）)]*[）)]/g;
const U_TO_I = {
  う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に',
  ぶ: 'び', む: 'み', る: 'り',
};

const loadEntries = (file) => {
  const raw = fs.readFileSync(file, 'utf8');
  return JSON.parse(raw.replace(/^\s*export default\s*/, '').replace(/;\s*$/, ''));
};

const phraseParts = (phrase) => {
  const parts = [];
  const groups = [
    ...phrase.matchAll(/（([^）]*)）/g),
    ...phrase.matchAll(/\(([^)]*)\)/g),
  ];
  for (const group of groups) {
    for (const piece of group[1].split(SEPARATORS)) parts.push(piece);
  }
  const outside = phrase.replace(READING_PARENS, ' ');
  for (const piece of outside.split(SEPARATORS)) parts.push(piece);
  return parts.filter(Boolean);
};

const partVariants = (part) => {
  const variants = new Set([part]);
  const last = part[part.length - 1];
  if (part.length >= 3) variants.add(part.slice(0, -1));
  if (part.length >= 4) variants.add(part.slice(0, -2));
  if (U_TO_I[last]) variants.add(part.slice(0, -1) + U_TO_I[last]);
  if (part.endsWith('する')) variants.add(part.slice(0, -2) + 'し');
  if (part.endsWith('くる')) variants.add(part.slice(0, -2) + 'き');
  const all = new Set();
  for (const variant of variants) {
    all.add(variant);
    all.add(variant.replace(/て/g, 'で'));
    all.add(variant.replace(/で/g, 'て'));
  }
  return [...all];
};

const partMatches = (part, example) => {
  if (part.endsWith('た')) {
    const forms = new Set([part, part.replace(/て/g, 'で'), part.replace(/で/g, 'て')]);
    return [...forms].some((v) => v && example.includes(v));
  }
  return partVariants(part).some((v) => v && example.includes(v));
};

let failed = false;
for (const file of DATA_FILES) {
  const entries = loadEntries(file);
  const failures = entries.filter(
    (e) => !phraseParts(e.phrase).some((p) => partMatches(p, e.example))
  );
  if (failures.length) {
    failed = true;
    console.error(
      `${path.basename(file)}: ${failures.length} phrase(s) not found in their example sentence:`
    );
    for (const f of failures) {
      console.error(`  - ${f.phrase}  =>  ${f.example}`);
    }
  } else {
    console.log(`${path.basename(file)}: all phrases appear in their example sentences`);
  }
}
process.exit(failed ? 1 : 0);
