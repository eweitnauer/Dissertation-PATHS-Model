/// Object is on top of another object if it is above and touches it.
OnTopRelationship = function(obj, other) {
  this.name = "on-top-of";
  this.arity = 2;
  this.obj = obj;
  this.other = other;
  this.symmetric = false;
  this.constant = false;
  this.val = '?';
}

OnTopRelationship.perceive = function(obj, other) {
  var rel = new OnTopRelationship(obj, other);
  rel.val = TouchRelationship.perceive(obj, other).val * AboveRelationship.perceive(obj, other).val[1];
  return rel;
}

OnTopRelationship.prototype.get_activity = function() {
  return this.val == '?' ? 0 : this.val;
}

OnTopRelationship.prototype.get_label = function() {
  return 'on-top-of';
}