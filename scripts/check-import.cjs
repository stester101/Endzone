const assert=require('node:assert/strict');
const M=require('../app/src/main/assets/markets.js');
const legs=[3,1.5,1.6,2.2,2.75,2].map((odds,i)=>({game:'fixture-'+i,side:'home',market:'win',odds}));
const config=M.importStructure({stake:0.3,system:{size:5}},legs);
assert.deepEqual(config,{mode:'system',size:5,stake:0.3});
const folds=M.systemBets(legs,config.size,config.stake);
assert.equal(folds.length,6);assert.equal(folds[0].legs.length,5);assert.equal(new Set(folds.map(f=>f.legs.map(l=>l.game).join(','))).size,6);
assert.deepEqual(folds.map(f=>f.return),[13.07,9.5,11.88,16.34,17.42,8.71]);
assert.equal(folds.reduce((n,f)=>n+f.stake,0).toFixed(2),'1.80');
assert.equal(M.importStructure({stake:2},legs).mode,'single');
assert.equal(M.importStructure({system:{size:5,stakePerBet:'0,30'}},legs).stake,0.3);
for(const system of [{size:6},{size:0},{size:2.5},{size:5,stakePerBet:-1},true,[]])assert.throws(()=>M.importStructure({stake:0.3,system},legs));
assert.throws(()=>M.importStructure({stake:0.3,system:{size:5}},legs.map((l,i)=>i?l:{...l,odds:undefined})),/odds/i);
console.log('System draft imports preserve fold size, per-bet stake and six distinct returns; invalid structures rejected');

assert.equal(M.formatOdds(29.040000000000006),'29.04');assert.equal(M.formatOdds('3/1'),'3/1');
