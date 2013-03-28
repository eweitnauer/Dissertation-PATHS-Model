/// Object being left or right to another object on a scale from 1 (very) to 0 (not at all).
BesideRelationship = function(obj, other) {
  this.name = "beside";
  this.arity = 2;
  this.symmetric = true;
  this.constant = false;
  this.perceive(obj, other);
}

BesideRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  var l_pos = SpatialRelationAnalyzer(100, 100/2/100, 'left').getMembership(obj, other);
  var r_pos = SpatialRelationAnalyzer(100, 100/2/100, 'right').getMembership(obj, other);
  var left = Math.max(0, l_pos[1]-r_pos[1]);
  var right = Math.max(0, r_pos[1]-l_pos[1]);
  this.val = Math.max(left, right);
}

BesideRelationship.prototype.get_activity = function() {
  return this.val == '?' ? 0 : this.val;
}

BesideRelationship.prototype.get_label = function() {
  return 'beside';
}