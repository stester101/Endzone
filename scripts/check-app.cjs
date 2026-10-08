const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
assert(html.includes('</body></html>'),'HTML is incomplete');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
assert(scripts.length>0,'App script missing');
scripts.forEach(s=>new vm.Script(s));
assert(html.includes("data-view=\"feed\""),'Live tab missing');
console.log('Complete app HTML and JavaScript validated');
