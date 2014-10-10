var CheckHypothesisCodelet = function(coderack, hyp) {
    this.coderack = coderack;
    this.ws = this.coderack.ws;
    this.followup = [];
    this.hypothesis = hyp;
  }

CheckHypothesisCodelet.prototype.describe = function() {
  return 'CheckHypothesisCodelet';
}

CheckHypothesisCodelet.prototype.side_map = { 'left' : 'one_side', 'right': 'one_side'
  , 'both': 'both_sides', 'fail': 'fail' };

CheckHypothesisCodelet.prototype.getDeltaAttForHypothesis = function(hyp, specificity) {
  var val;
  if (hyp.matchedAgainst.length === 1) val = this.ws.options.attention.sel.initial;
  else val = this.ws.options.attention.sel.update;

  val = val[this.side_map[hyp.main_side]];
  val += specificity * this.ws.options.attention.sel.specificity;
  console.log('sel specificity boost', specificity * this.ws.options.attention.sel.specificity);
  return val;
}

CheckHypothesisCodelet.prototype.getSpecificity = function(scenes, groups) {
  var sum = 0;
  for (var i=0; i<groups.length; i++) {
    if (groups[i].empty()) continue;
    sum += 1-groups[i].objs.length/scenes[i].objs.length;
  }
  return sum/scenes.length;
}

CheckHypothesisCodelet.prototype.updateAttention = function(hyp, specificity, sel_groups) {
  var options = this.ws.options;
  var d_att = this.getDeltaAttForHypothesis(hyp, specificity);
  this.ws.changeAttention(hyp, d_att);
  d_att *= options.attention.obj.from_sel_scale;
  for (var i=0; i<sel_groups.length; i++) {
    this.ws.changeAttention(sel_groups[i], d_att);
  }
}

CheckHypothesisCodelet.prototype.run = function() {
  var hyp = this.hypothesis;
  var options = this.ws.options;
  var scene_pair_id = this.ws.scene_pair_index;
  if (!hyp) {
    // get a hypothesis that was not matched against the current scene pair yet
    hyp = this.ws.getRandomHypothesis({filter:
      function(sol) {
        return (!sol.wasMatchedAgainst(scene_pair_id))
      }
    });
  }
  if (!hyp) return;

  var scenes = this.ws.getActiveScenePair();
  var selected_groups = hyp.checkScenePair(scenes, this.ws.scene_pair_index);
  if (hyp.main_side === 'fail') {
    this.ws.blockHypothesis(hyp);
    return;
  }

  if (hyp.isSolution(this.ws.scene_pair_sequence.length)) this.ws.addSolution(hyp);

  var specificity = this.getSpecificity(scenes, selected_groups);
  this.updateAttention(hyp, specificity, selected_groups);
}