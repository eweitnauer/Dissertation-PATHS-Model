PITestSuite = function(repetitions, max_solver_steps) {
	this.pbps = [ "pbp12", "pbp02", "pbp04", "pbp08", "pbp11b", "pbp13"
              , "pbp16", "pbp18", "pbp20", "pbp22", "pbp26", "pbp31"];
	this.parameters = [{name: 'pbp', values: this.pbps}];
	this.reps = repetitions || 1;
	this.max_solver_steps = max_solver_steps || 1000;
	this.scene_cache = {}; // pbp -> [scenes]
	this.results = [];
  this.data_logger = null;
  this.before_step_callback = null;
  this.after_step_callback = null;
  this.progress_callback = null;
  this.log_error_callback = null;
  this.id = Random.uid();
}

PITestSuite.prototype.setLogServer = function(url, table_name) {
  var self = this;
  this.data_logger = { log: function(data, table) {
    d3.xhr(url+'/'+(table||table_name))
      .header("Content-Type", "application/json")
      .post(JSON.stringify(data), function(error, data) {
        console.log('log server results: ', error, data);
        if (error && self.log_error_callback) self.log_error_callback(error);
    })
  }}
}

PITestSuite.prototype.addParameter = function(name, values) {
	this.parameters.push({name: name, values: values, i: 0});
}

PITestSuite.prototype.setParameter = function(name, values) {
  var p = this.parameters.filter(function(param) { return param.name === name });
  if (p.length === 0) throw 'unknown parameter ' + name;
  p[0].values = values;
  p[0].i = 0;
}

PITestSuite.prototype.run = function(start_idx) {
	var param_settings = this.cartesianProduct(this.parameters);
  this.step_count = param_settings.length;
  var i = start_idx || 0, self = this;
  // this.logDefaultOptions();
  function step() {
    if (i >= param_settings.length) return;
    var params = param_settings[i++];
    self.curr_idx = i;
    var options = self.createDefaultOptions();
    var pbp = null;
    for (var j=0; j<params.length; j++) {
      if (params[j].name === 'pbp') pbp = params[j].value;
      else self.applyParam(options, params[j]);
    }
    if (self.before_step_callback) self.before_step_callback(i, param_settings.length, params);
    console.log('running test', i, 'of', param_settings.length, 'with', params.map(function(param) {
      return param.name+': '+param.value;
    }).join(', '));
    self.runOne(pbp, options, params, step);
  }
  step();
}

PITestSuite.prototype.applyParam = function(options, param) {
  var path = param.name.split('.')
    , N = path.length;
  for (var i=0; i<path.length-1; i++) options = options[path[i]];
  if (!(path[N-1] in options)) throw "ERROR: " + param.name + " does not match any known option!";
  options[path[N-1]] = param.value;
}

PITestSuite.prototype.runOne = function(pbp, options, params, callback) {
  var scenes = this.getScenes(pbp);
  var pi = PITester.get_current_pi()(options);
  var tester = new PITester( pi, scenes, this.reps, this.max_solver_steps
                           , 1, 'error');
  var self = this;
  tester.finish_callback = function() {
    console.log('finished!');
    var stats = tester.get_stats();
    self.logResult(options, params, stats);
    if (self.after_step_callback) self.after_step_callback(params, stats);
    callback();
  };
  tester.after_rep_callback = this.progress_callback;
  tester.run();
}

// PITestSuite.prototype.logDefaultOptions = function() {
//   var opts = this.createDefaultOptions();
//   opts.features = opts.features.map(function(fi) {
//     return { key: fi.klass.prototype.key
//            , targetType: fi.klass.prototype.targetType
//            , initial_activation: fi.initial_activation }
//   });
//   var data = { test_id: this.id
//              , options: opts };
//   if (this.data_logger) this.data_logger.log(data, 'pi_settings');
// }


PITestSuite.prototype.logResult = function(opts, params, stats) {
  opts.features = opts.features.map(function(fi) {
    return { key: fi.klass.prototype.key
           , targetType: fi.klass.prototype.targetType
           , initial_activation: fi.initial_activation }
  });
  var res = { step_idx: this.curr_idx
            , step_count: this.step_count
            , test_id: this.id
            , options: opts };
  params.forEach(function(param) { res[param.name] = param.value });
  for (var trial_idx in stats.trials) {
    var data = {};
    PBP.extend(data, res);
    PBP.extend(data, stats.trials[trial_idx]);
    data.sol = data.sol ? data.sol.describe() : '';
    delete data.sols;
    this.results.push(data);
    if (this.data_logger) this.data_logger.log(data);
  }
}

PITestSuite.prototype.cartesianProduct = function(params) {
	var results = [];
	function recurse(arr_in, arr_out) {
		if (arr_in.length === 0) { results.push(arr_out); return }
		for (var i=0; i<arr_in[0].values.length; i++) {
		  var out = arr_out.slice();
		  out.push({name: arr_in[0].name, value: arr_in[0].values[i]});
		  recurse(arr_in.slice(1), out);
		}
	}
	recurse(params, []);
	return results;
}

PITestSuite.prototype.getScenes = function(pbp) {
	if (!this.scene_cache[pbp]) this.scene_cache[pbp] = this.loadScenes(pbp);
	return this.scene_cache[pbp];
}

