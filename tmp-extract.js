
const fs = require("fs");
const path = "src/components/pages/gallery/admin/GalleryAdmin.svelte";
const s = fs.readFileSync(path, "utf8");
const i = s.indexOf("async function handleFiles");
const j = s.indexOf("async function handleCreateAlbum");
fs.writeFileSync("tmp-gallery-handlefiles.txt", s.slice(i, j));
const p2 = "src/components/pages/dynamic/admin/DynamicAdmin.svelte";
const s2 = fs.readFileSync(p2, "utf8");
const i2 = s2.indexOf("async function handleFiles");
const j2 = s2.indexOf("function removeFormImage");
fs.writeFileSync("tmp-dynamic-handlefiles.txt", s2.slice(i2, j2));
console.log("gallery", i, j, "dyn", i2, j2);

