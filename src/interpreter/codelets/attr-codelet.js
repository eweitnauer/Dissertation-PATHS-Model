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
  var percept = target.getFromCache(feature.prototype.key, {time: this.time});
  if (!percept) percept = target.get(feature.prototype.key, {time: this.time});
  if (this.isActive(percept)) {
    this.spawnNewSelCodelet(percept, this.time);
  }
}

AttrCodelet.prototype.perceiveRel = function(scene, target_obj, feature) {
  if (scene.objs.length < 2) {
    this.ws.blockFeature(feature);
    return;
  }
  var other;
  do other = this.ws.getRandomObject(scene); while(other === target_obj);
  percept = target_obj.getFromCache(feature.prototype.key, {other: other, time: this.time});
  if (!percept) percept = target_obj.get(feature.prototype.key, {other: other, time: this.time});
  if (percept && percept.get_activity() > pbpSettings.activation_threshold) {
    this.spawnNewSelCodelet(percept, this.time);
  }
}

AttrCodelet.prototype.run = function() {
  var target;
  var feature = this.ws.getRandomFeature();
  var scene = this.ws.getRandomScene();
  if (feature.prototype.targetType == 'group') {
    var hyp = this.ws.getRandomHypothesis({type: 'object'});
    target = this.ws.getOrCreateGroupBySelector(hyp.sel, scene);
    if (target.empty()) return; // TODO: decrease selector attention
  } else if (feature.prototype.targetType == 'obj') {
    target = this.ws.getRandomObject(scene);
  } else throw "unknown target type";

  if (feature.prototype.arity == 1) this.perceiveAttr(target, feature);
  else if (feature.prototype.arity == 2) this.perceiveRel(scene, target, feature);
  else throw "only features with arity 1 or 2 are supported";
}