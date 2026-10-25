const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
assert(html.includes('</body></html>'),'HTML is incomplete');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
assert(scripts.length>0,'App script missing');
scripts.forEach(s=>new vm.Script(s));
assert(html.includes("data-view=\"feed\""),'Live tab missing');
console.log('Complete app HTML and JavaScript validated');

new vm.Script(fs.readFileSync('app/src/main/assets/espn.js','utf8'));
assert(fs.readFileSync('app/src/main/AndroidManifest.xml','utf8').includes('android.permission.INTERNET'),'Internet permission missing');
assert(fs.readFileSync('app/src/main/java/com/endzone/tracker/MainActivity.java','utf8').includes('getAssets().open("espn.js")'),'Bundled ESPN script loader missing');
assert(html.includes('EndzoneEspn.load('),'Live feed missing');
assert(!html.includes("feedStatus='DUMMY DATA"),'Dummy mode still active');
console.log('Live ESPN integration and Android network configuration validated');

new vm.Script(fs.readFileSync('app/src/main/assets/markets.js','utf8'));
assert(html.includes('Team scoring markets'));
assert(html.includes('enterkeyhint=\"done\"'));
console.log('Team scoring market module and numeric keyboard hints validated');

require('./check-markets.cjs');

require('./check-stats.cjs');

require('./check-props.cjs');

require('./check-details.cjs');
