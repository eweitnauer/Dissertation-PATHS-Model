var scene, scale = 3;

function loadScene(res) {
  scene = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp09/1-1.svg");
  //scene = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp33/3-2.svg");
  // well now we could display the scenes, no?
  var display1 = document.getElementById('svg');
  var child; while (child = display1.childNodes[0]) { display1.removeChild(child); }
  scene.renderInSvg(document, display1, 0, 0, scale, true);
}

function calc(res) {
	res = Number(res);
	document.getElementById('res_value').innerHTML = res;
	d3.selectAll('canvas').remove();
	A = spatial_membership_faster(calcBodyMatrix(scene.shapes[1], res), beta_below, dir_membership, false);
	//A = spatial_membership_faster(calcBodyMatrix(scene.shapes[0], res), dist_euklid, function(val) { return 1-1/(1+Math.exp(50/res*(res/10-val)))}, false);
  draw_matrix(A, 300);
}

/// Results last time: ~ 5.5 ms
function speed_test() {
	var t = Date.now();
	d3.selectAll('canvas').remove();
	var BM = calcBodyMatrix(scene.shapes[0], 100);
  for (var k=0; k<100; k++) {
   	A = spatial_membership_faster(BM, beta_above, dir_membership, false);
  }
  console.log((Date.now()-t)/100, 'ms.');
  draw_matrix(A, 300);
}

function init() {
  loadScene();
  calc(50);
}