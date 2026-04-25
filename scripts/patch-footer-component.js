const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

// [filePath, relativeImportPath]
const files = [
  ["app/vehicles/[make]/[id]/parts/page.tsx", "../../../../components/Footer"],
  ["app/vehicles/[make]/page.tsx", "../../components/Footer"],
  ["app/vehicles/[make]/[id]/page.tsx", "../../../components/Footer"],
  ["app/part/[id]/page.tsx", "../../components/Footer"],
  ["app/decode/page.tsx", "../components/Footer"],
  ["app/contact/page.tsx", "../components/Footer"],
  ["app/categories/page.tsx", "../components/Footer"],
  ["app/categories/[slug]/page.tsx", "../../components/Footer"],
  ["app/parts-guide/page.tsx", "../components/Footer"],
  ["app/part/[id]/edit/page.tsx", "../../../components/Footer"],
  ["app/vehicles/[make]/edit/page.tsx", "../../../components/Footer"],
  ["app/vehicles/[make]/[id]/edit/page.tsx", "../../../../components/Footer"],
];

// Patterns to replace (multiline)
const SIMPLE_FOOTER = /\s*<footer className="border-t border-\[#1A1A1A\] bg-\[#141414\] py-4 text-center text-xs text-white\/40">\s*© \{new Date\(\)\.getFullYear\(\)\} Elroco\s*<\/footer>/g;

const BIG_FOOTER = /\s*<footer className="w-full border-t border-\[#1A1A1A\] bg-\[#0F0F0F\] px-6 py-6 text-sm text-white\/70">\s*<div className="mx-auto max-w-5xl text-center">[\s\S]*?<\/div>\s*<\/footer>/g;

// Replacement — just the JSX element (newline before it preserved by the regex consuming leading whitespace)
const REPLACEMENT = "\n      <Footer />";

for (const [rel, importPath] of files) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) { console.log("MISSING:", rel); continue; }

  let src = fs.readFileSync(full, "utf8");
  const original = src;

  // Replace footers
  src = src.replace(SIMPLE_FOOTER, REPLACEMENT);
  src = src.replace(BIG_FOOTER, REPLACEMENT);

  // Add Footer import if not already present
  if (!src.includes("import Footer from")) {
    // Insert after the last existing import line
    src = src.replace(
      /(import Header from "[^"]+";)/,
      `$1\nimport Footer from "${importPath}";`
    );
  }

  if (src !== original) {
    fs.writeFileSync(full, src, "utf8");
    console.log("UPDATED:", rel);
  } else {
    console.log("NO CHANGE:", rel);
  }
}
console.log("Done.");
