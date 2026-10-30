/* DerinEngine — 3D Hello World (cube.js)
 * WebGL kendi shader'ımız. Harici dosya yok (§0 ek kütüphane).
 */
(function(){
const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
if(!gl){ document.getElementById('cwrap').innerHTML='<b>WebGL desteklenmiyor</b>'; return; }

/* ---------- SHADER'LER (inline, kendi yazımımız) ---------- */
const vs = `
attribute vec3 aPos; attribute vec3 aCol;
uniform mat4 uMVP;
varying vec3 vCol;
void main(){ gl_Position = uMVP * vec4(aPos,1.0); vCol = aCol; }
`;
const fs = `
precision mediump float;
varying vec3 vCol;
void main(){ gl_FragColor = vec4(vCol,1.0); }
`;
function shader(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  return s;
}
const prog = gl.createProgram();
const vsS = shader(gl.VERTEX_SHADER, vs);
const fsS = shader(gl.FRAGMENT_SHADER, fs);
gl.attachShader(prog, vsS); gl.attachShader(prog, fsS);
gl.linkProgram(prog); gl.useProgram(prog);

/* ---------- KÜP GEOMETRİSİ (8 köşe + 36 indeks) ---------- */
const verts = [
  // ön (z=+0.5) — kırmızı
  -0.5,-0.5, 0.5,  1.0,0.2,0.2,
   0.5,-0.5, 0.5,  1.0,0.2,0.2,
   0.5, 0.5, 0.5,  1.0,0.2,0.2,
  -0.5, 0.5, 0.5,  1.0,0.2,0.2,
  // arka (z=-0.5) — yeşil
  -0.5,-0.5,-0.5,  0.2,1.0,0.2,
   0.5,-0.5,-0.5,  0.2,1.0,0.2,
   0.5, 0.5,-0.5,  0.2,1.0,0.2,
  -0.5, 0.5,-0.5,  0.2,1.0,0.2,
  // üst (y=+0.5) — sarı
  -0.5, 0.5, 0.5,  1.0,1.0,0.2,
   0.5, 0.5, 0.5,  1.0,1.0,0.2,
   0.5, 0.5,-0.5,  1.0,1.0,0.2,
  -0.5, 0.5,-0.5,  1.0,1.0,0.2,
  // alt (y=-0.5) — mor
  -0.5,-0.5, 0.5,  0.9,0.3,0.9,
   0.5,-0.5, 0.5,  0.9,0.3,0.9,
   0.5,-0.5,-0.5,  0.9,0.3,0.9,
  -0.5,-0.5,-0.5,  0.9,0.3,0.9,
  // sağ (x=+0.5) — mavi
   0.5,-0.5, 0.5,  0.3,0.5,1.0,
   0.5,-0.5,-0.5,  0.3,0.5,1.0,
   0.5, 0.5,-0.5,  0.3,0.5,1.0,
   0.5, 0.5, 0.5,  0.3,0.5,1.0,
  // sol (x=-0.5) — turuncu
  -0.5,-0.5, 0.5,  1.0,0.6,0.2,
  -0.5,-0.5,-0.5,  1.0,0.6,0.2,
  -0.5, 0.5,-0.5,  1.0,0.6,0.2,
  -0.5, 0.5, 0.5,  1.0,0.6,0.2
];
const idx = [
  // ön 2 üçgen
  0,1,2, 0,2,3,
  // arka
  4,6,5, 4,7,6,
  // üst
  3,2,6, 3,6,7,
  // alt
  4,5,1, 4,1,0,
  // sağ
  1,5,6, 1,6,2,
  // sol
  4,0,3, 4,3,7
];
function makeBuf(data, target) {
  const b = gl.createBuffer(); gl.bindBuffer(target, b);
  gl.bufferData(target, new Float32Array(data), gl.STATIC_DRAW); return b;
}
const vbo = makeBuf(verts, gl.ARRAY_BUFFER);
const ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

const aPos = gl.getAttribLocation(prog, 'aPos');
const aCol = gl.getAttribLocation(prog, 'aCol');
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
gl.enableVertexAttribArray(aCol); gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 24, 12);

/* ---------- MATEMATİK (manuel, 4x4) ---------- */
function mat4() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }
function mul4(a,b){ const r=mat4(); for(let i=0;i<4;i++)for(let j=0;j<4;j++){let s=0;for(let k=0;k<4;k++)s+=a[i*4+k]*b[k*4+j];r[i*4+j]=s;} return r; }
function persp(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov * Math.PI / 360);
  const m = mat4();
  m[0]=f/aspect; m[5]=f; m[10]=(far+near)/(near-far); m[11]=-1;
  m[14]=(2*far*near)/(near-far); m[15]=0; return m;
}
function rotY(a){ const c=Math.cos(a),s=Math.sin(a); return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]; }
function rotX(a){ const c=Math.cos(a),s=Math.sin(a); return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]; }
function trans(x,y,z){ const m=mat4(); m[12]=x; m[13]=y; m[14]=z; return m; }

/* ---------- KAMERA / DURUM ---------- */
let yaw=0.8, pitch=0.35, mouseDown=false, mx=0, my=0;
canvas.addEventListener('mousedown', e=>{ mouseDown=true; mx=e.clientX; my=e.clientY; });
document.addEventListener('mouseup', ()=>mouseDown=false);
document.addEventListener('mousemove', e=>{
  if(!mouseDown) return;
  const dx=e.clientX-mx; const dy=e.clientY-my;
  yaw += dx*0.005; pitch += dy*0.005;
  mx=e.clientX; my=e.clientY;
});

/* ---------- ÇİZİM DÖNGÜSÜ ---------- */
function draw() {
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.clearColor(0.05,0.05,0.1,1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(prog);

  // Model: otomatik döndürme + kullanıcı mouse
  const t = Date.now()*0.001;
  let M = mul4(rotY(t*0.8), rotX(t*0.3));
  M = mul4(M, trans(0,0,0));

  // Kamera (kamera pozisyonu, bakış hedefi)
  const eye = [Math.sin(yaw)*3, Math.sin(pitch)*2, Math.cos(yaw)*3];
  // Basit view: kamerayı origin'e getir, sonra ters rotasyon
  // Daha basit: camera matrix = rot(-yaw) * rot(-pitch) * translate(-eye)
  // Burada kısa yol: M = perspektif * (kamera ters) * model
  const view = mul4(rotY(-yaw), rotX(-pitch));
  const viewT = mul4(view, trans(-eye[0], -eye[1], -eye[2]));
  const P = persp(60, canvas.width/canvas.height, 0.1, 100);
  const MVP = mul4(P, mul4(viewT, M));

  const uMVP = gl.getUniformLocation(prog, 'uMVP');
  gl.uniformMatrix4fv(uMVP, false, new Float32Array(MVP));
  gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
  requestAnimationFrame(draw);
}
draw();
})();
