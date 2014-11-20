CollidesRelationship = function(obj, other) {
  this.perceive(obj, other);
}
CollidesRelationship.prototype.key = "collides";
CollidesRelationship.prototype.targetType = 'obj';
CollidesRelationship.prototype.arity = 2;
CollidesRelationship.prototype.symmetric = true;
CollidesRelationship.prototype.constant = true;

CollidesRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  this.collisions = obj.object_node.scene_node.collisions.filter(
  	function (coll) { return coll.a === obj && coll.b === other ||
                             coll.b === obj && coll.a === other }
  );
  // save the speed of the strongest collision in val
  this.val = this.collisions.length == 0 ? 0
             : d3.max(this.collisions, function (coll) { return coll.dv });
}

CollidesRelationship.prototype.get_activity = function() {
  return this.val == 0 ? 0 : 1;
}

CollidesRelationship.prototype.get_label = function() {
  return 'collides-with';
}
