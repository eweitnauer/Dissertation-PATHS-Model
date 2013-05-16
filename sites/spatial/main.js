var scene, scale = 3, res=200, rot=0;

function loadScene(res) {
  //scene = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp20/5-1.svg");
  //scene = SVGSceneParser.parseFile("inside1.svg");
  scene = SVGSceneParser.parseFile("all.svg");
  //scene = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp08/4-1.svg");
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

function plot_artifacts() {
	var res = 200;
	var scale = res/100;
	scene = SVGSceneParser.parseFile("inside4.svg");
	var sra = SpatialRelationAnalyzer(res, scale, 'below', null
		          , function (val) { return Math.max(0, 1-2*val/Math.PI) });
	var R = scene.shapes[3], BM = sra.calcBodyMatrix(R);
	// accurate
	var acc = sra.calcSpatialMembershipMapAccurate(BM, sra.f_beta, sra.f_member);
	sra.debug_draw_A_R(null, acc, sra.debug_get_canvas('acc','accurate'));
	// 2 pass (I. Bloch)
	var _2pass = sra.calcSpatialMembershipMapFast(BM, sra.f_beta, sra.f_member);
	sra.debug_draw_A_R(null, _2pass, sra.debug_get_canvas('_2pass','2 passes'));
	// 4 pass (eweitnauer)
	var _4pass = sra.calcSpatialMembershipMapFaster(BM, sra.f_beta, sra.f_member);
	sra.debug_draw_A_R(null, _4pass, sra.debug_get_canvas('_4pass','4 passes'));

	d3.selectAll('canvas').on('click', function() {
	  window.open(this.toDataURL("image/png"))
	});
}

function calc(res) {
	var scale = res/1.75/100; // scene (100) has to fit in twice horizontally and vertically
	var rels = {near:1, far:1, above:1, below:1, left:1, right:1};
	A = scene.shapes[0];
	for (var i=0; i<scene.shapes.length; i++) {
		R = scene.shapes[i];
		var dx = scale*(A.x-R.x);
		var dy = scale*(A.y-R.y);

		if (!R.movable) continue;
		//var dx = (A.x-R.x)*scale, dy = (A.y-R.y)*scale;
		for (var rel in rels) {
			if (!rels[rel]) continue;
			var sra = SpatialRelationAnalyzer(res, scale, rel);
			console.log(rel,sra.getMembership(A, R));
			var can = sra.debug_get_canvas(rel+i, rel);
			sra.debug_draw_A_R(A._body_matrix.data, R._spatial_maps[rel].data, can, dx, dy);
		}
		// var f_close = function(dist) { return dist > 20 ? 0 : 1-(dist/20) };
		// var f_far = function(dist) { return dist < 10 ? 0 : (dist > 40 ? 1 : (dist-10)/30) };
		// var src = SpatialRelationAnalyzer(res, scale, 'near2', function(dx,dy) { return (Math.sqrt(dx*dx + dy*dy)) }, f_close);
		// var srf = SpatialRelationAnalyzer(res, scale, 'far2', function(dx,dy) { return (Math.sqrt(dx*dx + dy*dy)) }, f_far);
		// var can = src.debug_get_canvas('close2'+i, 'close2');
		// src.debug_draw_A_R(null, src.getSpatialMembershipMap(R), can);
		// var can = srf.debug_get_canvas('far2'+i, 'far2');
		// srf.debug_draw_A_R(null, srf.getSpatialMembershipMap(R), can);

		/// See http://plato.stanford.edu/entries/logic-fuzzy/ and http://en.wikipedia.org/wiki/Fuzzy_logic
		/// The T-conorm is defined as 1-T(1-a, 1-b)
		/// the natural negation is defined as N(x) = sup{t in [0,1] | T(x,t) = 0} for all x in [0,1].
		/// see http://lib.ugent.be/fulltxt/RUG01/001/354/713/RUG01-001354713_2010_0001_AC.pdf

		// Łukasiewicz logic
		var tnorm_l = function(a,b) { return Math.max(0, a+b-1)}; // Łukasiewicz t-norm
		var tconorm_l = function(a,b) { return Math.min(1, a+b)}; // bounded sum (dual to Łukasiewicz t-norm)
		var neg_l = function(a) { return 1-a };

		// Gödel logic
		var tnorm_m = Math.min; // minimum t-norm
		var tconorm_m = Math.max; // maximum t-conorm (dual to minimum t-norm)
		var neg_m = function(a) { return a == 0 ? 1 : 0 };

		// product logic
		var tnorm_p = function(a,b){return a*b}; // product t-norm
		var tconorm_p = function(a,b){return a+b-a*b}; // probabilistic sum (dual to product t-norm)
		var neg_p = neg_m;

		// drastic norm
		var tnorm_d = function(a,b){if (isNaN(a) || isNaN(b)) return NaN; return a==1 ? b : (b==1 ? a : 0)}; // drastic t-norm
		var tconorm_d = function(a,b){if (isNaN(a) || isNaN(b)) return NaN; return  a==0 ? b : (b==0 ? a : 1)}; // drastic t-conorm
		var neg_d = function(a) {if (isNaN(a)) return NaN; return a == 1 ? 0 : 1 }; // natural negation for drastic t-norm

		// in their papers, I. Bloch normally uses the minimum t-norm for fusion
		var tnorm = tnorm_m;
		var tconorm = tconorm_m;
		var minus = function(a,b) { return tnorm_l(a, neg_l(b))};
		// ^^ this is Math.max(0, a-b) for Lukasiewicz

		var left = R._spatial_maps.left.data
		   ,right = R._spatial_maps.right.data
		   ,above = R._spatial_maps.above.data
		   ,below = R._spatial_maps.below.data
		   ,close = R._spatial_maps.near.data
		   ,far = R._spatial_maps.far.data;

		var rml = right.combine(left, minus);
		var can = sra.debug_get_canvas('d1-'+i, 'right - left');
		sra.debug_draw_A_R(null, rml, can);

		var lmr = left.combine(right, minus);
		var can = sra.debug_get_canvas('d2-'+i, 'left - right');
		sra.debug_draw_A_R(null, lmr, can);

		var fa = far.combine(above, tnorm);
		var can = sra.debug_get_canvas('d3a-'+i, 'far ∩ above');
		sra.debug_draw_A_R(null, fa, can);

		var fa2 = fa.combine(close.combine(below, tconorm), minus);
		var can = sra.debug_get_canvas('d3b-'+i, '(far ∩ above) - (near ∪ below)');
		sra.debug_draw_A_R(null, fa2, can);

		var cl = close.combine(left, tnorm);
		var can = sra.debug_get_canvas('d4a-'+i, 'close ∩ left');
		sra.debug_draw_A_R(null, cl, can);

		var f_o_r = far.combine(right, tconorm);
		var can = sra.debug_get_canvas('d4b-'+i, 'far ∪ right');
		sra.debug_draw_A_R(null, f_o_r, can);

		var cl2 = cl.combine(f_o_r, minus);
		var can = sra.debug_get_canvas('d4c-'+i, '(close ∩ left) - (far ∪ right)');
		sra.debug_draw_A_R(null, cl2, can);

		var lor = left.combine(right, tconorm);
		var can = sra.debug_get_canvas('d5-'+i, 'left ∪ right');
		sra.debug_draw_A_R(null, lor, can);

		var lar = left.combine(right, tnorm);
		var can = sra.debug_get_canvas('d6-'+i, 'left ∩ right');
		sra.debug_draw_A_R(null, lar, can);

		//var ab = above.combine(below, tconorm);
		//var can = sra.debug_get_canvas('d7-'+i, 'above ∪ below');
		//sra.debug_draw_A_R(null, ab, can);

		//var ab2 = ab.combine(above.combine(below, tnorm), minus);
		//var can = sra.debug_get_canvas('d8-'+i, '(a ∪ b) - (a ∩ b)');
		//sra.debug_draw_A_R(null, ab2, can);

		// var lrab = ab.sub(lor);
		// var can = sra.debug_get_canvas('d9', '(l ∪ r) - (a ∪ b)');
		// sra.debug_draw_A_R(null, lrab, can);

		// this is how I. Bloch would do it with bipolar fuzzy sets -- to arrive at
		// an actual value for the agreement, the positive and negative evidence is
		// merged only at the very end
		// PROBLEM with this definition: an elongated object exactly above a square
		// can be both left and right to the object and therefore easily be attributed
		// to be 'beside', which is not true. Beside should just be defined on the
		// acceptability level as min(left, right).
		var beside = lor.combine(lar, minus);
		var can = sra.debug_get_canvas('d10-'+i, 'beside: (l ∪ r) - (l ∩ r)');
		sra.debug_draw_A_R(A._body_matrix.data, beside, can, dx, dy);
		console.log(sra.calcObjectMembership(A._body_matrix.data, beside, dx, dy));

		// inside does not work well for an U rotated by 45 deg --> it should rather be
		// defined relative to the convex hull of the object
		var inside = left.combine(right, tnorm);
		var can = sra.debug_get_canvas('d11-'+i, 'inside: l ∩d r');
		sra.debug_draw_A_R(null, inside, can);

		var inside2 = left.combine(right, tnorm_d);
		var can = sra.debug_get_canvas('d12-'+i, 'inside_drastic: l ∩d r');
		sra.debug_draw_A_R(null, inside2, can);
	}

	d3.selectAll('canvas').on('click', function() {
	  window.open(this.toDataURL("image/png"))
	});
}

function save_all_canvases() {
	d3.selectAll('canvas').each(function(){window.open(this.toDataURL("image/png"))});
}

/// Results with res=100
/// 3-pass: ~ 5.5 ms
/// 4-pass with 4 neighborship: ~ 3 ms
/// 4-pass with 8 neighborship: ~ 4 ms
function speed_test() {
	var t = Date.now();
	var res = 100, scale = res/2/100;
	var sra = SpatialRelationAnalyzer(res, scale, 'above');
	var my_scene = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp20/5-1.svg");
	var A = my_scene.shapes[1];
	var R, BM = sra.calcBodyMatrix(A);
  for (var k=0; k<100; k++) {
   	R = sra.calcSpatialMembershipMapFaster(BM, sra.f_beta, sra.f_member);
  }
  console.log((Date.now()-t)/100, 'ms.');
  sra.debug_draw_A_R(null, R, sra.debug_get_canvas('debug'));
}

function init() {
  loadScene();
  calc(res);
}