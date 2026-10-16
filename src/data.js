import {defineFootprint,ROOM_SHAPES,TOMB_SHAPES,SUN_SHAPES} from './rooms.js';
import {NEW_WEAPONS,NEW_PASSIVES,newSynergies} from './expansion-data.js';
export const FLOORS=[null,{name:'旧军械圣殿',start:'巡火者落点',subtitle:'在最后一束光下，装填你的信仰。',music:'floor1'},{name:'地下墓陵',start:'墓陵前庭',subtitle:'穿过骨墙与墓灯，寻找大司铳的葬殿。',music:'floor2'},{name:'黑日圣坛',start:'日蚀前庭',subtitle:'穿过赤祭与暗金，终结黑日裁决者的审判。',music:'eclipse'}];
export const TAU = Math.PI * 2;
export class RNG {
  constructor(seed) { this.state = seed >>> 0 || 1; }
  next() { let t = this.state += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  int(a,b) { return a + Math.floor(this.next() * (b-a+1)); }
  pick(a) { return a[this.int(0,a.length-1)]; }
  shuffle(a) { const b=[...a]; for(let i=b.length-1;i>0;i--){let j=this.int(0,i);[b[i],b[j]]=[b[j],b[i]];} return b; }
}
export const WEAPONS = [
  {id:'froststaff',name:'霜灯法杖',en:'FROST LANTERN',classOnly:'mage',spell:true,kind:'frost',damage:9,rate:.30,mag:12,reload:.95,speed:29,range:29,spread:.045,pellets:2,color:0x86e2ff,price:0,desc:'双霜晶法术 · 命中减速，三次命中冻结 · R 凝聚法力',trait:'双霜晶 / 冻结 / 0.95秒凝聚'},
  {id:'copperblade',name:'赤铜重刃',en:'COPPER CLEAVER',classOnly:'warrior',kind:'melee',damage:30,rate:.42,mag:1,reload:0,speed:0,range:3.5,spread:1.05,pellets:1,color:0xffb56b,price:0,desc:'三段扇形挥斩 · 第三斩强化 · 挥斩可击散面前敌弹，无需换弹',trait:'重刃 / 3.5m · 120° / 0.42秒连斩'},
  {id:'oathaxe',name:'断誓战斧',en:'OATHBREAKER',classOnly:'warrior',kind:'melee',damage:48,rate:.72,mag:1,reload:0,speed:0,range:4.0,arc:1.48,spread:1.48,pellets:1,color:0xffad72,price:38,rollWeaponScale:.48,desc:'宽弧重斩 · 大幅击退 · 第三斩强化，击散前方敌弹',trait:'战斧 / 4m · 170° / 0.72秒宽斩'},
  {id:'stormpike',name:'铜鸣战戟',en:'RESONANT PIKE',classOnly:'warrior',kind:'melee',damage:25,rate:.28,mag:1,reload:0,speed:0,range:5.5,arc:.32,spread:.32,pellets:1,color:0xe4d59b,price:40,effect:'thrust',rollWeaponScale:.30,desc:'5.5m 直线突刺 · 窄角穿透多个目标 · 快速三连刺',trait:'长戟 / 5.5m · 37° / 0.28秒突刺'},
  {id:'quakehammer',name:'熔炉震地锤',en:'FORGEQUAKE',classOnly:'warrior',kind:'melee',damage:58,rate:.88,mag:1,reload:0,speed:0,range:2.9,arc:1.08,spread:1.08,pellets:1,color:0xff9872,price:48,effect:'quake',rollWeaponScale:.46,desc:'短程重击 · 第三击释放 4.3m 环形震波 · 范围消弹',trait:'重锤 / 2.9m / 0.88秒 · 第三击4.3m震波'},
  {id:'stormrod',name:'雷纹枝杖',en:'THUNDERBOUGH',classOnly:'mage',kind:'laser',damage:19,rate:.24,mag:18,reload:1.1,speed:100,range:30,spread:0,pellets:1,color:0x9df5ed,price:42,effect:'chain',spell:true,desc:'瞬发雷束 · 穿透敌人并向 6m 内目标跳跃电弧',trait:'雷电法器 / 穿透 / 连锁电弧'},
  {id:'embercodex',name:'焰契古卷',en:'CINDER CODEX',classOnly:'mage',kind:'rocket',damage:40,rate:.72,mag:6,reload:1.15,speed:16,range:28,spread:.02,pellets:1,color:0xffa36b,price:45,spell:true,desc:'缓行焰球 · 3.4m 范围爆燃 · 与焰尾披风产生燃烧协同',trait:'火焰古卷 / 焰球 / 范围爆燃'},
  {id:'moonorb',name:'幽月星仪',en:'LUNAR ORRERY',classOnly:'mage',kind:'orbit',damage:21,rate:.36,mag:10,reload:.90,speed:25,range:30,spread:.045,pellets:1,color:0xc8a6ff,price:44,spell:true,desc:'追踪回旋法球 · 返回途中仍能命中 · 扩容遗物激活双月协同',trait:'回旋星仪 / 追踪 / 返回命中'},
  {id:'revolver',name:'余烬六响',en:'EMBER SIX',kind:'bullet',damage:14,rate:.23,mag:6,reload:.8,speed:35,range:34,spread:.012,pellets:1,color:0xffce7a,price:0,desc:'可靠的六发左轮 · 无限备用弹药',trait:'精确 / 14伤害 / 0.8秒换弹'},
  {id:'shotgun',name:'告解霰弹',en:'CONFESSION',kind:'bullet',damage:9,rate:.65,mag:5,reload:1.1,speed:30,range:13,spread:.22,pellets:7,color:0xffb464,price:38,desc:'七颗弹丸，近距离给予最直接的回答',trait:'近距七连弹 / 击退'},
  {id:'smg',name:'蜂群打字机',en:'HIVEWRITER',kind:'bullet',damage:6,rate:.075,mag:32,reload:1.05,speed:37,range:28,spread:.075,pellets:1,color:0xffdc88,price:35,desc:'高速连射 · 每第八发射出三发蜂群弹',trait:'高射速 / 蜂群分裂'},
  {id:'rocket',name:'圣葬礼炮',en:'FUNERAL',kind:'rocket',damage:48,rate:.85,mag:3,reload:1.3,speed:19,range:32,spread:.02,pellets:1,color:0xff7946,price:48,desc:'爆炸半径 3.4m · 火焰能点燃油桶',trait:'范围爆炸 / 慢速高威力'},
  {id:'laser',name:'光棱审判',en:'PRISM VERDICT',kind:'laser',damage:13,rate:.16,mag:22,reload:1.0,speed:100,range:35,spread:0,pellets:1,color:0x77f7ea,price:46,desc:'瞬时光束 · 穿透敌人 · 晶体共鸣可折射',trait:'穿透激光 / 精确'},
  {id:'frost',name:'霜钟',en:'FROST BELL',kind:'frost',damage:11,rate:.2,mag:16,reload:1.05,speed:27,range:30,spread:.025,pellets:1,color:0x8bddff,price:40,desc:'冰冻减速 · 连续三次命中冻结敌人',trait:'寒霜 / 冻结控制'},
  {id:'orbit',name:'回声星环',en:'ECHO HALO',kind:'orbit',damage:19,rate:.34,mag:9,reload:1.15,speed:25,range:25,spread:.01,pellets:1,color:0xc8a2ff,price:45,desc:'回旋弹 · 返回时仍可命中 · 自动追踪',trait:'回旋 / 寻敌'},
  {id:'rail',name:'断罪长钉',en:'FINAL NAIL',kind:'rail',damage:58,rate:.9,mag:4,reload:1.4,speed:110,range:38,spread:0,pellets:1,color:0xff779b,price:52,desc:'超高速穿甲 · 穿透所有敌人 · 强烈后坐力',trait:'重型狙击 / 穿透'},...NEW_WEAPONS
];
export const CLASSES=[
  {id:'shooter',name:'余烬枪侠',role:'射手',en:'EMBER GUNSLINGER',color:'#d4ac72',hex:0xeab46d,weapon:'revolver',hp:8,shield:1,speed:8.2,tag:'精确射击 · 快速装填',desc:'用稳定的枪火打开路线。适合保持距离、走位射击与枪械搭配。',passive:'稳手',passiveDesc:'枪械换弹速度提升 15%。',skill:'弹膛过载',skillCd:13,skillDesc:'立即装满当前武器；6 秒内射速提升 65%、换弹加快，并清除身边 3m 内敌弹。'},
  {id:'mage',name:'霜灯法师',role:'冰霜法师',en:'FROST LANTERN',color:'#c29afa',hex:0xbb83ef,weapon:'froststaff',hp:7,shield:1,speed:8.35,tag:'法术弹幕 · 冻结控制',desc:'她携霜灯走入深渊，紫袍下藏着古老咒文。用法杖减速、冻结敌人，再以领域控制战场。',passive:'碎霜',passiveDesc:'霜系攻击对已冻结敌人造成额外 30% 伤害。',skill:'霜灯领域',skillCd:16,skillDesc:'在脚下展开持续 4 秒的 6m 冰霜领域：冻结普通敌人、持续伤害并减速敌弹；Boss 受到较弱减速。'},
  {id:'warrior',name:'赤铜战士',role:'近战',en:'COPPER VANGUARD',color:'#ef9972',hex:0xffa16c,weapon:'copperblade',hp:10,shield:2,speed:7.9,tag:'三段挥斩 · 突进破阵',desc:'以重刃劈开弹幕。铜甲、臂盾与短程突进，让贴身战斗也能主动出击。',passive:'铜心守势',passiveDesc:'挥斩命中获得短暂保护；战斗房清场恢复 1 格护盾，最多恢复到 2 格。',skill:'破阵震斩',skillCd:11,skillDesc:'向瞄准方向突进最多 3m，释放 70 伤害震斩，击散附近敌弹并获得 1 秒无敌。墙体与掩体会阻挡突进。'}
];
export const classById=id=>CLASSES.find(c=>c.id===id)||CLASSES[0];
export const BOSSES=[
  {id:'guardian',name:'断誓钟卫',en:'OATHBELL GUARDIAN',hp:680,radius:1.55,phases:['I · 钟摆守势','II · 断誓狂钟'],color:0x9ce3ce},
  {id:'bishop',name:'大司铳',en:'ORDNANCE BISHOP',hp:1450,radius:1.7,phases:['I · 墓钟圣咏','II · 亡誓狂热','III · 最后审判'],color:0xbd97ef},
  {id:'eclipse',name:'黑日裁决者',en:'BLACK SUN ARBITER',hp:2100,radius:1.8,phases:['I · 日冕守势','II · 赤祭巡礼','III · 黑日终审'],color:0xffae87}
];
export const bossForFloor=floor=>BOSSES[Math.max(0,Math.min(2,floor-1))];
for(const w of WEAPONS)if(!w.classOnly)w.classOnly='shooter';
export const weaponPool=(classId,includeStarter=false)=>WEAPONS.filter(w=>w.classOnly===classById(classId).id&&(includeStarter||w.id!==classById(classId).weapon));
export const LOOT_WEAPONS=WEAPONS.filter(w=>!CLASSES.some(c=>c.weapon===w.id));
export const PASSIVES = [
  {id:'hot',name:'火药圣印',icon:'火',price:24,desc:'所有伤害 +25%；爆炸范围 +25%'},
  {id:'speed',name:'巡火之靴',icon:'速',price:22,desc:'移动速度 +18%；翻滚冷却 -25%'},
  {id:'mag',name:'无底弹匣',icon:'弹',price:24,desc:'弹匣容量 +50%；换弹速度 +20%'},
  {id:'vamp',name:'赤铜心脏',icon:'心',price:30,desc:'每消灭 8 个敌人恢复 1 格生命'},
  {id:'ricochet',name:'镜面子弹',icon:'镜',price:25,desc:'实体弹碰墙反弹一次；与霜钟产生冰镜协同'},
  {id:'crystal',name:'光棱晶体',icon:'棱',price:28,desc:'暴击率 +20%；激光折射并触发电弧'},
  {id:'shield',name:'守誓徽章',icon:'盾',price:26,desc:'立即获得 2 格护盾；每层补充 1 格'},
  {id:'rollfire',name:'焰尾披风',icon:'焰',price:25,desc:'翻滚留下伤害火焰；礼炮火焰伤害翻倍'},
  {id:'luck',name:'窃星铜币',icon:'财',price:23,desc:'弹壳掉落 +50%；宝箱额外奖励'},
  {id:'health',name:'锻炉血契',icon:'血',price:28,desc:'最大生命 +2，并恢复 2 格生命'},...NEW_PASSIVES
];
export function passiveInfo(id,classId){
  const item=PASSIVES.find(p=>p.id===id),variants=classId==='warrior'?{
    mag:{name:'迅捷握柄',icon:'捷',desc:'近战攻击间隔减少 20%；连击衔接时间延长至 1.35 秒'},
    ricochet:{name:'镜面护刃',icon:'镜',desc:'挥斩消除的敌弹变为友方反射弹；与铜鸣战戟协同提升反射伤害'},
    crystal:{name:'断誓晶心',icon:'晶',desc:'近战暴击率 +20%，暴击伤害提升；断誓战斧暴击产生更强击退'},
    hot:{name:'熔炉圣印',icon:'火',desc:'所有伤害 +25%；爆炸范围 +25%'},
    rollfire:{name:'熔炉披风',icon:'焰',desc:'翻滚留下伤害火焰；熔炉震地锤第三击震波留下燃烧区域'}
  }:classId==='mage'?{
    mag:{name:'法力镜匣',icon:'魔',desc:'法力容量 +50%；凝聚法力加快 20%；幽月星仪激活双月法球'},
    crystal:{name:'雷纹晶体',icon:'棱',desc:'法术暴击率 +20%；雷纹枝杖的连锁电弧伤害提升'},
    ricochet:{name:'霜镜碎片',icon:'镜',desc:'法球碰墙反弹一次；霜灯法杖的霜晶可反弹两次'},
    hot:{name:'焰纹圣印',icon:'火',desc:'所有法术伤害 +25%；爆燃范围 +25%'},
    rollfire:{name:'余焰披风',icon:'焰',desc:'翻滚留下伤害火焰；焰契古卷爆燃留下火场，并提升火场伤害'}
  }:{};
  return variants[id]?{...item,...variants[id]}:item;
}
export const ACTIVES = [
  {id:'pulse',name:'驱弹脉冲',cd:14,price:28,desc:'清除所有敌弹，震伤附近敌人并获得 1 秒无敌'},
  {id:'turret',name:'折叠哨兵',cd:19,price:32,desc:'部署持续 9 秒的自动瞄准友方炮台'},
  {id:'time',name:'停摆怀表',cd:20,price:34,desc:'5 秒内敌人和敌弹速度减至 25%'},
  {id:'heal',name:'应急圣水',cd:32,price:36,desc:'恢复 2 格生命，并清除附近敌弹'}
];
export const DIRECTIONS = [{dx:0,dy:-1,name:'north',opposite:'south'},{dx:1,dy:0,name:'east',opposite:'west'},{dx:0,dy:1,name:'south',opposite:'north'},{dx:-1,dy:0,name:'west',opposite:'east'}];
const roomNames={combat:['弹壳回廊','沉默铸坊','弃誓厅','断柱仓库','火药档案室','废枪礼拜堂','守夜者营房'],chest:['封存军械库','遗赠密室'],shop:['铜币交易所'],shrine:['余火祭坛'],event:['漂泊者藏所'],start:['巡火者落点'],exit:['深层升降井'],boss:['大司铳的御座'],secret:['墙后遗物室']};
export function generateFloor(seed,floor){
  const rng=new RNG((seed ^ Math.imul(floor,0x9e3779b9))>>>0), count=rng.int(floor===1?11:floor===2?13:15,floor===1?14:floor===2?16:18);
  const rooms=[{id:0,gx:0,gy:0,links:{},type:'start',depth:0}],at=new Map([['0,0',rooms[0]]]);
  while(rooms.length<count){
    const base=rng.pick(rooms),dir=rng.pick(DIRECTIONS),x=base.gx+dir.dx,y=base.gy+dir.dy;
    if(at.has(`${x},${y}`)||Math.abs(x)>3||Math.abs(y)>3)continue;
    const room={id:rooms.length,gx:x,gy:y,links:{},type:'combat',depth:base.depth+1};rooms.push(room);at.set(`${x},${y}`,room);base.links[dir.name]=room.id;room.links[dir.opposite]=base.id;
  }
  for(const r of rooms)for(const d of DIRECTIONS){const other=at.get(`${r.gx+d.dx},${r.gy+d.dy}`);if(other&&r.links[d.name]===undefined&&rng.next()<.27){r.links[d.name]=other.id;other.links[d.opposite]=r.id;}}
  const queue=[0],dist=new Map([[0,0]]);while(queue.length){const r=rooms[queue.shift()];for(const id of Object.values(r.links))if(!dist.has(id)){dist.set(id,dist.get(r.id)+1);queue.push(id);}}rooms.forEach(r=>r.depth=dist.get(r.id));
  let available=rng.shuffle(rooms.slice(1));
  const choose=(type,predicate=()=>true)=>{let index=available.findIndex(predicate);if(index<0)index=0;const r=available.splice(index,1)[0];r.type=type;return r;};
  choose('shop',r=>r.depth>=2&&r.depth<=4);choose('chest',r=>r.depth<=3);choose('chest');choose('shrine');choose('event');
  if(floor<3)choose('exit',r=>r.depth>=Math.max(3,...rooms.map(q=>q.depth))-1);
  choose('boss',r=>r.depth>=2);
  const hosts=rng.shuffle(rooms.filter(r=>r.type==='combat'||r.type==='event'));
  for(const host of hosts){const d=rng.shuffle(DIRECTIONS).find(d=>!at.has(`${host.gx+d.dx},${host.gy+d.dy}`));if(!d)continue;
    const secret={id:rooms.length,gx:host.gx+d.dx,gy:host.gy+d.dy,links:{[d.opposite]:host.id},type:'secret',depth:host.depth+1,hidden:true};rooms.push(secret);host.secret={direction:d.name,id:secret.id};break;
  }
  const combatShapes=rng.shuffle(floor===1?ROOM_SHAPES:floor===2?TOMB_SHAPES:SUN_SHAPES);let combatIndex=0;
  for(const r of rooms){
    r.name=rng.pick(roomNames[r.type]);if(r.type==='boss')r.name=floor===1?'断誓钟卫的钟厅':floor===2?'大司铳的葬殿':'黑日裁决者的终审圣坛';
    if(floor===2)r.name=rng.pick(({combat:['失名骨廊','冥灯葬室','双井骨窟','沉棺回廊','殉誓墓道','遗骨祭厅'],start:['墓陵前庭'],chest:['陪葬密室','封骨遗赠室'],shop:['守墓人的交易所'],shrine:['亡誓祭坛'],event:['墓灯避难所'],secret:['无名王的暗室']}[r.type])||[r.name]);
    r.shape=r.type==='boss'?'octagon':r.type==='start'?'octagon':r.type==='shop'?rng.pick(['octagon','gallery']):r.type==='exit'?'hall':r.type==='combat'?combatShapes[combatIndex++%6]:rng.pick(['octagon','wing','gallery']);
    if(floor===2)r.shape=r.type==='boss'?'vault':r.type==='start'?'vault':r.type==='shop'?'burial':r.type==='combat'?r.shape: rng.pick(['vault','ossuary','burial']);
    if(floor===3){r.name=rng.pick(({combat:['赤祭长廊','暗金审判厅','日冕回廊','巡礼侧殿','黑石祷室','双井献祭场'],start:['日蚀前庭'],chest:['裁决军械库','献祭遗赠室'],shop:['日落交易所'],shrine:['黑日祈坛'],event:['流亡者灯塔'],secret:['失落日冕秘室']}[r.type])||[r.name]);r.shape=r.type==='boss'?'apse':r.type==='start'?'apse':r.type==='combat'?r.shape:r.type==='shop'?'choir':r.type==='secret'?'apse':'procession';}
    const sizes=floor===3?(r.type==='boss'?[[36,30]]:r.type==='shop'?[[30,24]]:r.type==='start'?[[28,24]]:r.type==='secret'?[[20,18]]:r.shape==='procession'?[[22,32],[32,22]]:r.shape==='transept'?[[32,28],[30,30]]:r.shape==='circlet'||r.shape==='crucible'?[[32,28],[30,30]]:[[28,26],[30,24]]):floor===2?(r.type==='boss'?[[34,28]]:r.type==='shop'?[[30,22]]:r.type==='start'?[[26,22]]:r.type==='secret'?[[18,16]]:r.shape==='aisle'?[[18,30],[30,18],[20,28]]:r.shape==='crypt'?[[28,28],[30,24]]:r.shape==='sepulcher'?[[28,26],[30,26]]:r.shape==='burial'?[[26,24],[24,28]]:r.shape==='ossuary'?[[26,24],[28,26]]:[[24,22],[28,24]]):(r.type==='boss'?[[30,24]]:r.type==='shop'?[[30,20],[34,18]]:r.type==='start'?[[26,22]]:r.type==='secret'?[[18,16],[20,18]]:r.shape==='hall'?[[18,30],[34,16],[20,24]]:r.shape==='cross'?[[30,28],[34,24],[28,32]]:r.shape==='ring'?[[30,26],[34,28]]:r.shape==='wing'?[[28,24],[32,20],[24,28]]:r.shape==='gallery'?[[32,22],[28,26]]:[[24,20],[28,24],[32,26]]);
    r.theme=floor===1?'armory':floor===2?'catacombs':'black-sun';r.bossId=r.type==='boss'?bossForFloor(floor).id:null;
    [r.w,r.h]=rng.pick(sizes);r.shapeFlip=rng.int(0,3);defineFootprint(r);r.visited=false;r.cleared=!['combat','boss'].includes(r.type);r.sealed=false;r.layout=rng.int(0,4);r.seed=rng.int(0,0x7fffffff);r.objects=[];r.enemies=[];r.pickups=[];r.started=false;r.rewarded=false;
  }
  return {floor,rooms,seed,rng,current:0};
}
export function weaponById(id){return WEAPONS.find(w=>w.id===id);}
export function synergyList(player){const a=[];if(player.passives.includes('crystal')&&player.weapons.includes('laser'))a.push('光棱风暴：激光触发链式电弧');if(player.passives.includes('ricochet')&&player.weapons.includes('frost'))a.push('冰镜迷宫：霜弹反弹两次');if(player.passives.includes('rollfire')&&player.weapons.includes('rocket'))a.push('圣葬焰路：爆炸留下燃烧区域');if(player.passives.includes('mag')&&player.weapons.includes('smg'))a.push('蜂巢过载：蜂群弹数量翻倍');if(player.passives.includes('mag')&&player.weapons.includes('moonorb'))a.push('双月回环：每次施法释放两枚追踪回旋法球');if(player.passives.includes('crystal')&&player.weapons.includes('stormrod'))a.push('电闪回路：连锁电弧伤害提升');if(player.passives.includes('rollfire')&&player.weapons.includes('embercodex'))a.push('余烬回响：焰球爆炸留下燃烧区域');if(player.passives.includes('ricochet')&&player.weapons.includes('froststaff'))a.push('霜镜折光：霜晶可反弹两次');if(player.passives.includes('ricochet')&&player.weapons.includes('stormpike'))a.push('镜鸣突刺：反射弹伤害提升至 12');if(player.passives.includes('crystal')&&player.weapons.includes('oathaxe'))a.push('断誓暴风：战斧暴击强化击退');if(player.passives.includes('rollfire')&&player.weapons.includes('quakehammer'))a.push('熔铸震波：第三击震波留下燃烧区域');return a.concat(newSynergies(player));}
