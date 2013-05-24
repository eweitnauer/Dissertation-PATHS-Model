var problems = {}; // array of hashes with the keys sim, oracle, scene, snode, svis
var pbp_idx = 18;

function loadScenes() {
  var path = "../../libs/pbp-svgs/svgs/pbp" + pbps[pbp_idx].pbp;
  document.getElementById('curr_num').innerText = 'PBP'+pbps[pbp_idx].pbp;

  d3.selectAll("svg").remove();
  d3.selectAll("canvas").remove();
  create_html_elements();
  var adapter = new Box2DAdapter();
  problems = {};

  for (var y=1; y<=5; y++) for (var x=1; x<=4; x++) {
    console.log('loading and analyzing scene ' + y + '-' + x + ' of PBP ' + pbps[pbp_idx].pbp + '...');
    //if (y!=4 || x!=1) continue;
    var scene = SVGSceneParser.parseFile(path + "/" + y + "-" + x + '.svg', pixels_per_unit);
    scene.adjustStrokeWidth(0.5*pixels_per_unit/100);

    // create b2World
    var world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(0, 10), true);
    scene.friction = 0.3;
    scene.resitution = 0.1;
    adapter.loadScene(world, scene, true, false);

    // create PhysicsScene, Simulator and SceneNode with PhysicsOracle
    var el_canvas = document.getElementById('c'+y+"-"+x);
    var ps = new PhysicsScene(world);
    var sim = new Simulator(ps, el_canvas, scene.pixels_per_unit*vis_scaling, true);
    var sn = new SceneNode(scene, new PhysicsOracle(ps));

    // create SceneVisualizer
    var el_svg = document.getElementById('s'+y+"-"+x);
    var svis = new SceneVisualizer(scene, sn, el_svg, vis_scaling);
    ps.onWorldChange.addListener(function(svis) { return function() {svis.draw_scene()} }(svis))
    svis.draw_scene();
    analyzeScene(sn, svis);

    problems[''+y+'-'+x] = {sn: sn, svis: svis};
  }
}

function create_html_elements() {
  var pos = [];
  for (var y=1; y<=5; y++) for (var x=1; x<=4; x++) pos.push([y,x]);
  d3.select("#svgs")
    .style("width", vis_scaling*110*4+"px")
    .style("height", vis_scaling*110*4+"px")
    .selectAll("svg")
    .data(pos)
    .enter()
    .append("svg")
    .attr("id", function(d) {return "s"+d[0]+"-"+d[1]})
    .attr("width", 100*vis_scaling)
    .attr("height", 100*vis_scaling)
    .style("margin", "5px");

d3.select("#canvases")
    .style("width", vis_scaling*110*4+"px")
    .style("height", vis_scaling*110*4+"px")
    .selectAll("canvas")
    .data(pos)
    .enter()
    .append("canvas")
    .attr("id", function(d) {return "c"+d[0]+"-"+d[1]})
    .attr("width", 100*vis_scaling)
    .attr("height", 100*vis_scaling)
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

function setup_options() {
  d3.select('#show-hide')
    .on('click', function () {
      var n = d3.select('#options');
      n.style('display', n.style('display') == 'none' ? 'block' : 'none')
    });

  var fields = d3.select('#options')
                 .selectAll('div.opt-field')
                 .data(options)
                 .enter()
                 .append('div')
                 .classed('opt-field', true);
  fields.append('input')
        .attr('type', 'radio')
        .attr('name', 'options')
        .attr('value', function (d) { return d.name })
        .attr('checked', function (d) { return d.checked })
        .on('change', function (d) {
          d3.select(this.parentNode.parentNode).selectAll('input').each(
            function (d) { d.checked = this.checked }
          );
          if (this.checked) option_callback(d)
        });
  fields.append('span')
        .text(function (d) { return d.name });

  var opts = fields.selectAll('div.opt')
        .data(function (d) { return d.opts.map(function (o) { o.parent = d; return o }) })
        .enter()
        .append('div')
        .classed('opt', true);
  opts.append('input')
      .attr('type', function (d) { return d.parent.multiple ? 'checkbox' : 'radio' })
      .attr('name', function (d) { return d.parent.name } )
      .attr('value', function (d) { return d.name })
      .attr('checked', function (d) { return d.checked })
      .on('change', function (d) {
        d3.select(this.parentNode.parentNode).selectAll('input').each(
          function (d) { d.checked = this.checked }
        );
        if (d.parent.checked) option_callback(d.parent);
      })
  opts.append('span')
        .text(function (d) { return d.name });
}

function init() {
  span = document.getElementById('curr_num');
  setup_options();
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
