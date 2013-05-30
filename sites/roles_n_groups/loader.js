var problems = {}; // array of hashes with the keys sim, oracle, scene, snode, svis
var pbp_idx = 5;//18;

function loadScenes() {
  var path = "../../libs/pbp-svgs/svgs/" + pbps[pbp_idx].name;
  document.getElementById('curr_num').innerText = pbps[pbp_idx].name;
  var files = pbps[pbp_idx].files;

  d3.selectAll("svg").remove();
  d3.selectAll("canvas").remove();
  create_html_elements(files);
  var adapter = new Box2DAdapter();
  problems = {};

  for (var y=0; y<files.length; y++) for (var x=0; x<files[y].length; x++) {
    console.log('loading and analyzing scene ' + files[y][x] + ' of ' + pbps[pbp_idx].name + '...');
    var scene = SVGSceneParser.parseFile(path + "/" + files[y][x] + '.svg', pixels_per_unit);
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

    problems[files[y][x]] = {sn: sn, svis: svis};
  }
}

function create_html_elements(files) {
  var pos = [];
  for (var y=0; y<files.length; y++) for (var x=0; x<files[y].length; x++) pos.push({x:x, y:y});
  d3.select("#svgs")
    .selectAll("svg")
    .data(pos)
    .enter()
    .append("svg")
    .attr("id", function(d) { return "s"+d.y+"-"+d.x })
    // .style("left", function(d) { return d.x * (100 * vis_scaling + 10) })
    // .style("top", function(d) { return d.y * (100 * vis_scaling + 10) })
    .style("width", 100*vis_scaling)
    .style("height", 100*vis_scaling);

d3.select("#canvases")
  .selectAll("canvas")
  .data(pos)
  .enter()
  .append("canvas")
  .attr("id", function(d) { return "c"+d.y+"-"+d.x })
  // .style("left", function(d) { return d.x * (100 * vis_scaling + 10) })
  // .style("top", function(d) { return d.y * (100 * vis_scaling + 10) })
  .attr("width", 100*vis_scaling)
  .attr("height", 100*vis_scaling);
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

var default_files = [['1-1', '1-2', '1-3', '1-4']
                    ,['2-1', '2-2', '2-3', '2-4']
                    ,['3-1', '3-2', '3-3', '3-4']
                    ,['4-1', '4-2', '4-3', '4-4']
                    ,['5-1', '5-2', '5-3', '5-4']];
var pbps = [
  {name: 'pbp02',  files: default_files, solution: ["one object", "two objects"]},
  {name: 'pbp12',  files: default_files, solution: ["small object falls off", "small object stays on top"]},
  {name: 'pbp04',  files: default_files, solution: ["squares", "circles"]},
  {name: 'pbp32',  files: default_files, solution: ["objects rotate a lot", "objects rotate little or no at all"]},
  {name: 'pbp22',  files: default_files, solution: ["objects collide with each other", "objects don't collide with each other"]},
  {name: 'pbp08',  files: default_files, solution: ["unstable situation", "stable situation"]},
  {name: 'pbp31',  files: default_files, solution: ["circle can be picked up directly", "circle cannot be picked up directly"]},
  {name: 'pbp27',  files: default_files, solution: ["(potential) chain reaction","no chain reaction"]},
  {name: 'pbp18',  files: default_files, solution: ["object touch eventually", "objects don't touch eventually"]},
  {name: 'pbp23',  files: default_files, solution: ["collision", "no collision"]},
  {name: 'pbp26',  files: default_files, solution: ["circle moves right", "circle moves left"]},
  {name: 'pbp13',  files: default_files, solution: ["objects form a tower", "objects form an arc"]},
  {name: 'pbp30',  files: default_files, solution: ["less stable situation", "stable situation"]},
  {name: 'pbp16',  files: default_files, solution: ["the circle is left of the square", "the square is left of the circle"]},
  {name: 'pbp24',  files: default_files, solution: ["several possible outcomes", "one possible outcome"]},
  {name: 'pbp20',  files: default_files, solution: ["eventually, the square supports other objects", "eventually, the square does not support other objects"]},
  {name: 'pbp21',  files: default_files, solution: ["strong collision", "weak or no collision"]},
  {name: 'pbp09',  files: default_files, solution: ["objects move in opposite directions", "objects move in same direction"]},
  {name: 'pbp33',  files: default_files, solution: ["construction gets destroyed", "construction stays intact"]},
  {name: 'pbp19',  files: default_files, solution: ["at least one object flies through the air", "all object always touch something"]},
  {name: 'pbp28',  files: default_files, solution: ["rolls well", "does not roll well"]},
  {name: 'pbp11b', files: default_files, solution: ["objects close to each other", "objects far from each other"]},
  {name: 'stability_tests', files: [['1-1', '1-2', '1-3'], ['2-1', '2-2', '2-3'], ['3-1', '3-2', '3-3'], ['4-1', '4-2', '4-3'], ['5-1', '5-2'], ['6-1'], ['7-1', '7-2', '8-1', '8-2']]},
];
