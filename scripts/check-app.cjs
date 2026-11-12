const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
assert(html.includes('</body></html>'),'HTML is incomplete');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
assert(scripts.length>0,'App script missing');
scripts.forEach(s=>new vm.Script(s));
assert(html.includes("data-view=\"feed\""),'Live tab missing');
new vm.Script(fs.readFileSync('app/src/main/assets/premium.js','utf8'));
for(const f of ['night.css','premium.css','premium.js'])assert(fs.readFileSync('app/src/main/java/com/endzone/tracker/MainActivity.java','utf8').includes('asset("'+f+'")'),f+' not bundled');
assert(html.includes('window.EndzoneApp='),'Premium hook missing');
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

require("./check-import.cjs");

require("./check-compact.cjs");

const main=fs.readFileSync('app/src/main/java/com/endzone/tracker/MainActivity.java','utf8');
for(const m of ['addJavascriptInterface','"EndzoneNative"','shareText','shareImage','keepAwake','haptic'])assert(main.includes(m),'Bridge missing '+m);
assert(fs.readFileSync('app/src/main/AndroidManifest.xml','utf8').includes('com.endzone.tracker.fileprovider'),'FileProvider missing');
console.log('Native bridge validated');

assert(fs.readFileSync('app/src/main/assets/premium.js','utf8').includes('window.EndzonePremium='),'Shared premium API missing');
console.log('Premium shared API validated');

assert(fs.readFileSync('app/src/main/assets/premium.js','utf8').includes('shareBet'),'Share slip missing');
console.log('Share slip validated');

assert(fs.readFileSync('app/src/main/assets/premium.js','utf8').includes('calendarHtml'),'Stats calendar missing');
console.log('Stats calendar validated');

assert(fs.readFileSync('app/src/main/assets/premium.js','utf8').includes('setSweat'),'Sweat mode missing');
console.log('Sweat mode validated');
