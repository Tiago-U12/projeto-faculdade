// Original, hand-drawn procedural pixel art. Every texture has a transparent
// background; its ground contact is at the bottom centre of the canvas.
export function buildTextures(scene) {
  const C = {
    ink: '#183f40', deep: '#164d46', pine: '#1d6250', green: '#33865e',
    leaf: '#53a667', lime: '#8abc72', light: '#b9d995', cream: '#fff0c9',
    sand: '#e8cd91', brown: '#704c3a', bark: '#956648', wood: '#bb8756',
    mint: '#8bc5a3', mintLight: '#b8dbb1', mintDark: '#5b9d8a',
    coral: '#e47e68', peach: '#f8bb91', pink: '#e593a5', gold: '#f4c869',
  };

  function make(name, width, height, draw) {
    if (scene.textures.exists(name)) return;
    const texture = scene.textures.createCanvas(name, width, height);
    const ctx = texture.getContext();
    ctx.imageSmoothingEnabled = false;
    const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
    const poly = (points, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath(); ctx.fill();
    };
    // Scanline ellipses give soft organic silhouettes with deliberate 2 px steps.
    const oval = (cx, cy, rx, ry, color, step = 2) => {
      ctx.fillStyle = color;
      for (let yy = -ry; yy < ry; yy += step) {
        const half = Math.floor(Math.sqrt(Math.max(0, 1 - ((yy + step / 2) / ry) ** 2)) * rx / step) * step;
        ctx.fillRect(Math.round(cx - half), Math.round(cy + yy), half * 2, step);
      }
    };
    const shadow = (cx, cy, rx, ry) => oval(cx, cy, rx, ry, '#103b3b25');
    draw({ctx, rect, poly, oval, shadow});
    texture.refresh();
  }

  make('aysha', 48, 72, ({rect, poly, oval, shadow}) => {
    shadow(24, 68, 18, 4);
    // Hair bow, ponytail and backpack sit behind the silhouette.
    poly([[29,9],[36,10],[38,17],[36,22],[40,30],[35,36],[30,32],[31,23]], C.brown);
    rect(31, 10, 7, 5, C.coral); rect(36, 12, 4, 4, '#ffd0a1');
    poly([[11,31],[17,28],[35,30],[39,41],[36,54],[13,53],[9,44]], C.ink);
    rect(12, 33, 11, 19, '#b78b57'); rect(13, 34, 4, 14, C.sand);
    rect(11, 39, 4, 9, C.wood);
    // Small boots and walking-ready legs.
    rect(17, 51, 7, 13, '#d3b47b'); rect(26, 51, 7, 13, '#bd9764');
    rect(16, 62, 9, 6, C.ink); rect(26, 62, 10, 6, C.ink);
    rect(17, 62, 7, 3, C.brown); rect(27, 62, 7, 3, C.brown);
    poly([[17,31],[28,29],[34,33],[35,49],[30,55],[17,53],[15,43]], C.coral);
    rect(19, 34, 3, 15, '#f3a286'); rect(18, 49, 15, 4, '#bc6157');
    rect(27, 33, 3, 14, C.cream); rect(27, 43, 6, 3, C.wood);
    poly([[15,35],[19,38],[17,46],[14,50],[11,47],[12,40]], C.peach);
    poly([[32,35],[36,38],[37,45],[34,48],[31,44]], C.peach);
    rect(11, 45, 5, 5, '#f4c69c'); rect(33, 44, 5, 5, '#f4c69c');
    // Rounded face, chestnut fringe, and a tiny side-facing nose.
    oval(24, 21, 12, 14, C.brown);
    poly([[15,17],[31,16],[34,23],[32,30],[27,34],[19,32],[15,27]], C.peach);
    rect(17, 17, 14, 4, '#f9cba0'); rect(31, 23, 5, 4, C.peach);
    poly([[13,18],[15,10],[24,6],[31,8],[35,14],[33,20],[29,17],[26,13],[22,19],[17,21]], C.brown);
    rect(17, 12, 9, 3, '#966342'); rect(14, 17, 4, 9, C.brown);
    rect(26, 23, 3, 4, C.ink); rect(28, 23, 1, 1, C.cream);
    rect(29, 28, 4, 2, '#d78070'); rect(21, 29, 3, 2, '#ef9d86');
    rect(20, 33, 8, 3, C.cream);
  });

  make('jenny', 48, 40, ({rect, poly, oval, shadow}) => {
    shadow(24, 36, 20, 4);
    // Upright curled tail and small cream cat, looking right.
    poly([[9,29],[5,25],[3,16],[5,9],[9,9],[11,14],[8,16],[8,22],[13,25]], C.brown);
    rect(5, 12, 4, 10, '#c99760');
    oval(22, 28, 14, 9, '#aa7a4f'); oval(23, 26, 13, 9, C.cream);
    rect(12, 25, 8, 8, '#d3a472'); rect(16, 32, 5, 5, C.cream);
    rect(28, 32, 5, 5, C.cream); rect(28, 35, 7, 2, '#dec79f');
    poly([[22,18],[20,5],[27,10],[33,8],[40,4],[40,21],[36,29],[27,29]], C.brown);
    poly([[23,17],[23,9],[28,13],[33,11],[38,8],[38,21],[34,27],[27,26]], C.cream);
    poly([[24,10],[25,17],[28,14]], C.pink); poly([[35,13],[38,9],[37,18]], C.pink);
    poly([[32,11],[37,9],[38,18],[34,20],[30,17]], '#c6955e');
    rect(27, 20, 2, 3, C.ink); rect(35, 20, 2, 3, C.ink);
    rect(31, 24, 3, 2, '#cb8b7e'); rect(30, 27, 5, 1, C.brown);
    rect(21, 24, 6, 1, '#af956f'); rect(38, 24, 6, 1, '#af956f');
    rect(23, 27, 4, 1, '#af956f'); rect(38, 27, 5, 1, '#af956f');
    rect(25, 29, 12, 3, C.coral); rect(30, 31, 3, 3, C.gold);
  });

  make('tico', 140, 118, ({rect, poly, oval, shadow}) => {
    shadow(71, 109, 58, 8);
    // Tail, far legs, and rounded body. Tico faces left.
    poly([[99,66],[116,67],[127,62],[137,49],[135,68],[125,80],[108,86]], C.mintDark);
    poly([[109,68],[123,67],[134,58],[128,72],[114,79]], C.mint);
    rect(80, 83, 18, 26, C.mintDark); rect(95, 82, 16, 25, '#468478');
    rect(81, 104, 18, 7, '#457a6c'); rect(95, 104, 20, 7, '#457a6c');
    oval(81, 68, 43, 31, C.ink);
    oval(81, 66, 41, 29, C.mintDark);
    oval(78, 62, 37, 26, C.mint);
    oval(74, 52, 28, 14, '#9bccaa');
    oval(80, 81, 26, 11, C.mintLight);
    // Near feet and little hoof marks.
    poly([[61,81],[79,83],[77,105],[73,111],[57,111],[56,104]], C.ink);
    poly([[63,83],[76,84],[74,105],[71,108],[59,108],[59,103]], C.mint);
    rect(59, 105, 15, 5, C.mintDark); rect(62, 106, 2, 4, '#44796e'); rect(69, 106, 2, 4, '#44796e');
    poly([[96,80],[112,79],[115,105],[111,112],[94,112],[92,105]], C.ink);
    poly([[99,82],[109,81],[112,104],[109,109],[96,109],[95,104]], C.mint);
    rect(96, 106, 16, 4, C.mintDark); rect(99, 106, 2, 4, '#44796e'); rect(106, 106, 2, 4, '#44796e');
    // The scalloped neck frill is a crown of mint and pale edge scales.
    poly([[28,33],[27,24],[35,20],[40,12],[48,14],[55,8],[62,14],[71,12],[76,23],[83,26],[81,37],[87,44],[80,54],[82,64],[71,70],[64,77],[51,72],[40,74],[31,65],[25,55]], C.ink);
    poly([[30,34],[30,26],[38,24],[42,16],[49,18],[55,12],[61,18],[69,16],[73,26],[79,29],[77,38],[82,44],[76,53],[78,61],[69,66],[63,72],[52,67],[42,69],[34,62],[29,54]], C.mintLight);
    oval(53, 43, 24, 26, C.mintDark);
    oval(51, 42, 20, 23, C.mint);
    rect(41, 23, 5, 6, '#80b99b'); rect(56, 19, 5, 6, '#80b99b'); rect(68, 29, 5, 6, '#80b99b');
    // Broad friendly muzzle and creamy horns.
    poly([[39,40],[52,47],[57,63],[54,78],[43,86],[19,85],[9,77],[7,65],[14,52]], C.ink);
    poly([[39,43],[49,49],[54,63],[51,76],[42,82],[20,82],[12,75],[10,65],[17,54]], C.mint);
    oval(26, 70, 18, 12, C.mintLight);
    poly([[20,53],[19,36],[27,46],[27,55]], C.brown);
    poly([[20,49],[21,36],[25,48],[25,52]], C.cream);
    poly([[37,47],[42,28],[45,34],[44,52]], C.brown);
    poly([[39,46],[42,30],[43,36],[42,50]], C.cream);
    poly([[13,67],[4,57],[6,71],[13,74]], C.cream);
    rect(32, 57, 6, 8, C.ink); rect(33, 57, 2, 3, '#ffffff');
    rect(15, 72, 3, 3, C.mintDark); rect(21, 77, 17, 2, '#609a80');
    oval(38, 70, 5, 3, '#dfac94');
    oval(85, 47, 6, 4, '#74b293'); oval(99, 54, 4, 3, '#74b293'); oval(92, 63, 3, 3, '#74b293');
    // A small field-research scarf makes him a park companion.
    poly([[51,75],[59,73],[64,86],[57,91],[48,84]], C.coral);
    poly([[58,86],[66,87],[71,101],[63,97]], '#c76659');
    rect(55, 81, 5, 5, C.gold);
  });

  make('tree', 160, 220, ({rect, poly, oval, shadow}) => {
    shadow(80, 210, 52, 9);
    poly([[70,92],[89,89],[91,165],[103,201],[116,210],[88,211],[80,204],[68,212],[43,211],[61,198],[69,165]], C.ink);
    poly([[73,93],[86,93],[86,166],[97,202],[108,208],[87,207],[78,198],[67,207],[54,208],[66,197],[73,163]], C.bark);
    poly([[74,115],[80,111],[79,188],[69,201],[76,177]], C.wood);
    poly([[84,145],[112,116],[116,119],[90,154]], C.brown);
    poly([[73,137],[48,115],[46,105],[52,111],[77,126]], C.brown);
    rect(82, 169, 3, 25, C.brown); rect(78, 143, 3, 14, C.brown);
    // Layered canopy keeps a dark underside and dappled sunlit top.
    const crowns = [[49,88,44,35],[105,83,45,37],[78,49,54,39],[32,61,29,28],[131,58,28,29],[109,32,35,24],[53,29,36,24],[80,109,45,27]];
    crowns.forEach(([x,y,rx,ry]) => oval(x,y,rx,ry,C.deep));
    [[41,68,35,29],[108,66,41,32],[75,41,49,34],[29,54,25,23],[131,50,25,24],[108,26,32,21],[52,25,33,20],[76,94,42,25]].forEach(([x,y,rx,ry]) => oval(x,y,rx,ry,C.green));
    [[41,48,30,23],[83,29,31,21],[112,43,28,22],[67,70,35,24],[124,71,23,18],[29,75,18,18]].forEach(([x,y,rx,ry]) => oval(x,y,rx,ry,C.leaf));
    [[37,35,18,12],[73,18,21,12],[105,28,17,10],[58,58,18,12],[119,58,14,10]].forEach(([x,y,rx,ry]) => oval(x,y,rx,ry,'#71b86d'));
    [[26,37],[40,25],[67,10],[83,22],[105,22],[119,43],[51,52],[64,60],[92,55],[22,67],[110,77],[68,86]].forEach(([x,y],i) => {
      rect(x,y,8,3,i%3===0 ? C.light : C.lime); rect(x+2,y-2,4,2,i%3===0 ? C.light : C.lime);
    });
    [[45,87],[92,95],[128,85],[62,102],[19,56],[141,56]].forEach(([x,y])=>rect(x,y,8,3,C.pine));
    // Ivy at the roots.
    poly([[68,195],[72,184],[75,196],[81,190],[79,205]], C.green);
    rect(59,207,8,3,C.leaf); rect(92,205,8,3,C.leaf);
  });

  make('palm', 150, 220, ({rect, poly, oval, shadow}) => {
    shadow(76,211,40,7);
    poly([[67,210],[73,160],[78,121],[70,81],[80,77],[89,120],[83,162],[82,207],[92,213],[60,213]], C.ink);
    poly([[71,208],[77,160],[82,121],[74,84],[79,82],[85,121],[79,161],[78,208]], C.wood);
    [[76,189],[78,169],[80,149],[82,130],[79,109]].forEach(([x,y])=>{rect(x-3,y,9,4,C.bark);rect(x-2,y,4,2,C.sand);});
    const leaves = [
      [[77,80],[56,59],[31,52],[10,56],[1,74],[23,66],[41,68],[63,80]],
      [[77,78],[49,38],[29,30],[9,34],[29,42],[40,53],[60,81]],
      [[78,77],[62,35],[64,13],[77,1],[73,27],[80,48],[84,76]],
      [[80,78],[91,40],[113,16],[135,13],[114,29],[100,50],[90,80]],
      [[81,80],[108,54],[132,51],[149,65],[128,62],[110,72],[91,86]],
      [[78,80],[104,78],[127,90],[137,113],[115,98],[98,94],[84,87]],
      [[75,80],[49,81],[26,100],[23,122],[38,107],[58,97],[78,89]],
    ];
    leaves.forEach(p=>poly(p,C.deep));
    leaves.forEach((p,i)=>{
      const inner = p.map(([x,y])=>[x+(78-x)*0.04,y-3]); poly(inner,i%2 ? C.green : C.leaf);
      const end = p[Math.floor(p.length/2)];
      poly([[78,77],[end[0],end[1]],[end[0]+4,end[1]+2],[80,82]], '#8abf70');
    });
    oval(77,82,10,9,C.pine); oval(71,88,6,7,C.brown); oval(82,88,6,7,C.bark);
    rect(70,84,3,3,C.sand); rect(81,84,3,3,C.wood);
    poly([[67,210],[62,198],[70,203],[74,194],[76,210]],C.green);
  });

  make('bush', 90, 64, ({rect, oval, shadow}) => {
    shadow(45,57,39,6);
    [[21,40,20,19],[42,31,24,27],[66,38,23,22],[46,47,34,14]].forEach(([x,y,rx,ry])=>oval(x,y,rx,ry,C.deep));
    [[21,36,18,17],[42,27,22,23],[66,34,21,19],[45,43,32,13]].forEach(([x,y,rx,ry])=>oval(x,y,rx,ry,C.green));
    [[24,30,14,12],[46,20,17,14],[66,29,14,12]].forEach(([x,y,rx,ry])=>oval(x,y,rx,ry,C.leaf));
    [[18,26],[37,14],[48,21],[64,24],[56,37],[26,42]].forEach(([x,y])=>rect(x,y,7,3,C.lime));
    [[22,35],[55,29],[69,41]].forEach(([x,y])=>{rect(x,y,5,5,C.coral);rect(x,y,2,2,'#ffcf9d');});
  });

  make('rock', 80, 55, ({rect, poly, shadow}) => {
    shadow(40,49,34,5);
    poly([[5,39],[11,20],[28,7],[52,5],[68,18],[76,37],[68,47],[45,52],[19,48]],'#305956');
    poly([[8,37],[15,21],[30,10],[51,8],[66,20],[70,37],[48,44],[21,44]],'#7a9690');
    poly([[15,21],[30,10],[51,8],[59,19],[42,28],[22,30]],'#a8b9a6');
    poly([[42,28],[59,19],[67,23],[70,37],[48,44]],'#66877f');
    poly([[30,10],[34,20],[42,28],[22,30],[15,21]],'#91aa9b');
    rect(25,17,12,3,'#c1cdb4'); rect(46,32,12,3,'#83a08f');
    poly([[10,38],[20,37],[25,42],[35,40],[44,47],[21,47],[13,44]],C.pine);
    rect(13,39,9,3,C.leaf); rect(25,43,10,3,C.green);
  });

  const fruit = (name, base, light, dark) => make(name,32,32,({rect,poly,oval,shadow})=>{
    shadow(16,28,11,3);
    oval(16,18,12,12,C.ink); oval(16,17,10,10,base);
    oval(12,13,5,5,light); rect(9,11,4,3,'#fff2cc');
    rect(15,5,3,7,C.brown); poly([[17,7],[21,2],[28,3],[24,8]],C.leaf);
    rect(20,24,4,2,dark); rect(12,25,6,2,dark);
  });
  fruit('fruit-pink', '#dd8094', '#f6acb4', '#be5c7c');
  fruit('fruit-gold', '#efbb53', '#ffdb7a', '#c58d36');
  fruit('fruit-purple', '#a28ab7', '#c7b1d5', '#7b6a93');

  make('flower',24,24,({rect,poly,oval})=>{
    rect(11,10,3,14,C.pine);poly([[11,19],[4,15],[5,21],[12,23]],C.leaf);
    poly([[14,16],[21,11],[20,18],[14,21]],C.green);
    oval(8,8,5,4,C.coral); oval(16,8,5,4,C.coral);
    oval(12,4,4,4,'#f7a58a'); oval(12,12,4,4,C.coral);
    rect(10,7,5,5,C.gold); rect(11,7,2,2,C.cream);
  });

  make('mushroom',32,36,({rect,poly,oval,shadow})=>{
    shadow(16,32,12,3); poly([[12,18],[20,18],[21,31],[18,34],[11,32]],C.brown);
    rect(13,19,6,12,C.cream);rect(17,20,2,10,C.sand);
    oval(16,17,15,10,C.ink);oval(16,14,14,10,C.coral);
    rect(3,17,26,4,'#c8665b');rect(7,9,5,4,C.cream);rect(19,7,4,4,C.cream);rect(20,15,6,3,C.cream);
    rect(12,4,6,2,'#f4ac8b');
  });

  make('sign',130,90,({rect,poly,oval,shadow})=>{
    shadow(66,84,35,5);
    rect(57,39,16,46,C.ink);rect(60,42,10,41,C.bark);rect(61,45,3,34,C.wood);
    poly([[8,10],[117,8],[124,18],[120,60],[14,64],[6,54]],C.ink);
    poly([[11,13],[115,11],[120,20],[117,57],[16,60],[10,53]],C.wood);
    poly([[15,17],[113,15],[114,52],[17,55]],'#d4ae76');
    rect(19,20,88,3,'#e9c48b');rect(18,48,87,3,'#ba905c');
    rect(16,15,4,4,C.brown);rect(109,14,4,4,C.brown);rect(17,52,4,4,C.brown);rect(108,50,4,4,C.brown);
    // A leaf medallion leaves room for the game's separate accessible label.
    oval(64,35,15,14,C.pine);
    poly([[56,43],[56,29],[70,24],[73,34],[65,43]],C.lime);
    poly([[59,41],[69,29],[61,43]],C.cream);
    rect(26,32,17,3,'#97754f');rect(84,31,14,3,'#97754f');
    rect(31,38,12,2,'#b18b5a');rect(84,37,10,2,'#b18b5a');
  });

  make('gate',250,185,({rect,poly,oval,shadow})=>{
    shadow(125,177,116,8);
    // Two chunky timber columns with a broad arch and rope joinery.
    [[20,42],[207,42]].forEach(([x,y])=>{
      poly([[x,y],[x+22,y-3],[x+26,171],[x+30,178],[x-5,178],[x,166]],C.ink);
      rect(x+4,y,16,133,C.bark);rect(x+5,y,5,131,C.wood);rect(x+16,y,4,132,C.brown);
      rect(x-2,73,26,8,C.sand);rect(x-1,76,24,2,C.wood);rect(x-2,145,27,8,C.sand);rect(x,148,23,2,C.wood);
      rect(x-5,168,34,10,'#6c8574');rect(x-3,168,29,3,'#9bb09a');
    });
    poly([[5,43],[24,21],[76,7],[170,7],[224,21],[246,43],[237,66],[188,48],[59,48],[13,66]],C.ink);
    poly([[10,43],[28,26],[77,12],[169,12],[221,26],[241,43],[235,59],[186,43],[61,43],[16,59]],C.bark);
    poly([[18,40],[31,30],[80,17],[166,17],[215,30],[232,40],[230,46],[184,34],[63,34],[20,48]],C.wood);
    rect(74,12,4,23,C.brown);rect(168,12,4,23,C.brown);
    // An empty cream plaque allows the live game to supply its title.
    poly([[64,23],[185,23],[191,31],[185,54],[64,54],[58,32]],C.ink);
    poly([[66,26],[183,26],[187,33],[182,50],[67,50],[62,33]],C.sand);
    rect(73,29,103,3,C.cream);rect(72,45,106,2,'#c29a65');
    // Small herbivore silhouettes on either side of the plaque.
    oval(43,38,10,6,C.deep);rect(38,39,3,9,C.deep);rect(48,39,3,8,C.deep);
    poly([[34,36],[26,30],[27,39],[34,42]],C.deep);poly([[50,35],[58,32],[53,39]],C.deep);
    poly([[208,32],[215,28],[213,37],[221,41],[211,46],[202,40]],C.deep);
    rect(201,44,3,7,C.deep);rect(212,43,3,7,C.deep);
    // Climbing vine softens the timber.
    poly([[19,168],[23,135],[19,105],[26,79],[25,59],[29,58],[30,80],[23,106],[27,135],[23,168]],C.pine);
    [[20,150],[26,129],[18,111],[26,91],[22,72]].forEach(([x,y],i)=>poly([[x,y],[x+(i%2?13:-11),y-8],[x+(i%2?10:-9),y+2],[x,y+4]],i%2?C.leaf:C.green));
    poly([[216,167],[220,153],[224,161],[231,153],[228,171]],C.green);
    rect(27,91,5,5,C.coral);rect(16,142,5,5,C.coral);
  });

  make('lantern',32,64,({rect,poly,oval,shadow})=>{
    shadow(16,60,11,3);
    rect(14,28,5,32,C.brown);rect(15,30,2,29,C.wood);
    poly([[7,9],[11,4],[21,4],[26,9],[24,12],[8,12]],C.ink);
    rect(9,12,15,22,C.ink);rect(11,14,11,17,C.gold);rect(13,15,6,15,'#ffe8a1');rect(15,17,3,11,C.cream);
    rect(10,21,13,3,C.brown);rect(15,13,3,19,C.brown);
    poly([[7,33],[25,33],[24,38],[9,38]],C.ink);rect(11,34,11,2,C.bark);
    rect(13,0,7,5,C.ink);rect(15,1,3,3,C.cream);
    poly([[10,60],[12,56],[21,56],[24,60]],C.pine);
  });
}
