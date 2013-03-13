/// A SceneNode is a collection of several objects.
SceneNode = function() {
  this.scene = null;
  this.parts = [];      // list of objects or groups in the scene
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
  sn.collisions = oracle.observeCollisions();
  // replace physical objects with shapes
  for (var i=0; i<sn.collisions.length; i++) {
    sn.collisions[i].a = sn.collisions[i].a.master_obj;
    sn.collisions[i].b = sn.collisions[i].b.master_obj;
  }
  var movables = scene.shapes.filter(function(s) { return s.movable });
  for (var s=0; s<sn.states.length; s++) {
    oracle.gotoState(sn.states[s]);
    oracle.synchShapes();
    for (var i = 0; i < movables.length; i++) {
      if (!sn.parts[i]) sn.parts.push(new ObjectNode());
      sn.parts[i].perceive(sn.states[s], movables[i], movables);
    };
  }
  return sn;
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