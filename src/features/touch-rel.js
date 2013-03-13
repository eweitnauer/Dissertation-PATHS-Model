TouchRelationship = function(obj, other) {
  this.name = "touches";
  this.arity = 2;
  this.obj = obj;
  this.other = other;
  this.symmetric = true;
  this.constant = false;
  this.val = '?';
}

TouchRelationship.perceive = function(obj, other) {
  var attr = new TouchRelationship(obj, other);
  var dist = obj.phys_obj.distance(other.phys_obj);
  attr.val = (dist <= 0) ? 1 : 0;
  return attr;
}

TouchRelationship.prototype.get_activity = function() {
  return this.val == '?' ? 0 : this.val;
}

TouchRelationship.prototype.get_label = function() {
  return 'touches';
}