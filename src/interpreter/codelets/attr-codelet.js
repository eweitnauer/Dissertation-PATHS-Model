/**
 * Chooses an object or a group of objects and then an attribute or
 * relationship which it perceives. It may spawn NewHypothesisCodelets (with
 * the current attribute) and RefineHypothesisCodelets (with the current
 * attribute and a different attribute the same object has).
 */
var AttrCodelet = function(coderack) {
  this.coderack = coderack;
  this.followup = [];
  this.ws = this.coderack.ws;
  this.time = this.ws.getRandomTime();
}

AttrCodelet.prototype.describe = function() {
  return 'AttrCodelet';
}

AttrCodelet.prototype.spawnNewSelCodelet = function (percept, time) {
  this.coderack.insert(new NewHypothesisCodelet(this.coderack, percept, time));
};

AttrCodelet.prototype.isActive = function(percept) {
  return percept.get_activity() > pbpSettings.activation_threshold;
}

AttrCodelet.prototype.perceiveAttr = function(target, feature) {
  var time = (feature.prototype.constant ? 'start' : this.time);
  percept = target.get(feature.prototype.key, {time: time});
  if (this.isActive(percept)) {
    this.spawnNewSelCodelet(percept, time);
  }
}

AttrCodelet.prototype.perceiveRel = function(scene, target_obj, feature) {
  if (scene.objs.length < 2) {
    this.ws.blockFeature(feature);
    return;
  }
  var time = (feature.prototype.constant ? 'start' : this.time);
  var key = feature.prototype.key;
  var other = this.ws.getRandomObject(scene, {filter: function(obj) {
    return obj !== target_obj && !target_obj.getFromCache(key, { other: obj, time: time });
  }});
  if (!other) return;
  percept = target_obj.get(key, {other: other, time: time});
  if (percept && percept.get_activity() > pbpSettings.activation_threshold) {
    this.spawnNewSelCodelet(percept, time);
  }
}

AttrCodelet.prototype.shouldPickFeatureFirst = function() {
  return Math.random() < this.ws.options.perception.pick_feature_fist;
}

AttrCodelet.prototype.shouldPickGroup = function() {
  return Math.random() < this.ws.options.perception.pick_group;
}

AttrCodelet.prototype.isNotCachedFeatureFilter = function(node, time) {
  var N = node.scene_node.objs.length;
  return function(feature) {
    var t = (feature.prototype.constant ? 'start' : time);
    if (feature.prototype.arity === 1)
      return !node.getFromCache(feature.prototype.key, {time: t})
    // we have a relationship, check whether all relationships of given type
    // between node and all the other objects in the scene have been perceived
    return ( node.getFromCache(feature.prototype.key, { get_all: true, time: t }).length
           < N-1);
  }
}

AttrCodelet.prototype.isNotCachedNodeFilter = function(feature, time) {
  var key = feature.prototype.key;
  time = (feature.prototype.constant ? 'start' : time);
  if (feature.prototype.arity === 1)
    return function(node) { return !node.getFromCache(key, { time: time }) }
  // we have a relationship, check whether all relationships of given type
  // between node and all the other objects in the scene have been perceived
  return function(node) {
    return ( node.getFromCache(key, { get_all: true, time: time }).length
           < node.scene_node.objs.length-1);
  }
}

AttrCodelet.prototype.run = function() {
  var scene = this.ws.getRandomScene();
  var target, feature;

  if (this.shouldPickFeatureFirst()) {
    feature = this.ws.getRandomFeature();
    var node_filter = this.isNotCachedNodeFilter(feature, this.time);
    if (feature.prototype.targetType == 'group') {
      target = this.ws.getRandomGroup(scene, { not_empty: true, filter: node_filter });
      if (!target) return;
      //var hyp = this.ws.getRandomHypothesis({type: 'object'});
      //target = this.ws.getOrCreateGroupBySelector(hyp.sel, scene);
      //if (target.empty()) return;
    } else if (feature.prototype.targetType == 'obj') {
      target = this.ws.getRandomObject(scene, { filter: node_filter });
    } else throw "unknown target type";
    if (!target) return; // TODO: disencourage perception

    if (feature.prototype.arity == 1) this.perceiveAttr(target, feature);
    else if (feature.prototype.arity == 2) this.perceiveRel(scene, target, feature);
    else throw "only features with arity 1 or 2 are supported";
  }

  else { // pick obj or group first
    var pick_group = this.shouldPickGroup();
    target = pick_group ? this.ws.getRandomGroup(scene) : this.ws.getRandomObject(scene);
    if (!target) return;
    feature = this.ws.getRandomFeature({ type: pick_group ? 'group' : 'obj'
        , filter: this.isNotCachedFeatureFilter(target, this.time) });
    if (!feature) return; // TODO: disencourage perception

    if (feature.prototype.arity == 1) this.perceiveAttr(target, feature);
    else if (feature.prototype.arity == 2) this.perceiveRel(scene, target, feature);
    else throw "only features with arity 1 or 2 are supported";
  }

  // var target;
  // var feature = this.ws.getRandomFeature();
  // var scene = this.ws.getRandomScene();
  // if (feature.prototype.targetType == 'group') {
  //   var hyp = this.ws.getRandomHypothesis({type: 'object'});
  //   target = this.ws.getOrCreateGroupBySelector(hyp.sel, scene);
  //   if (target.empty()) return; // TODO: decrease selector attention
  // } else if (feature.prototype.targetType == 'obj') {
  //   target = this.ws.getRandomObject(scene);
  // } else throw "unknown target type";

  // if (feature.prototype.arity == 1) this.perceiveAttr(target, feature);
  // else if (feature.prototype.arity == 2) this.perceiveRel(scene, target, feature);
  // else throw "only features with arity 1 or 2 are supported";
}