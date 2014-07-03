HitsRelationship = function(obj, other) {
  this.perceive(obj, other);
}
HitsRelationship.prototype.key = "hits";
HitsRelationship.prototype.targetType = 'obj';
HitsRelationship.prototype.arity = 2;
HitsRelationship.prototype.symmetric = false;
HitsRelationship.prototype.constant = false;

HitsRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  this.collisions = obj.object_node.scene_node.collisions.filter(
  	function (coll) { return coll.a === obj && coll.b === other }
  );
  // save the speed of the strongest collision in val
  this.val = this.collisions.length == 0 ? 0
             : d3.max(this.collisions, function (coll) { return coll.dv });
}

HitsRelationship.prototype.get_activity = function() {
  return this.val == 0 ? 0 : 1;
}

HitsRelationship.prototype.get_label = function() {
  return 'hits';
}