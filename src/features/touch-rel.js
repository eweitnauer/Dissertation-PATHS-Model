TouchRelationship = function(obj, other) {
  this.perceive(obj, other);
}
TouchRelationship.prototype.key = "touch";
TouchRelationship.prototype.arity = 2;
TouchRelationship.prototype.symmetric = true;
TouchRelationship.prototype.constant = false;

TouchRelationship.membership = function(dist) {
	console.log(dist);
	return dist <= 0.5 ? 1 : 0;
}

TouchRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  this.val = obj.phys_obj.distance(other.phys_obj) / obj.phys_scale;
}

TouchRelationship.prototype.get_activity = function() {
  return TouchRelationship.membership(this.val);
}

TouchRelationship.prototype.get_label = function() {
  return 'touches';
}