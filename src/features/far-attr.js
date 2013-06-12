/// Group attribute. A group is as far as the smallest distance of
/// any two members is far. Groups with 1 or 0 objects are not far.
FarAttribute = function(group) {
  this.perceive(group);
}
FarAttribute.prototype.key = "far";
FarAttribute.prototype.constant = false;

FarAttribute.prototype.perceive = function(group) {
  this.group = group;
  if (group.objs.length < 2) this.val = NaN;
  else {
    this.val = Infinity;
    for (var i=1; i<group.objs.length; i++) for (var j=0; j<i; j++) {
      var dist = group.objs[i].phys_obj.distance(group.objs[j].phys_obj) / group.objs[0].phys_scale;
      if (this.val > dist) this.val = dist;
    }
  }
}

FarAttribute.prototype.get_activity = function() {
  return isNaN(this.val) ? 0 : FarRelationship.membership(this.val);
}

FarAttribute.prototype.get_label = function() {
  return 'far';
}