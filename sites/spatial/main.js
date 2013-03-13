var scene, scale = 3, res=50, rot=0;

function loadScene(res) {
  scene = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp09/1-1.svg");
  //scene = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp33/3-2.svg");
  // well now we could display the scenes, no?
  var display1 = document.getElementById('svg');
  var child; while (child = display1.childNodes[0]) { display1.removeChild(child); }
  scene.renderInSvg(document, display1, 0, 0, scale, true);
}

function res_change(resolution) {
	res = Number(resolution);
	document.getElementById('res_value').innerHTML = res;
	calc(res);
}

function calc(res) {
	d3.selectAll('canvas').remove();
	var scale = res/2/100; // scene (100) has to fit in twice horizontally and vertically
	var sra = SpatialRelationsAnalyzer(res, scale, 'above');
	A = scene.shapes[1], R = scene.shapes[0];
	console.log(sra.getMembership(A, R));
	var dx = (R.x-A.x)*scale, dy = (R.y-A.y)*scale;
  sra.debug_draw_A_R(A._body_matrix.data, R._spatial_maps['above'].data, dx, dy);
}

/// Results with res=100: ~ 5.5 ms
function speed_test() {
	var t = Date.now();
	d3.selectAll('canvas').remove();
	var res = 100, scale = res/2/100;
	var sra = SpatialRelationsAnalyzer(res, scale, 'above');
	var A = scene.shapes[0];
	var R, BM = sra.calcBodyMatrix(A);
  for (var k=0; k<100; k++) {
   	R = sra.calcSpatialMembershipMapFaster(BM, sra.f_beta, sra.f_member);
  }
  console.log((Date.now()-t)/100, 'ms.');
  sra.debug_draw_matrix(R);
}

function init() {
  loadScene();
  calc(50, 0);
}