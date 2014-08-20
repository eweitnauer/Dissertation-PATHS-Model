/// Group attribute. Groups where each object is connected with each other object through
/// a sequence of objects that are no further than X from each other are close to the degree
/// close(X).
/// Groups with 1 or 0 objects are not close.
/// This is a Minimum Spanning Tree problem, and we'll use the Kruskal's algorithm to solve
/// it (see http://en.wikipedia.org/wiki/Kruskal%27s_algorithm).
CloseAttribute = function(group) {
  this.perceive(group);
}
CloseAttribute.prototype.key = "close";
CloseAttribute.prototype.targetType = 'group';
CloseAttribute.prototype.arity = 1;
CloseAttribute.prototype.constant = false;

CloseAttribute.prototype.perceive = function(group) {
  this.group = group;
  if (group.objs.length < 2) this.val = NaN;
  else {
    // var pobjs = group.objs.map(function (on) { return on.phys_obj });
    // var tgs = group.scene_node.oracle.getSpatialGroups(20 * group.objs[0].phys_scale, pobjs);
    // if (tgs.length == 1) this.val = 1;
    // else this.val = 0;
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

CloseAttribute.prototype.get_activity = function() {
  return (isNaN(this.val) ? 0 : CloseRelationship.membership(this.val));
}

CloseAttribute.prototype.get_label = function() {
  return 'close';
}

/// Nodes should be numbers, edges should be {a: node1, b: node2, dist: 1.34}.
CloseAttribute.getMST = function(nodes, edges) {
  var mst = [];
  var sets = nodes.map(function(node) { var s = {}; s[node] = true; return s });
  edges.sort(function(a,b) { return a.dist-b.dist} );
  for (var i=0; i<edges.length; i++) {
    var a = edges[i].a, b = edges[i].b;
    var idx_a, idx_b;
    for (var j=0; j<sets.length; j++) {
      if (a in sets[j]) idx_a = j;
      if (b in sets[j]) idx_b = j;
    }
    if (idx_a === idx_b) continue;
    mst.push(edges[i]);
    for (var key in sets[idx_b]) sets[idx_a][key] = true;
    sets[idx_b] = {};
  }
  return mst;
}
