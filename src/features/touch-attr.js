/// Group attribute. A group is touching if all objects in the group are connected
/// to each other by a sequence of touching objects. Groups with 1 or 0 objects are
/// not touching.
TouchAttribute = function(group) {
  this.perceive(group);
}
TouchAttribute.prototype.key = "touching";
TouchAttribute.prototype.constant = false;

TouchAttribute.prototype.perceive = function(group) {
  this.group = group;
  if (group.objs.length < 2) this.val = 0;
  else {
    var nodes = [];
    for (var i=0; i<group.objs.length; i++) { nodes.push(i) }
    var edges = [], scale = group.objs[0].phys_scale;
    for (var i=1; i<group.objs.length; i++) for (var j=0; j<i; j++) {
      edges.push({a:i, b:j, dist: group.objs[i].phys_obj.distance(group.objs[j].phys_obj) / scale});
    };
    var mst = CloseAttribute.getMST(nodes, edges);
    // the last edge in the MST has the bigges distance
    this.val = mst[mst.length-1].dist;
  }
}

TouchAttribute.prototype.get_activity = function() {
  return (isNaN(this.val) ? 0 : TouchRelationship.membership(this.val));
}

TouchAttribute.prototype.get_label = function() {
  return 'touching';
}