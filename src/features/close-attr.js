/// Group attribute. A group is as close as the largest distance of
/// any member to the closest other member. Groups with 1 or 0 objects are
/// not close.
CloseAttribute = function(group) {
  this.perceive(group);
}
CloseAttribute.prototype.key = "close";
CloseAttribute.prototype.constant = false;

CloseAttribute.prototype.perceive = function(group) {
  this.group = group;
  if (group.objs.length < 2) this.val = NaN;
  else {
    this.val = 0;
    for (var i=1; i<group.objs.length; i++) for (var j=0; j<i; j++) {
      var dist = group.objs[i].phys_obj.distance(group.objs[j].phys_obj) / group.objs[0].phys_scale;
      if (this.val < dist) this.val = dist;
    }
  }
}

CloseAttribute.prototype.get_activity = function() {
  return isNaN(this.val) ? 0 : CloseRelationship.membership(this.val);
}

CloseAttribute.prototype.get_label = function() {
  return 'close';
}