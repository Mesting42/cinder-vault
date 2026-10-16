// A single footprint drives rendering, collision, placement and navigation.
export const ROOM_SHAPES=['hall','octagon','cross','wing','gallery','ring'];
export const TOMB_SHAPES=['vault','aisle','ossuary','crypt','burial','sepulcher'];
export const SUN_SHAPES=['apse','procession','transept','choir','circlet','crucible'];
export const SHAPE_NAMES={apse:'日冕切角殿',procession:'赤祭巡礼廊',transept:'十字审判殿',choir:'阶列祷室',circlet:'环日深井',crucible:'双井献祭场',hall:'狭长回廊',octagon:'切角祭厅',cross:'十字军械厅',wing:'侧翼铸坊',gallery:'错层展廊',ring:'环形深井',vault:'折角墓室',aisle:'亡者长廊',ossuary:'双列骨窟',crypt:'十字墓道',burial:'错落葬室',sepulcher:'双井冥殿'};
export function defineFootprint(room){
  const W=room.w/2,H=room.h/2,shape=room.shape||'hall';let p;
  if(shape==='vault'||shape==='sepulcher'||shape==='apse'||shape==='crucible'){
    const c=Math.min(W,H)*.23;p=[[-W+c,-H],[W-c,-H],[W,-H+c],[W,H-c],[W-c,H],[-W+c,H],[-W,H-c],[-W,-H+c]];
  }else if(shape==='crypt'||shape==='transept'){
    const a=Math.max(3.4,W*.30),b=Math.max(3.6,H*.31);p=[[-a,-H],[a,-H],[a,-b],[W,-b],[W,b],[a,b],[a,H],[-a,H],[-a,b],[-W,b],[-W,-b],[-a,-b]];
  }else if(shape==='burial'||shape==='choir'){
    const a=W*.55,b=H*.52;p=[[-W,-H],[a,-H],[a,-b],[W,-b],[W,H],[-a,H],[-a,b],[-W,b]];
  }else if(shape==='ossuary'){
    const a=W*.68,b=H*.69;p=[[-a,-H],[a,-H],[a,-b],[W,-b],[W,b],[a,b],[a,H],[-a,H],[-a,b],[-W,b],[-W,-b],[-a,-b]];
  }else if(shape==='octagon'||shape==='ring'||shape==='circlet'){
    const c=Math.min(W,H)*.43;p=[[-W+c,-H],[W-c,-H],[W,-H+c],[W,H-c],[W-c,H],[-W+c,H],[-W,H-c],[-W,-H+c]];
  }else if(shape==='cross'){
    const a=Math.max(4.8,W*.38),b=Math.max(4.1,H*.34);p=[[-a,-H],[a,-H],[a,-b],[W,-b],[W,b],[a,b],[a,H],[-a,H],[-a,b],[-W,b],[-W,-b],[-a,-b]];
  }else if(shape==='wing'){
    const a=Math.max(3.6,W*.28),b=-H*.28;p=[[-W,-H],[a,-H],[a,b],[W,b],[W,H],[-W,H]];
  }else if(shape==='gallery'){
    const a=W*.46,b=H*.48;p=[[-W,-H],[a,-H],[a,-b],[W,-b],[W,H],[ -a,H],[-a,b],[-W,b]];
  }else p=[[-W,-H],[W,-H],[W,H],[-W,H]];
  const flip=room.shapeFlip||0;room.outline=p.map(([x,z])=>[flip&1?-x:x,flip&2?-z:z]);
  if(polygonArea(room.outline)<0)room.outline.reverse();room.holes=(shape==='ring'||shape==='circlet')?[[[-2.8,-2.8],[-2.8,2.8],[2.8,2.8],[2.8,-2.8]]]:[];
  if((shape==='sepulcher'||shape==='crucible')&&room.type==='combat')room.holes=[-1,1].map(side=>{const x=side*W*.48;return[[x-1.35,-3.4],[x-1.35,3.4],[x+1.35,3.4],[x+1.35,-3.4]];});
  room.area=Math.round(Math.abs(polygonArea(room.outline))-room.holes.reduce((s,h)=>s+Math.abs(polygonArea(h)),0));
  return room;
}
export function polygonArea(p){return p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;}
export function pointInPolygon(p,x,z){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function edgeDistance(p,x,z){let min=Infinity;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));min=Math.min(min,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));}return min;}
export function containsRoom(room,x,z,radius=0,holes=true,doors=false){
  if(!room.outline)return Math.abs(x)<room.w/2-radius&&Math.abs(z)<room.h/2-radius;
  if(doors){const W=room.w/2,H=room.h/2;if(Math.abs(z)<2.1-radius&&((room.links.east!==undefined&&x>W-1.1&&x<W+1.3)||(room.links.west!==undefined&&x<-W+1.1&&x>-W-1.3)))return true;if(Math.abs(x)<2.1-radius&&((room.links.south!==undefined&&z>H-1.1&&z<H+1.3)||(room.links.north!==undefined&&z<-H+1.1&&z>-H-1.3)))return true;}
  if(!pointInPolygon(room.outline,x,z)||radius>0&&edgeDistance(room.outline,x,z)<radius)return false;
  if(holes)for(const h of room.holes||[])if(pointInPolygon(h,x,z)||radius>0&&edgeDistance(h,x,z)<radius)return false;
  return true;
}
export function roomPoint(room,x,z,radius=.6,blocked=()=>false){
  const valid=(a,b)=>containsRoom(room,a,b,radius+.2,true)&&!blocked(a,b);
  if(valid(x,z))return{x,z};
  for(let r=.5;r<Math.max(room.w,room.h);r+=.5)for(let i=0;i<24;i++){const a=x+Math.sin(i*Math.PI/12)*r,b=z+Math.cos(i*Math.PI/12)*r;if(valid(a,b))return{x:a,z:b};}
  throw Error(`No walkable placement in room ${room.id}`);
}
export function boundaryNormal(room,x,z){let best=Infinity,normal={x:0,z:1};const p=room.outline;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(length*length))),d=Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);if(d<best){best=d;normal={x:dz/length,z:-dx/length};}}return normal;}
