GetsHitRelationship = function(obj, other) {
  this.perceive(obj, other);
}
GetsHitRelationship.prototype.key = "gets_hit";
GetsHitRelationship.prototype.arity = 2;
GetsHitRelationship.prototype.symmetric = false;
GetsHitRelationship.prototype.constant = false;

GetsHitRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  this.collisions = obj.object_node.scene_node.collisions.filter(
  	function (coll) { return coll.b === obj && coll.a === other }
  );
  // save the speed of the strongest collision in val
  this.val = this.collisions.length == 0 ? 0
             : d3.max(this.collisions, function (coll) { return coll.dv });
}

GetsHitRelationship.prototype.get_activity = function() {
  return this.val == 0 ? 0 : 1;
}

GetsHitRelationship.prototype.get_label = function() {
  return 'gets-hit-by';
}