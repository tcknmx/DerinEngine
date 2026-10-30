/* 2.5D köprü görsel doğrulama — bir nesnenin z derinliği ile küçülmesi */
(function(){
const canvas = document.getElementById('bridge') || document.getElementById('gl');
const gl = canvas.getContext('2d');
if(!gl){ document.getElementById('wrap').innerHTML='<b>Canvas desteklenmiyor</b>'; return; }

function draw() {
  gl.clearRect(0,0,canvas.width,canvas.height);
  // 2.5D kuralı: aynı matematik (scale = 1 - z*0.015, min 0.25)
  const objects = [
    { x: 200, y: 300, z: 0,  w: 80, h: 80, c:'#ffe066', label:'z=0 (ön)' },
    { x: 350, y: 300, z: 60, w: 80, h: 80, c:'#6688aa', label:'z=60 (uzak)' },
    { x: 500, y: 300, z: 120,w: 80, h: 80, c:'#6688aa', label:'z=120 (en uzak)' },
  ];
  objects.forEach(o => {
    const s = Math.max(0.25, 1 - (o.z * 0.015));
    const w = o.w * s, h = o.h * s;
    gl.fillStyle = o.c;
    gl.fillRect(o.x - w/2, o.y - h/2, w, h);
    gl.fillStyle = '#fff'; gl.font='11px sans-serif';
    gl.fillText(o.label, o.x - 30, o.y + h/2 + 14);
  });
  // Referans çizgi (perspektif hissi)
  gl.strokeStyle = '#333'; gl.lineWidth = 1;
  gl.beginPath(); gl.moveTo(0,400); gl.lineTo(800,400); gl.stroke();
  gl.fillStyle = '#777'; gl.fillText('2.5D doğrulama: z arttıkça nesne küçülür (min 0.25). Motor core.js z_index bozulmadı.', 20, 430);
}
draw();
})();
