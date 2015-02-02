var CheckHypothesisCodelet = function(coderack, hyp) {
  this.coderack = coderack;
  this.ws = this.coderack.ws;
  this.followup = [];
  this.hypothesis = hyp;
}

CheckHypothesisCodelet.prototype.name = 'CheckHypC';

CheckHypothesisCodelet.prototype.describe = function() {
  return 'CheckHypothesisCodelet';
}

CheckHypothesisCodelet.updateObjectSelectorArrays = function(groups, sel) {
  for (var i=0; i<groups.length; i++) {
    for (var j=0; j<groups[i].objs.length; j++) {
      var on = groups[i].objs[j].object_node;
      // the following check should be needed for the blank selector only, which
      // is initially applied to all scenes, as all other selectors are only
      // applied once to each scene and their result gets cached
      if (on.selectors.indexOf(sel) !== -1) throw "duplicate selector!";
      on.selectors.push(sel);
    }
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
  if (!hyp) return false;
  this.ws.log(3, 'checking hyp "'+ hyp.describe()+'"');

  var scenes = this.ws.getActiveScenePair();
  var selected_groups = hyp.checkScenePair(scenes, this.ws.scene_pair_index);
  if (hyp.main_side === 'fail') {
    return true;
  }
  CheckHypothesisCodelet.updateObjectSelectorArrays(selected_groups, hyp.sel);

  if (hyp.isSolution(this.ws.scene_pair_sequence.length)) this.ws.addSolution(hyp);

  return true;
}
