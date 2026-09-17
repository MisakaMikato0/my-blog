const fs = require("fs");
const s = fs.readFileSync("public/admin/decap-cms.js", "utf8");
const i = s.indexOf("AppMainContainer");
console.log("idx", i);
console.log(s.slice(i-500, i+400));

