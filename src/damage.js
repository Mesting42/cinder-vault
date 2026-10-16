import {WEAPONS} from './data.js';

const TYPES=new Set(['physical','magic','neutral']);
const WEAPON_TYPES=new Map(WEAPONS.map(w=>[w.id,w.classOnly==='mage'?'magic':'physical']));
const WEAPON_CLASSES=new Map(WEAPONS.map(w=>[w.id,w.classOnly]));
const NEUTRAL_KINDS=new Set(['pulse','environment','relic']);

export const DAMAGE_COLORS=Object.freeze({
  physical:Object.freeze({normal:'#ff756b',crit:'#ffa198'}),
  magic:Object.freeze({normal:'#cd8bff',crit:'#efd0ff'}),
  neutral:Object.freeze({normal:'#ff756b',crit:'#ffa198'})
});

// Attack form and damage type are independent: a gun's beam is physical,
// while a staff's beam is magical. In-flight and delayed attacks retain this
// context even if the player equips another weapon before they connect.
export function damageContext({classId=null,weaponId=null,kind=null,damageType=null}={}){
  const profession=classId||WEAPON_CLASSES.get(weaponId)||null;
  const resolved=TYPES.has(damageType)?damageType:NEUTRAL_KINDS.has(kind)?'neutral':WEAPON_TYPES.get(weaponId)||(profession==='mage'?'magic':['shooter','warrior'].includes(profession)?'physical':'neutral');
  return {damageType:resolved,classId:profession,weaponId};
}

const profile=(name,physical=0,magic=0)=>Object.freeze({name,physical,magic,neutral:0});
const ORDINARY=profile('普通敌人');
const ENEMIES=Object.freeze({
  gunner:ORDINARY,shotgun:ORDINARY,bat:ORDINARY,
  turret:profile('重甲炮台',.20,-.10),
  charger:profile('重甲冲锋者',.20,-.10),
  mage:profile('灵术施法者',-.10,.20)
});
const BOSSES=Object.freeze({
  guardian:profile('断誓钟卫',.08,0),
  bishop:profile('大司铳',0,.08),
  eclipse:profile('黑日裁决者',.04,.04)
});

export function enemyResistance(target){
  return target?.type==='boss'?BOSSES[target.bossId]||ORDINARY:ENEMIES[target?.type]||ORDINARY;
}

// Existing critical, relic and status multipliers belong before this call.
// Round once, so low-damage attacks remain usable against resistant enemies.
export function resolveDamage(raw,target,context={}){
  const {damageType}=damageContext(context),profile=enemyResistance(target),resistance=profile[damageType];
  const value=Number(raw),amount=Number.isFinite(value)&&value>0?Math.max(1,Math.round(value*(1-resistance))):0;
  return {amount,damageType,resistance,profile};
}
