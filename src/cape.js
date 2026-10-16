import * as THREE from 'three';

// A two-sided cloth surface with a torn hem. Only the shoulder row is pinned;
// each lower row follows the wind and character motion through damped springs.
export function createCape(parent,material,color=0xc85340){
  const cols=12,rows=10,stride=cols+1,count=stride*(rows+1),nodes=[],indices=[],colors=[],uv=[];
  const hem=[-.15,-.23,-.38,-.28,-.18,-.29,-.20,-.36,-.18,-.22,-.13,-.21,-.09];
  const base=new THREE.Color(color),seam=new THREE.Color(0xb98653);
  for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
    const v=row/rows,u=col/cols,width=.44+.18*Math.sin(v*Math.PI*.82);
    nodes.push({x:(u-.5)*width*2,y:.74*(1-v)+hem[col]*v,z:.07+.09*Math.sin(v*1.5),u,v,vx:0,vy:0,vz:0});
  }
  const positions=new Float32Array(count*6);
  for(let layer=0;layer<2;layer++)for(let i=0;i<count;i++){
    const n=nodes[i],j=(layer*count+i)*3,tint=base.clone().multiplyScalar(layer?1:.87);
    if(i%stride===2||i%stride===cols-2)tint.lerp(seam,.55);
    if(n.v>.85)tint.multiplyScalar(.89);
    positions.set([n.x,n.y,n.z+(layer?.018:-.018)],j);colors.push(tint.r,tint.g,tint.b);uv.push(n.u,n.v);
  }
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const a=row*stride+col,b=a+1,c=a+stride,d=c+1;
    indices.push(a,b,c,b,d,c,count+a,count+c,count+b,count+b,count+c,count+d);
  }
  const edge=(a,b)=>indices.push(a,b,count+a,b,count+b,count+a);
  for(let col=0;col<cols;col++){edge(col,col+1);edge(rows*stride+col+1,rows*stride+col);}
  for(let row=0;row<rows;row++){edge((row+1)*stride,row*stride);edge(row*stride+cols,(row+1)*stride+cols);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,.17,.33),1.65);
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.animated=true;mesh.name='wind-driven-torn-cape';parent.add(mesh);
  parent.userData.cloth={mesh,nodes,rest:nodes.map(n=>({x:n.x,y:n.y,z:n.z})),cols,rows,count,motion:{speed:0,forward:0,side:0,turn:0},lastPosition:null,lastYaw:null};
  return mesh;
}

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function animateCape(hero,time,delta){
  const cloth=hero.userData.cape?.userData.cloth;if(!cloth)return;
  const {mesh,nodes,rest,count,motion}=cloth,dt=clamp(delta,0,.04),yaw=hero.rotation.y,rolling=!!hero.userData.rolling;
  if(!cloth.lastPosition){cloth.lastPosition=hero.position.clone();cloth.lastYaw=yaw;}
  const dx=hero.position.x-cloth.lastPosition.x,dz=hero.position.z-cloth.lastPosition.z,teleport=Math.hypot(dx,dz)>4;
  const invDt=dt>0?1/dt:0,c=Math.cos(yaw),s=Math.sin(yaw),localX=(dx*c-dz*s)*invDt,localZ=(dx*s+dz*c)*invDt;
  const turn=Math.atan2(Math.sin(yaw-cloth.lastYaw),Math.cos(yaw-cloth.lastYaw)),ease=1-Math.exp(-dt*7);
  const speed=teleport||rolling?0:clamp(Math.hypot(localX,localZ),0,10),forward=teleport||rolling?0:clamp(-localZ,0,10),side=teleport||rolling?0:clamp(-localX,-8,8);
  motion.speed+=(speed-motion.speed)*ease;motion.forward+=(forward-motion.forward)*ease;motion.side+=(side-motion.side)*ease;
  motion.turn=clamp(motion.turn*Math.exp(-dt*6)+(teleport||rolling?0:turn*3),-3.5,3.5);
  cloth.lastPosition.copy(hero.position);cloth.lastYaw=yaw;
  const steps=Math.max(1,Math.ceil(dt/.014)),step=dt/steps,attribute=mesh.geometry.attributes.position;
  for(let i=0;i<nodes.length;i++){
    const node=nodes[i],origin=rest[i],weight=node.v*node.v;
    if(node.v===0){node.x=origin.x;node.y=origin.y;node.z=origin.z;node.vx=node.vy=node.vz=0;}
    else{
      const wave=Math.sin(time*3.8-node.v*4.6+node.u*2.0),ripple=Math.sin(time*7.7-node.v*9+node.u*6)*.013;
      const target=rolling?{x:origin.x,y:origin.y+weight*.06,z:origin.z+weight*.025}:{
        x:origin.x+weight*(Math.sin(time*2.1-node.v*3+node.u)*.045+motion.side*.022-motion.turn*.034),
        y:origin.y+weight*(motion.speed*.014+wave*.028),
        z:origin.z+weight*(.045+motion.forward*.050+motion.speed*.012+wave*(.047+motion.speed*.009)+ripple+Math.abs(motion.turn)*.018)
      };
      const stiffness=rolling?120:54-node.v*18,damping=rolling?20:8;
      for(let substep=0;substep<steps;substep++)for(const axis of ['x','y','z']){
        const velocity='v'+axis;node[velocity]+=((target[axis]-node[axis])*stiffness-node[velocity]*damping)*step;node[axis]+=node[velocity]*step;
      }
      node.x=clamp(node.x,origin.x-.35,origin.x+.35);node.y=clamp(node.y,origin.y-.09,origin.y+.22);node.z=clamp(node.z,origin.z-.025,origin.z+.68);
    }
    attribute.setXYZ(i,node.x,node.y,node.z-.018);attribute.setXYZ(count+i,node.x,node.y,node.z+.018);
  }
  attribute.needsUpdate=true;mesh.geometry.computeVertexNormals();
}