PITestSuite.prototype.loadScenes = function(pbp) {
	var path = "../../libs/pbp-svgs/svgs/" + pbp;
	var files = ['1-1', '1-2', '1-3', '1-4'
                    ,'2-1', '2-2', '2-3', '2-4'
                    ,'3-1', '3-2', '3-3', '3-4'
                    ,'4-1', '4-2', '4-3', '4-4'
                    ,'5-1', '5-2', '5-3', '5-4'];
	var scenes = [];
  var adapter = new Box2DAdapter();
  for (var i=0; i<files.length; i++) {
  	var scene = SVGSceneParser.parseFile(path + "/" + files[i] + '.svg', pixels_per_unit);
    // quick hack to extract side from the file name
    if (files[i].split('-').length == 2 && Number(files[i].split('-')[1]) >= 3) {
      scene.side = 'right';
    } else scene.side = 'left';
    scene.name = files[i];

    scene.adjustStrokeWidth(0.5*pixels_per_unit/100);

    // create b2World
    var world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(0, 10), true);
    scene.friction = 0.3;
    scene.resitution = 0.1;
    adapter.loadScene(world, scene, true, false);

    // create PhysicsScene, Simulator and SceneNode with PhysicsOracle
    var ps = new PhysicsScene(world);
    var sn = new SceneNode(scene, new PhysicsOracle(ps));
    sn.registerObjects();
  	sn.perceiveCollisions();

  	scenes.push(sn);
  }
  return scenes;
}

PITestSuite.prototype.createDefaultOptions = function() {
  var low = 0.1, mid = 0.2, high = 0.3;
	return {
    features: [
                { klass: StabilityAttribute,   initial_activation: high }
              , { klass: SingleAttribute,      initial_activation: high }
              , { klass: MovesAttribute,       initial_activation: high }
              , { klass: TouchRelationship,    initial_activation: high }
              , { klass: CircleAttribute,      initial_activation: mid }
              , { klass: SquareAttribute,      initial_activation: mid }
              , { klass: TriangleAttribute,    initial_activation: mid }
              , { klass: RectangleAttribute,   initial_activation: mid }
                // , { klass: ShapeAttribute,       initial_activation: high }
              , { klass: CountAttribute,       initial_activation: mid }
              , { klass: CloseAttribute,       initial_activation: mid }
                // , { klass: CloseRelationship,    initial_activation: mid }
              , { klass: SmallAttribute,       initial_activation: mid }
                // , { klass: LargeAttribute,       initial_activation: mid }
              , { klass: TopMostAttribute,     initial_activation: mid }
                // , { klass: LeftMostAttribute,    initial_activation: low }
                // , { klass: RightMostAttribute,   initial_activation: low }
                // , { klass: FarRelationship,      initial_activation: low }
                // , { klass: FarAttribute,         initial_activation: low }
              , { klass: OnTopRelationship,    initial_activation: low }
              , { klass: OnGroundAttribute,    initial_activation: low }
              , { klass: RightRelationship,    initial_activation: low }
              , { klass: LeftRelationship,     initial_activation: low }
                // , { klass: AboveRelationship,    initial_activation: low }
                // , { klass: BelowRelationship,    initial_activation: low }
                // , { klass: BesideRelationship,   initial_activation: low }
                // , { klass: BottomAttribute,      initial_activation: low }
                // , { klass: TopAttribute,         initial_activation: low }
              , { klass: TouchAttribute,       initial_activation: low }
              , { klass: SupportsRelationship, initial_activation: low }
              , { klass: HitsRelationship,     initial_activation: low }
               // , { klass: GetHitsRelationship,     initial_activation: low }
              , { klass: CollidesRelationship, initial_activation: low }
              , { klass: LeftAttribute,        initial_activation: low }
              , { klass: RightAttribute,       initial_activation: low }
              , { klass: MovableUpAttribute,   initial_activation: low }
             ]
  , pres_mode: 'interleaved-sim-sim' // {blocked, interleaved} X {sim, dis} X {sim, dis}
  , pres_time: 100 // every x steps, switch to the next scene pair
  , perception:
    {
      pick_group: 0.3 // probability that a group (vs. an object) is picked as
                      // perception target when the target is picked first
    , pick_feature_fist: 0 // probability that the feature (vs. the target) is
                      // picked first during perception
    }
  , attention:
    { time: { start: 0.67, end: 0.33 }//{ start: 0.67, end: 0.33 }
    , sel: {
        initial: // initial attention for selectors based on first match
        {
          one_side: 0.4
        , both_sides: 0.2
        , fail: 0
        }
      , specificity: 0.1 // raise attention to selectors that match less than all objects per scene
      , update:       // raise attention according to which scenes where matched in a scene pair
        {
          one_side: 0.15
        , both_sides: 0.05
        , fail: 0
        }
      , complexity_penalty_steepness: 15 // posteriori is 1-1/(1+exp(cps*(0.25-complexity/10)))
      }
    , feature: {
        initial: 0.1
      , from_sel: 0.5 // scale that is applied when spreading attention from new selectors to features
    }
    , obj: {
        initial: 0.1
      , from_sel_scale: 0.2 // scale that is applied when spreading attention from new selectors to objects
      , attr_boost: { // only apply at time "start"
          moves: 0.3
        // , top_most: 0.1 // this & below: often will get boosted via sel.single, too
        // , single: 0.1
        // , left_most: 0.1
        // , right_most: 0.1
        }
      , rel_boost: { // only apply at time "start"
          hits: [0.2, 0]
        , collides: [0.1, 0.1]
        }
      }
    }
  };
}
