/* DerinEngine — Voxel Hello (STARCUBES ilk adımı)
 * 3D Hello World küpünü 5×5 grid'e çoğaltır.
 * Kendi shader (harici yok), mouse ile kamera.
 */
(function(){
const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
if(!gl){ document.getElementById('cwrap').innerHTML='<b>WebGL desteklenmiyor</b>'; return; }

const vs = `
attribute vec3 aPos; attribute vec3 aCol;
uniform mat4 uMVP;
varying vec3 vCol;
void main(){ gl_Position=uMVP*vec4(aPos,1.0); vCol=aCol; }
`;
const fs = `
precision mediump float;
varying vec3 vCol;
void main(){ gl_FragColor=vec4(vCol,1.0); }
`;
function shader(type,src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); return s; }
const prog=gl.createProgram();
gl.attachShader(prog, shader(gl.VERTEX_SHADER, vs));
gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, fs));
gl.linkProgram(prog); gl.useProgram(prog);

/* Basit küp (8 köşe) — her voxel aynı geometri */
const cube = new Float32Array([
  // ön
  -0.05,-0.05, 0.05,  1,0.9,0.7,
   0.05,-0.05, 0.05,  1,0.9,0.7,
   0.05, 0.05, 0.05,  1,0.9,0.7,
  -0.05, 0.05, 0.05,  1,0.9,0.7,
  // arka
  -0.05,-0.05,-0.05,  0.7,0.9,1,
   0.05,-0.05,-0.05,  0.7,0.9,1,
   0.05, 0.05,-0.05,  0.7,0.9,1,
  -0.05, 0.05,-0.05,  0.7,0.9,1,
]);
const idx = new Uint16Array([
  0,1,2, 0,2,3, 4,6,5, 4,7,6,
  3,2,6, 3,6,7, 4,5,1, 4,1,0,
  1,5,6, 1,6,2, 4,0,3, 4,3,7
]);

function buf(data,target){ const b=gl.createBuffer(); gl.bindBuffer(target,b); gl.bufferData(target,data,gl.STATIC_DRAW); return b; }
const vbo=buf(cube,gl.ARRAY_BUFFER);
const ibo=gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idx,gl.STATIC_DRAW);
const aPos=gl.getAttribLocation(prog,'aPos');
const aCol=gl.getAttribLocation(prog,'aCol');
gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos,3,gl.FLOAT,false,24,0);
gl.enableVertexAttribArray(aCol); gl.vertexAttribPointer(aCol,3,gl.FLOAT,false,24,12);

function mat4(){ return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]; }
function mul4(a,b){ const r=mat4(); for(let i=0;i<4;i++)for(let j=0;j<4;j++){let s=0;for(let k=0;k<4;k++)s+=a[i*4+k]*b[k*4+j];r[i*4+j]=s;} return r; }
function rotY(a){ const c=Math.cos(a),s=Math.sin(a); return [c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]; }
function rotX(a){ const c=Math.cos(a),s=Math.sin(a); return [1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]; }
function trans(x,y,z){ const m=mat4(); m[12]=x; m[13]=y; m[14]=z; return m; }
function persp(fov,aspect,near,far){ const f=1/Math.tan(fov*Math.PI/360); const m=mat4(); m[0]=f/aspect; m[5]=f; m[10]=(far+near)/(near-far); m[11]=-1; m[14]=(2*far*near)/(near-far); m[15]=0; return m; }

/* 5×5 voxel grid (STARCUBES ilk adımı) */
const gridSize = 5;
const voxelGrid = [];
for(let x=0;x<gridSize;x++) for(let z=0;z<gridSize;z++){ voxelGrid.push({x,z}); }

/* Kamera durumu */
let yaw=0.6, pitch=0.2, mouseDown=false, mx=0, my=0;
canvas.addEventListener('mousedown',e=>{mouseDown=true;mx=e.clientX;my=e.clientY;});
document.addEventListener('mouseup',()=>mouseDown=false);
document.addEventListener('mousemove',e=>{ if(!mouseDown)return; yaw+=(e.clientX-mx)*0.005; pitch+=(e.clientY-my)*0.005; mx=e.clientX;my=e.clientY; });

function draw() {
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.clearColor(0.05,0.08,0.15,1); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(prog);

  const t = Date.now()*0.001;
  const eye = [Math.sin(yaw)*3.5, Math.sin(pitch)*1.5+0.5, Math.cos(yaw)*3.5];
  const P = persp(60, canvas.width/canvas.height, 0.1, 50);
  const V = mul4(rotX(-pitch), rotY(-yaw));
  const VT = mul4(V, trans(-eye[0], -eye[1], -eye[2]));

  voxelGrid.forEach(voxel => {
    const posX = (voxel.x - (gridSize-1)/2) * 0.2;
    const posZ = (voxel.z - (gridSize-1)/2) * 0.2;
    const M = mul4(trans(posX, 0, posZ), rotY(t*0.2));
    const MVP = mul4(P, mul4(VT, M));
    gl.uniformMatrix4fv(gl.getUniformLocation(prog,'uMVP'), false, new Float32Array(MVP));
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
  });
  requestAnimationFrame(draw);
}
draw();
})();
