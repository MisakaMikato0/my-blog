const fs = require("fs");
const p = "src/test/cms-config.test.ts";
const text = fs.readFileSync(p, "utf8");
const start = text.indexOf('it("cache-busts the preview assets after CMS template changes"');
if (text.includes("gives Decap a full-height mount")) {
  console.log("already present");
  process.exit(0);
}
if (start < 0) {
  console.log("needle missing");
  process.exit(1);
}
const insert = [
  '	it("gives Decap a full-height mount so the editor pane is visible", () => {',
  '		const indexPath = path.resolve("public/admin/index.html");',
  '		const index = fs.readFileSync(indexPath, "utf8");',
  '',
  '		expect(index).toMatch(/html,\\s*body\\s*\\{[^}]*height:\\s*100%/);',
  '		expect(index).toMatch(/#nc-root\\s*\\{[^}]*height:\\s*100%/);',
  '	});',
  '',
  ''
].join("\n");
const out = text.slice(0, start) + insert + text.slice(start);
fs.writeFileSync(p, out);
console.log("inserted at", start);
