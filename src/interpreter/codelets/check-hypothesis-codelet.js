var CheckHypothesisCodelet = function(coderack, hyp) {
    this.coderack = coderack;
    this.ws = this.coderack.ws;
    this.followup = [];
    this.hypothesis = hyp;
  }

CheckHypothesisCodelet.prototype.describe = function() {
  return 'CheckHypothesisCodelet';
}

CheckHypothesisCodelet.prototype.getAttFromHypothesis = function(hyp) {
  var vals = this.ws.options.attention.sel.match;
  if (!vals) return 0;
  var val = vals[hyp.main_side];
  if (this.ws.options.attention.sel.single && hyp.selects_single_objs)
    val += this.ws.options.attention.sel.single;
  return val;
}

CheckHypothesisCodelet.prototype.run = function() {
  var hyp = this.hypothesis;
  var options = this.ws.options;
  var scene_pair_id = this.ws.scene_pair_index;
  if (!hyp) {
    // get a hypothesis that was not matched against the current scene pair yet
    hyp = this.ws.getRandomHypothesis({no_blank: true, filter:
      function(sol) {
        return (!sol.wasMatchedAgainst(scene_pair_id))
      }
    });
  }
  if (!hyp) return;

  var selected_groups = hyp.checkScenePair( this.ws.getActiveScenePair()
                                          , this.ws.scene_pair_index);
  if (hyp.main_side === 'fail') this.ws.blockHypothesis(hyp);
  else {
    if (hyp.isSolution(this.ws.scene_pair_sequence.length)) this.ws.addSolution(hyp);
    var self = this;
    var d_att = this.getAttFromHypothesis(hyp);
    this.ws.changeAttention(hyp, d_att);
    var hyp_att = this.ws.getAttention(hyp)
    if (options.attention.obj.from_sel) {
      selected_groups.forEach(function(group) {
        self.ws.changeAttention(group, hyp_att * options.attention.obj.from_sel);
      });
    }
  }
}