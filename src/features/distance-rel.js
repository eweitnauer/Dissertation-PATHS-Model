DistanceRelationship = function(obj, other) {
  this.name = "distance";
  this.arity = 2;
  this.symmetric = true;
  this.constant = false;
  this.val = '?';
  this.obj = obj;
  this.other = other;
}

DistanceRelationship.membership = function(label, dist) {
  if (label == 'near') return dist > 50 ? 0 : 1-(dist/50);
  if (label == 'far')  return dist < 10 ? 0 : (dist > 60 ? 1 : (dist-10)/50);
}

DistanceRelationship.perceive = function(obj, other) {
  var dr = new DistanceRelationship(obj, other);
  dr.val = obj.phys_obj.distance(other.phys_obj) / obj.phys_scale;
  dr.near = DistanceRelationship.membership('near', dr.val);
  dr.far = DistanceRelationship.membership('far', dr.val)
  return dr;
}

DistanceRelationship.prototype.get_activity = function() {
  return Math.max(this.near, this.far);
}

DistanceRelationship.prototype.get_label = function() {
  return this.near > this.far ? 'near' : 'far';
}