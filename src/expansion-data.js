export const NEW_WEAPONS=[
 {id:'sunburst',name:'日蚀三响',en:'ECLIPSE TRIPLET',classOnly:'shooter',kind:'bullet',damage:10,rate:.44,mag:9,reload:1.05,speed:39,range:31,spread:.04,pellets:3,color:0xffd59a,price:48,desc:'三联精密弹丸 · 每次攻击同时释放三发；扩容遗物激活六联协同',trait:'三联弹 / 精准中距 / 六联协同'},
 {id:'judgment',name:'审判贯钉',en:'JUDGMENT SPIKE',classOnly:'shooter',kind:'rail',damage:42,rate:.70,mag:5,reload:1.3,speed:100,range:37,spread:0,pellets:1,color:0xff8f98,price:55,desc:'贯穿光束 · 标记目标 2.5 秒，使后续伤害提高 20%',trait:'贯穿 / 审判标记 / 后续增伤'},
 {id:'bloodhowitzer',name:'赤祭榴铳',en:'SACRIFICIAL HOWITZER',classOnly:'shooter',kind:'rocket',damage:36,rate:.86,mag:4,reload:1.3,speed:18,range:30,spread:.01,pellets:1,color:0xff655a,price:55,desc:'榴弹爆炸留下持续 3 秒的祭火；祭血刻印扩大火场',trait:'榴弹 / 持续祭火 / 区域封锁'},
 {id:'sunorb',name:'黑日星核',en:'BLACK SUN CORE',classOnly:'mage',spell:true,kind:'orbit',damage:18,rate:.52,mag:8,reload:1.0,speed:21,range:30,spread:0,pellets:1,color:0xffa7ba,price:52,desc:'追踪回旋星核 · 飞行时牵引并减速附近敌人；黑日透镜扩大牵引范围',trait:'回旋星核 / 牵引 / 减速'},
 {id:'ritualstaff',name:'祭光权杖',en:'RITUAL SCEPTER',classOnly:'mage',spell:true,kind:'laser',damage:17,rate:.33,mag:16,reload:1.1,speed:100,range:31,spread:0,pellets:1,color:0xffdab0,price:53,desc:'穿透祭光 · 命中产生小范围余辉；晶体遗物让祭光跳跃连锁',trait:'祭光 / 穿透 / 余辉震荡'},
 {id:'bloodfrost',name:'血霜圣典',en:'BLOODFROST SCRIPTURE',classOnly:'mage',spell:true,kind:'frost',damage:16,rate:.40,mag:10,reload:1.0,speed:25,range:30,spread:.02,pellets:1,color:0xf5a4d6,price:52,desc:'两次命中冻结普通敌人，冻结时触发碎霜震波',trait:'血霜 / 两击冻结 / 碎霜震波'},
 {id:'eclipseglaive',name:'蚀日环刃',en:'ECLIPSE GLAIVE',classOnly:'warrior',kind:'melee',damage:24,rate:.52,mag:1,reload:0,speed:0,range:4.3,arc:Math.PI,spread:Math.PI,pellets:1,color:0xffc699,price:50,rollWeaponScale:.40,desc:'环形挥斩 · 第三击投出回旋刃；镜面护刃让环斩反射四周敌弹',trait:'360° 环斩 / 第三击回旋刃'},
 {id:'bloodspear',name:'赤祭长枪',en:'BLOODRITE SPEAR',classOnly:'warrior',kind:'melee',damage:23,rate:.34,mag:1,reload:0,speed:0,range:6,arc:.27,spread:.27,pellets:1,color:0xfa8883,price:52,effect:'thrust',rollWeaponScale:.28,desc:'6m 穿透突刺 · 每 6 次命中恢复 1 格生命；祭血刻印减为 3 次',trait:'长距突刺 / 命中汲血 / 直线穿透'},
 {id:'judgmenthammer',name:'终审巨槌',en:'FINAL TRIBUNAL',classOnly:'warrior',kind:'melee',damage:45,rate:.95,mag:1,reload:0,speed:0,range:3.1,arc:1.12,spread:1.12,pellets:1,color:0xffd7a0,price:58,effect:'quake',rollWeaponScale:.40,desc:'第三击产生延迟审判震波；黑日透镜激活第二道震波',trait:'重击 / 延迟震波 / 双重审判'}
];
export const NEW_PASSIVES=[
 {id:'eclipseLens',name:'黑日透镜',icon:'日',price:30,desc:'审判标记伤害加成提高至 35%；扩大星核牵引，终审巨槌获得双重震波'},
 {id:'bloodSeal',name:'祭血刻印',icon:'祭',price:29,desc:'每第 5 次命中追加小范围祭血爆震；与赤祭榴铳、血霜圣典、赤祭长枪产生协同'},
 {id:'duskClock',name:'黄昏沙漏',icon:'暮',price:30,desc:'职业技能冷却缩短 25%；技能强化分支保持完整效果'}
];
export const TALENTS={
 shooter:[{id:'barrage',name:'枪火洪流',desc:['过载延长至 8 秒，攻击间隔降至 48%。','过载延长至 10 秒，攻击间隔降至 38%。']},{id:'marksman',name:'贯罪枪膛',desc:['过载期间每第 4 次攻击追加 24 伤害贯穿光束。','追加光束提高至 40 伤害。']},{id:'bulwark',name:'护火装填',desc:['过载提供 1 格护盾、1 秒无敌，并清除 6m 内敌弹。','提供 2 格护盾、1.6 秒无敌，清弹半径扩大至 8m。']}],
 mage:[{id:'glacier',name:'永霜疆域',desc:['霜灯领域扩大至 8m，持续 5 秒。','领域扩大至 9m，持续 6 秒。']},{id:'comet',name:'碎星寒潮',desc:['领域初击提高至 44 伤害，持续伤害提高至 12。','初击提高至 65，持续伤害提高至 16。']},{id:'ward',name:'霜壁守誓',desc:['施法获得 1 格护盾，领域内敌弹速度降至 20%。','施法获得 2 格护盾，敌弹速度降至 10%。']}],
 warrior:[{id:'breaker',name:'破阵先锋',desc:['震斩伤害提高至 100，突进距离提高至 4.2m。','伤害提高至 130，突进距离提高至 5m。']},{id:'guardian',name:'铜壁守卫',desc:['震斩获得 1 格护盾、1.5 秒无敌，清弹半径 9m。','获得 2 格护盾、2 秒无敌，清弹半径 11m。']},{id:'storm',name:'震地风暴',desc:['震斩后追加两道延迟震波，每道 25 伤害。','追加三道震波，每道 40 伤害。']}]
};
export const talentFor=player=>TALENTS[player.classId]?.find(t=>t.id===player.skillBranch)||null;
for(const branches of Object.values(TALENTS))for(const t of branches)if(['bulwark','ward','guardian'].includes(t.id))t.desc=t.desc.map(d=>d+' 技能护盾上限 6 格。');
export const talentLevel=player=>Math.max(1,Math.min(2,player.skillTier||1));
export function newSynergies(player){const pairs=[['sunburst','mag','末日连奏：日蚀三响释放六联弹'],['judgment','eclipseLens','终审烙印：标记延长至 4 秒，后续伤害 +35%'],['bloodhowitzer','bloodSeal','赤祭焚场：火场半径扩大'],['sunorb','eclipseLens','黑日引力：牵引范围扩大至 5m'],['ritualstaff','crystal','祭光折射：穿透祭光触发连锁'],['bloodfrost','bloodSeal','血霜献祭：碎霜震波伤害提高'],['eclipseglaive','ricochet','日轮返照：环斩反射四周敌弹'],['bloodspear','bloodSeal','赤祭回生：每 3 次命中恢复生命'],['judgmenthammer','eclipseLens','终审重鸣：第三击追加双重震波']];return pairs.filter(([w,p])=>player.weapons.includes(w)&&player.passives.includes(p)).map(p=>p[2]);}
