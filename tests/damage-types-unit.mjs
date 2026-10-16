import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {WEAPONS} from '../src/data.js';
import {damageContext,enemyResistance,resolveDamage,DAMAGE_COLORS} from '../src/damage.js';

const checks=[],evidence={weapons:[],profiles:[]},errors=[];
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name);};
await mkdir('test-artifacts',{recursive:true});
try{
  for(const w of WEAPONS){
    const context=damageContext({weaponId:w.id,kind:w.kind}),expected=w.classOnly==='mage'?'magic':'physical';
    check(w.id+' resolves its profession type independently of attack form',context.damageType===expected&&context.classId===w.classOnly&&context.weaponId===w.id);
    evidence.weapons.push({id:w.id,kind:w.kind,spell:!!w.spell,...context});
  }
  const profiles=[
    [{type:'gunner'},0,0], [{type:'shotgun'},0,0], [{type:'bat'},0,0],
    [{type:'turret'},.20,-.10], [{type:'charger'},.20,-.10], [{type:'mage'},-.10,.20],
    [{type:'boss',bossId:'guardian'},.08,0], [{type:'boss',bossId:'bishop'},0,.08], [{type:'boss',bossId:'eclipse'},.04,.04]
  ];
  for(const [target,physical,magic]of profiles){
    const id=target.bossId||target.type,p=enemyResistance(target);
    for(const [damageType,resistance]of [['physical',physical],['magic',magic],['neutral',0]]){
      const result=resolveDamage(100,target,{damageType});
      check(id+' '+damageType+' applies the exact profile once',p[damageType]===resistance&&result.resistance===resistance&&result.amount===Math.round(100*(1-resistance))&&result.damageType===damageType);
      evidence.profiles.push({id,damageType,...result});
    }
  }
  check('gun beams and ice ammunition remain physical',damageContext({classId:'shooter',weaponId:'laser',kind:'laser'}).damageType==='physical'&&damageContext({weaponId:'frost',kind:'frost'}).damageType==='physical');
  check('warrior returning blades remain physical despite their legacy spell flag',damageContext({classId:'warrior',weaponId:'eclipseglaive',kind:'orbit'}).damageType==='physical');
  check('explicit source type overrides current profession and current attack form',damageContext({classId:'mage',weaponId:'ritualstaff',kind:'laser',damageType:'physical'}).damageType==='physical');
  check('explicit magic origin survives an otherwise neutral relic burst',damageContext({classId:'shooter',kind:'relic',damageType:'magic'}).damageType==='magic');
  check('unattributed pulse environment and relic damage are neutral', ['pulse','environment','relic'].every(kind=>damageContext({classId:'mage',kind}).damageType==='neutral'));
  check('unattributed damage is neutral',damageContext().damageType==='neutral');
  check('unknown enemy profiles have no implicit immunity',resolveDamage(25,{type:'unknown'},{damageType:'magic'}).amount===25&&resolveDamage(25,{type:'boss',bossId:'unknown'},{damageType:'physical'}).amount===25);
  check('positive chip damage cannot round down to immunity',resolveDamage(.1,{type:'turret'},{damageType:'physical'}).amount===1&&resolveDamage(1,{type:'mage'},{damageType:'magic'}).amount===1);
  check('zero negative and nonfinite raw damage do not create damage', [0,-1,NaN,Infinity,-Infinity].every(raw=>resolveDamage(raw,{type:'turret'},{damageType:'physical'}).amount===0));
  check('existing multipliers are rounded only after resistance',resolveDamage(9*1.3,{type:'turret'},{damageType:'magic'}).amount===13);
  for(const [type,crit,color]of [['physical',false,'#ff756b'],['physical',true,'#ffa198'],['magic',false,'#cd8bff'],['magic',true,'#efd0ff']])check(type+(crit?' critical':' regular')+' uses the requested number color',DAMAGE_COLORS[type][crit?'crit':'normal']===color);
  check('neutral utilities keep the physical red number palette',DAMAGE_COLORS.neutral.normal===DAMAGE_COLORS.physical.normal&&DAMAGE_COLORS.neutral.crit===DAMAGE_COLORS.physical.crit);
  await writeFile('test-artifacts/damage-types-unit.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(error){errors.push(error.message);await writeFile('test-artifacts/damage-types-unit.json',JSON.stringify({status:'FAIL',checks,errors,evidence},null,2));console.error(error);process.exitCode=1;}
