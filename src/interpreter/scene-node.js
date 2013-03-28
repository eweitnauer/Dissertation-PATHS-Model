/// A SceneNode is a collection of several objects.
SceneNode = function() {
  this.scene = null;
  this.parts = [];      // list of objects or groups in the scene
  this.ground = null;
  this.collisions = []; // list of collisions
  this.states = ['start', 'end'];
}

/// Returns an SceneNode instance, which is the perception of the passed scene.
/// For now brute force: All movable objects in the scene are automatically
/// with all their attributes and relationships with each other for one snapshot
/// at the beginning and one snapshot at the end of time.
SceneNode.perceive = function(scene, oracle) {
  var sn = new SceneNode();
  sn.scene = scene;
  sn.oracle = oracle;
  sn.collisions = oracle.observeCollisions();
  // replace physical objects with shapes
  for (var i=0; i<sn.collisions.length; i++) {
    sn.collisions[i].a = sn.collisions[i].a.master_obj;
    sn.collisions[i].b = sn.collisions[i].b.master_obj;
  }
  var movables = [];
  for (var i=0; i<scene.shapes.length; i++) {
    if (scene.shapes[i].movable) movables.push(scene.shapes[i]);
    else sn.ground = scene.shapes[i];
  };
  for (var s=0; s<sn.states.length; s++) {
    oracle.gotoState(sn.states[s]);
    for (var i = 0; i < movables.length; i++) {
      if (!sn.parts[i]) sn.parts.push(new ObjectNode(sn));
      sn.parts[i].perceive(sn.states[s], movables[i], movables);
    };
  }
  return sn;
}

SceneNode.prototype.perceiveCurrent = function(state_name) {
  state_name = state_name || 'current';
  var movables = this.scene.shapes.filter(function(s) { return s.movable });
  for (var i = 0; i < movables.length; i++) {
    if (!this.parts[i]) this.parts.push(new ObjectNode());
    this.parts[i].perceive(state_name, movables[i], movables);
  };
}

SceneNode.prototype.describe = function() {
  console.log('Objects:');
  for (var i=0; i<this.parts.length; i++) {
    this.parts[i].describe();
  };
  console.log('Collisions:');
  for (var i=0; i<this.collisions.length; i++) {
    var c = this.collisions[i];
    console.log(c.a.id, 'hits', c.b.id);
  };
}