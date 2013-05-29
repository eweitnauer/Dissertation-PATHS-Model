/// Copyright by Erik Weitnauer, 2013.

/// A SceneNode is a collection of several objects.
SceneNode = function(scene, oracle) {
  this.scene = scene;
  this.oracle = oracle;
  this.objs = [];      // list of objects or groups in the scene
  this.ground = null;
  this.frame = null;
  this.collisions = []; // list of collisions
  this.times = ['start', 'end'];
  this.init();
}

SceneNode.prototype.init = function() {
  var movables = [], shapes = this.scene.shapes;
  for (var i=0; i<shapes.length; i++) {
    if (shapes[i].movable) movables.push(shapes[i]);
    else if (shapes[i].id == '_') this.ground = shapes[i];
    else if (shapes[i].id == '|') this.frame = shapes[i];
  }
}

SceneNode.prototype.perceiveCollisions = function() {
  this.oracle.gotoState("start");
  this.collisions = this.oracle.observeCollisions();
  // replace physical objects with shapes
  for (var i=0; i<this.collisions.length; i++) {
    this.collisions[i].a = this.collisions[i].a.master_obj;
    this.collisions[i].b = this.collisions[i].b.master_obj;
  }
}

/// Returns an SceneNode instance, which is the perception of the passed scene.
/// For now brute force: All movable objects in the scene are automatically
/// with all their attributes and relationships with each other for one snapshot
/// at the beginning and one snapshot at the end of time.
SceneNode.prototype.perceiveAll = function() {
  this.perceiveCollisions();
  for (var t=0; t<this.times.length; t++) {
    this.oracle.gotoState(this.times[t]);
    this.perceiveCurrent(this.times[t]);
  }
}

SceneNode.prototype.perceiveCurrent = function(state_name) {
  state_name = state_name || 'current';
  var movables = this.scene.shapes.filter(function(s) { return s.movable });
  for (var i=0; i<movables.length; i++) {
    if (!this.objs[i]) this.objs.push(new ObjectNode(this, movables[i]));
  }
  for (var i=0; i<this.objs.length; i++) this.objs[i].perceive(state_name);
}

/// Returns a human readable description of the scene.
SceneNode.prototype.describe = function(prefix) {
  prefix = prefix || '';
  var res = [prefix+'Objects:'];
  for (var i=0; i<this.objs.length; i++) {
    res.push(this.objs[i].describe(prefix+'  '));
  };
  res.push(prefix+'Collisions:');
  for (var i=0; i<this.collisions.length; i++) {
    var c = this.collisions[i];
    res.push(prefix + '  ' + c.a.id + ' hits ' + c.b.id);
  };
  return res.join("\n");
}