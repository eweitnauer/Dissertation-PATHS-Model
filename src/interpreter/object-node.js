/// Copyright by Erik Weitnauer, 2012.

/// An ObjectNode represents a single object. Pass the object (shape) it represents
/// and the SceneNode it is part of.
ObjectNode = function(scene_node, obj) {
	this.obj = obj; obj.object_node = this;
  this.scene_node = scene_node;
	this.times = {};
}

/// list of all possible object attributes
ObjectNode.attrs = pbpSettings.obj_attrs;

/// list of all possible object relations
ObjectNode.rels = pbpSettings.obj_rels;


/// Returns true if there is the passed relation type with the passed activity
/// with the passed other object node.
ObjectNode.prototype.hasRelation = function(key, time, active, other) {
  if (!(time in this.times)) return false;
  if (!(key in ObjectNode.rels) || !(key in this.times[time])) return false;
  return this.times[time][key].some((function(rel) {
    return rel.other === other.obj && (rel.get_activity() >= pbpSettings.activation_threshold) == active;
  }).bind(this));
};

/// Perceives all object attributes and all relations to all other objects
/// in the scene at the current situation and saves the results under the
/// passed time.
ObjectNode.prototype.perceive = function(time) {
  var res = {};
  for (var a in ObjectNode.attrs) {
    var attr = ObjectNode.attrs[a];
    res[a] = new attr(this.obj, this.scene_node);
  }
  for (var r in ObjectNode.rels) {
    var rel = ObjectNode.rels[r];
    res[r] = [];
    var objs = this.scene_node.objs;
    for (var i=0; i<objs.length; i++) {
      if (objs[i] == this) continue;
      if (typeof(GroupNode) != 'undefined' && objs[i] instanceof GroupNode) {
        if (rel.ObjectToGroup) res[r].push(rel.ObjectToGroup(this.obj, objs[i].objs, this.scene_node));
      } else if (objs[i] instanceof ObjectNode) {
        res[r].push(new rel(this.obj, objs[i].obj, this.scene_node));
      }
    }
    if (res[r].length == 0) delete res[r];
  }
  this.times[time] = res;
}

/// Returns the attribute or relation for the passed time (default is 'start'). If it was not
/// perceived yet, it is perceived now.
ObjectNode.prototype.get = function(key, time, other) {
  time = time || 'start';
  if ((time in this.times) && (key in this.times[time])) return this.times[time][key];
  // need to perceive it
  this.scene_node.oracle.gotoState(time);
  if (!(time in this.times)) this.times[time] = {};
  if (key in ObjectNode.attrs) return this.times[time][key] = new ObjectNode.attrs[key](this.obj, this.scene_node);
  else if (key in ObjectNode.rels) return this.times[time][key] = new ObjectNode.rels[key](this.obj, other.obj);
}

/// Returns a human readable description of the active attribute and relationship labels for
/// each object at each of the recorded times. If there are two times, 'start' and 'end', values
/// that don't change are summarized and shown first.
ObjectNode.prototype.describe = function(prefix) {
  prefix = prefix || '';
  var res = [prefix + 'Obj. ' + this.obj.id + ':'];
  var times = d3.keys(this.times);
  // special handling when just start and end time are known
  // if (times.length == 2 && times.indexOf('start') != -1 && times.indexOf('end') != -1) {
  //   var both=[], start=[], end=[];
  //   for (var a in ObjectNode.attrs) {
  //     var attr0 = this.times.start[a], attr1 = this.times.end[a];
  //     if (!attr0 || !attr1) continue;
  //     var vals = [(attr0.get_activity() >= 0.5) ? attr0.get_label() : '',
  //                 (attr1.get_activity() >= 0.5) ? attr1.get_label() : ''];
  //     if (vals[0] == '' && vals[1] == '') continue;
  //     if (vals[0] == '') end.push(vals[1])
  //     else if (vals[1] == '') start.push(vals[0])
  //     else if (vals[0] == vals[1]) both.push(vals[0]);
  //     else both.push(vals[0] + "==>" + vals[1]);
  //   }
  //   for (var r in ObjectNode.rels) {
  //     var rels0 = this.times.start[r], rels1 = this.times.end[r];
  //     if (!rels0 || !rels1) continue;
  //     for (var i=0; i<rels0.length; i++) {
  //       if (!rels0[i] || !rels1[i]) continue;
  //       var vals = [(rels0[i].get_activity() >= 0.5) ? rels0[i].get_label() : '',
  //                   (rels1[i].get_activity() >= 0.5) ? rels1[i].get_label() : '']
  //       if (vals[0] == '' && vals[1] == '') continue;
  //       if (vals[0] == '') end.push(vals[1] + ' ' + rels1[i].other.id)
  //       else if (vals[1] == '') start.push(vals[0] + ' ' + rels0[i].other.id)
  //       else if (vals[0] == vals[1]) both.push(vals[0] + ' ' + rels0[i].other.id);
  //       else both.push(vals[0] + "==>" + vals[1] + ' ' + rels0[i].other.id);
  //     }
  //   }
  //   res.push(prefix + '  ' + both.join(', ') + ' START: ' + start.join(', ') + ' END: ' + end.join(', '));
  // } else {
    for (var time in this.times) res.push(prefix + this.describeState(time, '  '));
//  }
  return res.join("\n");
}

/// Returns a human readable description of the passed time (see the `describe` method).
ObjectNode.prototype.describeState = function(time, prefix) {
  prefix = prefix || '';
  var out = [];
  for (var a in ObjectNode.attrs) {
    var attr = this.times[time][a];
    if (!attr) continue;
    var active = attr.get_activity() >= 0.5;
    out.push((active ? '' : '!') + attr.get_label());
  }
  for (var r in ObjectNode.rels) {
    var rels = this.times[time][r];
    if (!rels) continue;
    for (var i=0; i<rels.length; i++) {
      if (!rels[i]) continue;
      var active = rels[i].get_activity() >= 0.5;
      out.push((active ? '' : '!') + rels[i].get_label() + ' ' + rels[i].other.id);
    }
  }
  return prefix + time + ": " + out.join(', ');
};