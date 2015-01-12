/// Copyright by Erik Weitnauer, 2012.

/// An ObjectNode represents a single object. Pass the object (shape) it represents
/// and the SceneNode it is part of.
ObjectNode = function(scene_node, obj) {
	this.obj = obj; obj.object_node = this;
  this.scene_node = scene_node;
	this.times = {};
  this.selectors = []; // selectors that match this object
}

/// list of all possible object attributes
ObjectNode.attrs = pbpSettings.obj_attrs;

/// list of all possible object relations
ObjectNode.rels = pbpSettings.obj_rels;

/// The ObjectNode will send 'perceived' and 'retrieved' events
/// {percept, target, other, time}.
ObjectNode.events = d3.dispatch('perceived', 'retrieved');

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

/// Dynamically retrieves and caches an attribute or feature. Optionally pass the time
/// as `time` field in the `opts` object. When getting a relationship feature, pass the
/// other ObjectNode as `other` field in `opts`.
/// To just get a perception from the cache and return false if its not there, put
/// `cache_only: true` in the `opts`.
ObjectNode.prototype.get = function(key, opts) {
  if (key in ObjectNode.attrs) return this.getAttr(key, opts);
  else if (key in ObjectNode.rels) return this.getRel(key, opts);
  else throw "unknown feature '" + key + "'";
}

/// Only return cached perceptions that are marked as deliberate.
ObjectNode.prototype.getDeliberateOnly = function(key, opts) {
  opts = opts || {};
  opts.deliberate_only = true;
  return this.get(key, opts);
}

/// Only return cached perceptions that are marked as deliberate.
ObjectNode.prototype.getDeliberately = function(key, opts) {
  opts = opts || {};
  opts.set_deliberate = true;
  return this.get(key, opts);
}

/// Returns the attribute named `key`. If given, the `time` in the `opts` object is used,
/// otherwise the current state of the oracle is used. If the oracle is in no named state,
/// the perceived attribute is not cached, otherwise its returned if in cache or perceived,
/// cached and returned if not in cache.
/// Results will not be cached if 'dont_cache' is ture in opts.
ObjectNode.prototype.getAttr = function(key, opts) {
  var o = PBP.extend({}, opts);
  // if time was not passed, use the current state of the oracle
  if (!o.time) o.time = this.scene_node.oracle.curr_state;
  if (ObjectNode.attrs[key].constant) o.time = 'start';
  // if the attr is cached, just return it
  if ((o.time in this.times) && (key in this.times[o.time])) {
    var res = this.times[o.time][key];
    if (o.deliberate_only && !res.deliberate) return false;
    if (o.set_deliberate) res.deliberate = true;
    ObjectNode.events.retrieved({ percept: res, target: this, time: o.time
                                , deliberate: o.set_deliberate
                                , only_checking : o.deliberate_only || o.cache_only });
    return res;
  }
  if (o.cache_only || o.deliberate_only) return false;
  // otherwise, goto the state and perceive it
  if (o.time) this.scene_node.oracle.gotoState(o.time);
  var res = new ObjectNode.attrs[key](this.obj);
  // cache it, if the state is a known one
  if (o.time && !o.dont_cache) {
    if (!this.times[o.time]) this.times[o.time] = {};
    this.times[o.time][key] = res;
  }
  if (o.set_deliberate) res.deliberate = true;
  ObjectNode.events.perceived({percept: res, target: this, time: o.time
                              , deliberate: o.set_deliberate});
  return res;
}

/// Returns the relationship named `key` with the `other` object node in the `opts` object.
/// If given, the `time` in the `opts` object is used,
/// otherwise the current state of the oracle is used. If the oracle is in no named state,
/// the perceived relationship is not cached, otherwise its returned if in cache or perceived,
/// cached and returned if not in cache.
/// If opts.get_all is set, the method will return an array of all relationships
/// that were perceived for the object so far. Use only in combination with opts.cache_only!
/// Results will not be cached if 'dont_cache' is ture in opts.
ObjectNode.prototype.getRel = function(key, opts) {
  var o = PBP.extend({}, opts);
  // if time was not passed, use the current state of the oracle
  if (!o.time) o.time = this.scene_node.oracle.curr_state;
  if (ObjectNode.rels[key].constant) o.time = 'start';
  // if the rel is cached, return it
  if ((o.time in this.times) && (key in this.times[o.time])) {
    var cache = this.times[o.time][key];
    if (o.get_all) return (o.deliberate_only
                          ? cache.filter(function(perc) { return perc.deliberate; })
                          : cache);
    var res = cache.filter(function (rel) { return rel.other === o.other.obj })[0];
    if (res) {
      if (o.deliberate_only && !res.deliberate) return false;
      if (o.set_deliberate) res.deliberate = true;
      ObjectNode.events.retrieved({ percept: res, target: this, time: o.time
                                  , deliberate: o.set_deliberate, other: o.other
                                  , only_checking : o.deliberate_only || o.cache_only });
      return res;
    }
  }
  if (o.cache_only || o.deliberate_only) return o.get_all ? [] : false;
  // otherwise, goto the state and perceive it
  if (o.time) this.scene_node.oracle.gotoState(o.time);
  var res = new ObjectNode.rels[key](this.obj, o.other.obj);
  // cache it, if the state is a known one
  if (o.time && !o.dont_cache) {
    if (!this.times[o.time]) this.times[o.time] = {};
    if (!this.times[o.time][key]) this.times[o.time][key] = [];
    this.times[o.time][key].push(res);
  }
  if (o.set_deliberate) res.deliberate = true;
  ObjectNode.events.perceived({ percept: res, target: this, time: o.time
                              , deliberate: o.set_deliberate, other: o.other});
  return res;
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
    var res = (active ? '' : '!') + attr.get_label();
    out.push(attr.deliberate ? res : '('+res+')');
  }
  for (var r in ObjectNode.rels) {
    var rels = this.times[time][r];
    if (!rels) continue;
    for (var i=0; i<rels.length; i++) {
      if (!rels[i]) continue;
      var active = rels[i].get_activity() >= 0.5;
      var res = (active ? '' : '!') + rels[i].get_label() + rels[i].other.id;
      out.push(rels[i].deliberate ? res : '('+res+')');
    }
  }
  return prefix + time + ": " + out.join(', ');
};
