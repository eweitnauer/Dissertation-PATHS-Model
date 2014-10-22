/// The coderack is an array of codelets. Insert new ones with insert().
/// Call the step() method for running all behaviors and a random codelet
/// chosen based on codelet urgency values.
var Coderack = function(workspace) {
  this.max_length = 50;
  this.behaviors = [];
  this.followups = []; // these are done first and in order
  this.ws = workspace;

  this.cdl_stats = this.createStats();
  this.init();
}
Coderack.prototype = [];

Coderack.prototype.init = function() {
  var self = this;
  this.ws.events.on('switched_scenes', function() {
    self.cdl_stats[AttrCodelet.prototype.name].activity += 0.1;
    self.cdl_stats[CheckHypothesisCodelet.prototype.name].activity += 0.1;
  });
}

Coderack.prototype.codeletFinished = function(codelet, res) {
  var stat = this.cdl_stats[codelet.name];
  if (res) stat.success++;
  else stat.failure++;
  stat.activity = Math.min(1, Math.max(0.1, stat.activity + (res ? 0.015 : -0.01)));
}

Coderack.prototype.createStats = function() {
  var cdls = [ AttrCodelet, NewHypothesisCodelet, CheckHypothesisCodelet
             , CombineHypothesisCodelet];
  var res = {};
  cdls.forEach(function(cdl) {
    res[cdl.prototype.name] = { success: 0, failure: 0, name: cdl.prototype.name
                              , activity: 0.5 } });
  return res;
}

Coderack.prototype.step = function() {
  this.ws.step++;
  this.ws.scene_pair_steps++;
  if (this.followups.length === 0) this.runBehaviors();
  this.runCodelet();
  this.ws.attentionNet.clamp('solutions', 0, 1, 0.001);
  this.ws.attentionNet.clamp('features', 0.1, 1, 0.001);
  // this.ws.attentionNet.normalize('features', 0.1, 1);
  this.ws.attentionNet.normalize('objects');
}

/// Default urgency is 10. Urgency must be above 0.
Coderack.prototype.insert = function(codelet, urgency) {
  codelet.urgency = urgency || 10;
  this.push(codelet);
  this.ws.log(4, 'inserted',codelet.describe(),'with urgency',codelet.urgency);
  // forget the oldest elements if we have too many
  if (this.length > this.max_length) {
    this.splice(0, this.max_length-this.length);
  }
}

Coderack.prototype.describe = function() {
  if (this.length === 0) return 'empty coderack';
  var typeMap = {};
  this.forEach(function (codelet) {
    var type = codelet.name;
    if (type in typeMap) typeMap[type]++;
    else typeMap[type] = 1;
  });
  var str=[];
  for (var type in typeMap) { str.push(type + ": " + typeMap[t]) }
  return 'coderack: ' + str.join(', ');
}

/// Select next codelet based on their urgencies.
Coderack.prototype.select = function() {
  if (this.length === 0) return null;
  return Random.pick_weighted(this, function(c) { return c.urgency });
};

/// Select next codelet based on their urgencies.
Coderack.prototype.select_and_remove = function() {
  if (this.length === 0) return null;
  var idx = Random.weighted(this.map(function(c) { return c.urgency }));
  return this.splice(idx, 1)[0];
};

Coderack.prototype.runBehaviors = function() {
  var thiz = this;
  this.behaviors.forEach(function(behavior) {
    thiz.ws.log(4, 'running', behavior.name);
    behavior.run();
  });
}

Coderack.prototype.runCodelet = function() {
  var cdl;
  if (this.followups.length > 0) {
    this.ws.log(4, 'running followup');
    cdl = this.followups.shift();
  } else {
    if (this.length===0) { this.ws.log(2, 'no codelet to run'); return false }
    cdl = this.select_and_remove();
  }
  this.ws.log(3, 'running', cdl.describe());
  var res = cdl.run();
  this.codeletFinished(cdl, res);

  if (res && cdl.followup && cdl.followup.length > 0) {
    while (cdl.followup.length > 0) this.insert(cdl.followup.shift(), cdl.urgency);
  }
}