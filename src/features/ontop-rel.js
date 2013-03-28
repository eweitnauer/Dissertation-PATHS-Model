/// Object is on top of another object if it is above and touches it.
OnTopRelationship = function(obj, other) {
  this.name = "on-top-of";
  this.arity = 2;
  this.symmetric = false;
  this.constant = false;
  this.perceive(obj, other);
}

OnTopRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  this.val = (new TouchRelationship(obj, other)).val *
             (new AboveRelationship(obj, other)).val;
}

OnTopRelationship.prototype.get_activity = function() {
  return this.val == '?' ? 0 : this.val;
}

OnTopRelationship.prototype.get_label = function() {
  return 'on-top-of';
}