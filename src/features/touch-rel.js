TouchRelationship = function(obj, other) {
  this.perceive(obj, other);
}
TouchRelationship.prototype.key = "touch";
TouchRelationship.prototype.arity = 2;
TouchRelationship.prototype.symmetric = true;
TouchRelationship.prototype.constant = false;

TouchRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  var dist = obj.phys_obj.distance(other.phys_obj);
  this.val = (dist <= 0) ? 1 : 0;
}

TouchRelationship.prototype.get_activity = function() {
  return this.val == '?' ? 0 : this.val;
}

TouchRelationship.prototype.get_label = function() {
  return 'touches';
}