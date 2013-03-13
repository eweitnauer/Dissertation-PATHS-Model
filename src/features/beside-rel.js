/// Object being left or right to another object on a scale from 1 (very) to 0 (not at all).
BesideRelationship = function(obj, other) {
  this.type = "metric";
  this.name = "beside-of";
  this.arity = 2;
  this.obj = obj;
  this.other = other;
  this.symmetric = true;
  this.val = '?';
}

BesideRelationship.perceive = function(obj, other) {
  var attr = new BesideRelationship(obj, other);
  var l = LeftRelationship.perceive(obj, other).get_activity();
  var r = RightRelationship.perceive(obj, other).get_activity();
  attr.val = Math.max(l-r, r-l);
  return attr;
}

BesideRelationship.prototype.get_activity = function() {
  return this.val == '?' ? 0 : this.val;
}

BesideRelationship.prototype.get_label = function() {
  return 'beside-of';
}