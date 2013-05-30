/// Object is on top of another object if it is above and touches it.
OnTopRelationship = function(obj, other) {
  this.perceive(obj, other);
}
OnTopRelationship.prototype.key = "on_top_of";
OnTopRelationship.prototype.arity = 2;
OnTopRelationship.prototype.symmetric = false;
OnTopRelationship.prototype.constant = false;

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