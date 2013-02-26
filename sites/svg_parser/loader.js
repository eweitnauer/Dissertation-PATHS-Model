var scale = 1,
    pbp_idx = 0,
    sims = {},
    span;

function loadScenes() {
  var path = "../../imgs/pbp" + pbps[pbp_idx].pbp;
  span.innerText = 'PBP'+pbps[pbp_idx].pbp;

  d3.selectAll("svg").remove();
  d3.selectAll("canvas").remove();
  create_html_elements();

  for (var y=1; y<=5; y++) for (var x=1; x<=4; x++) {
    //if (y!=5 || x!=1) continue;
    var scene = SVGSceneParser.parseFile(path + "/pbp-scene-" + y + "-" + x + '.svg');
    // well now we could display the scenes, no?
    var display1 = document.getElementById('s'+y+"-"+x);
    var child; while (child = display1.childNodes[0]) { display1.removeChild(child); }
    scene.renderInSvg(document, display1, 0, 0, scale);

    // okay, next we will be so bold as to put the scene into a b2World
     world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(0, 10), true);
     var adapter = new Box2DAdapter();
     scene.pixels_per_unit = 50;
     scene.friction = 0.3;
     scene.resitution = 0.1;
     adapter.loadScene(world, scene, true, false);

     var display2 = document.getElementById('c'+y+'-'+x);
     if (sims[y+'-'+x]) sims[y+'-'+x].release();
     sims[y+'-'+x] = new Simulator(world, display2, scene.pixels_per_unit*scale);
     sims[y+'-'+x].playing = true;
  }
}

function create_html_elements() {
  var pos = [];
  for (var y=1; y<=5; y++) for (var x=1; x<=4; x++) pos.push([y,x]);
  d3.select("#svgs")
    .style("width", scale*110*4+"px")
    .style("height", scale*110*4+"px")
    .selectAll("svg")
    .data(pos)
    .enter()
    .append("svg")
    .attr("id", function(d) {return "s"+d[0]+"-"+d[1]})
    .attr("width", 100*scale)
    .attr("height", 100*scale)
    .style("margin", "5px");

d3.select("#canvases")
    .style("width", scale*110*4+"px")
    .style("height", scale*110*4+"px")
    .selectAll("canvas")
    .data(pos)
    .enter()
    .append("canvas")
    .attr("id", function(d) {return "c"+d[0]+"-"+d[1]})
    .attr("width", 100*scale)
    .attr("height", 100*scale)
    .style("margin", "5px");
}

function next() {
  pbp_idx += 1;
  if (pbp_idx >= pbps.length) pbp_idx = 0;
  loadScenes();
}

function prev() {
  pbp_idx -= 1;
  if (pbp_idx < 0) pbp_idx = pbps.length-1;
  loadScenes();
}

function init() {
  span = document.getElementById('curr_num');
  loadScenes();
}

var pbps = [
  {pbp: '02',  solution: ["one object", "two objects"]},
  {pbp: '12',  solution: ["small object falls off", "small object stays on top"]},
  {pbp: '04',  solution: ["squares", "circles"]},
  {pbp: '32',  solution: ["objects rotate a lot", "objects rotate little or no at all"]},
  {pbp: '22',  solution: ["objects collide with each other", "objects don't collide with each other"]},
  {pbp: '08',  solution: ["unstable situation", "stable situation"]},
  {pbp: '31',  solution: ["circle can be picked up directly", "circle cannot be picked up directly"]},
  {pbp: '27',  solution: ["(potential) chain reaction","no chain reaction"]},
  {pbp: '18',  solution: ["object touch eventually", "objects don't touch eventually"]},
  {pbp: '23',  solution: ["collision", "no collision"]},
  {pbp: '26',  solution: ["circle moves right", "circle moves left"]},
  {pbp: '13',  solution: ["objects form a tower", "objects form an arc"]},
  {pbp: '30',  solution: ["less stable situation", "stable situation"]},
  {pbp: '16',  solution: ["the circle is left of the square", "the square is left of the circle"]},
  {pbp: '24',  solution: ["several possible outcomes", "one possible outcome"]},
  {pbp: '20',  solution: ["eventually, the square supports other objects", "eventually, the square does not support other objects"]},
  {pbp: '21',  solution: ["strong collision", "weak or no collision"]},
  {pbp: '09',  solution: ["objects move in opposite directions", "objects move in same direction"]},
  {pbp: '33',  solution: ["construction gets destroyed", "construction stays intact"]},
  {pbp: '19',  solution: ["at least one object flies through the air", "all object always touch something"]},
  {pbp: '28',  solution: ["rolls well", "does not roll well"]},
  {pbp: '11b', solution: ["objects close to each other", "objects far from each other"]},
];
