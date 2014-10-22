/* jshint laxcomma: true, asi: true */
var PI = PI || {};

/*
Version 0.4.3
- bugfixes
- separate values for initial and consequitive attention update for selectors

Version 0.4.2
- We don't use solution codelets anymore. Instead, we keep track of which
left and right scenes each selector fits and if they all fit, its a solution!

Version 0.4.1
- shifting attention between scenes in a fixed scheme
- fixed a-priori probabilities for looking at start and end time
- instead of scaling to normalize attention values, we simply clamp them now
- don't set attention values directly, but only increase / decrease them in steps
- cooldown for all attention values

Version 0.4.0
- adding in attention mechanism for selectors:
  - initialize with attention value based on number of scenes matching
- adding in attention mechanism for objects:
  - spread attention from selectors to selected objects
  - add attention to objects with certain attributes (like moves)
  - add attention to objects in certain relationships (like hits)
  - spread attention from selectors to used features


PBP  2: [CountAttribute]
PBP  4: [ShapeAttribute]
PBP  8: [StabilityAttribute]
PBP 11: [CloseAttribute]
PBP 12: [OnTopRelationship, SmallAttribute]
PBP 13: [CountAttribute, OnGroundAttribute]
PBP 16: [RightRelationship, LeftRelationship, ShapeAttribute]
PBP 18: [TouchAttribute, TouchRelationship]
PBP 20: [SupportsRelationship, ShapeAttribute]
PBP 22: [HitsRelationship, CollidesRelationship]
PBP 26: [ShapeAttribute, LeftAttribute]
PBP 31: [MovableUpAttribute, ShapeAttribute]
*/

PI.v0_4_3 = (function() {
  var version = '0.4.3';
  var low = 0.1, mid = 0.2, high = 0.3;

  var options = {
    // features: [
    //             { klass: StabilityAttribute,   initial_activation: high }
    //           , { klass: SingleAttribute,      initial_activation: high }
    //           , { klass: MovesAttribute,       initial_activation: high }
    //           , { klass: TouchRelationship,    initial_activation: high }
    //           , { klass: CircleAttribute,      initial_activation: mid }
    //           , { klass: SquareAttribute,      initial_activation: mid }
    //           , { klass: TriangleAttribute,    initial_activation: mid }
    //           , { klass: RectangleAttribute,   initial_activation: mid }
    //             // , { klass: ShapeAttribute,       initial_activation: high }
    //           , { klass: CountAttribute,       initial_activation: mid }
    //           , { klass: CloseAttribute,       initial_activation: mid }
    //             // , { klass: CloseRelationship,    initial_activation: mid }
    //           , { klass: SmallAttribute,       initial_activation: mid }
    //             // , { klass: LargeAttribute,       initial_activation: mid }
    //           , { klass: TopMostAttribute,     initial_activation: mid }
    //             // , { klass: LeftMostAttribute,    initial_activation: low }
    //             // , { klass: RightMostAttribute,   initial_activation: low }
    //             // , { klass: FarRelationship,      initial_activation: low }
    //             // , { klass: FarAttribute,         initial_activation: low }
    //           , { klass: OnTopRelationship,    initial_activation: low }
    //           , { klass: OnGroundAttribute,    initial_activation: low }
    //           , { klass: RightRelationship,    initial_activation: low }
    //           , { klass: LeftRelationship,     initial_activation: low }
    //             // , { klass: AboveRelationship,    initial_activation: low }
    //             // , { klass: BelowRelationship,    initial_activation: low }
    //             // , { klass: BesideRelationship,   initial_activation: low }
    //             // , { klass: BottomAttribute,      initial_activation: low }
    //             // , { klass: TopAttribute,         initial_activation: low }
    //           , { klass: TouchAttribute,       initial_activation: low }
    //           , { klass: SupportsRelationship, initial_activation: low }
    //           , { klass: HitsRelationship,     initial_activation: low }
    //            // , { klass: GetHitsRelationship,     initial_activation: low }
    //           , { klass: CollidesRelationship, initial_activation: low }
    //           , { klass: LeftAttribute,        initial_activation: low }
    //           , { klass: RightAttribute,       initial_activation: low }
    //           , { klass: MovableUpAttribute,   initial_activation: low }
    //          ]
    features: [ { klass: SquareAttribute,       initial_activation: mid }
              // , { klass: RightRelationship,     initial_activation: low }
              , { klass: CircleAttribute,       initial_activation: mid }]

               // , { klass: SupportsRelationship, initial_activation: low }
               // , { klass: CountAttribute,       initial_activation: mid }
               // , { klass: CloseAttribute,       initial_activation: mid } ]
    // features: [ { klass: SquareAttribute,   initial_activation: low }
    //           , { klass: TriangleAttribute, initial_activation: low } ]
  , pres_mode: 'interleaved-sim-sim' // {blocked, interleaved} X {sim, dis} X {sim, dis}
  , pres_time: 100 // every x steps, switch to the next scene pair
  , perception:
    {
      pick_group: 0.3 // probability that a group (vs. an object) is picked as
                      // perception target when the target is picked first
    , pick_feature_fist: 0.25 // probability that the feature (vs. the target) is
                      // picked first during perception
    }
  , attention:
    { time: { start: 0.67, end: 0.33 }//{ start: 0.67, end: 0.33 }
    , sel: {
        initial: // initial attention for selectors based on first match
        {
          one_side: 0.4
        , both_sides: 0.2
        , fail: 0
        }
      , specificity: 0.1 // raise attention to selectors that match less than all objects per scene
      , update:       // raise attention according to which scenes where matched in a scene pair
        {
          one_side: 0.15
        , both_sides: 0.05
        , fail: 0
        }
      , complexity_penalty_steepness: 20 // posteriori is 1-1/(1+exp(cps*(0.25-complexity/10)))
      }
    , feature: {
        initial: 0.1
      , from_sel: 0.5 // scale that is applied when spreading attention from new selectors to features
    }
    , obj: {
        initial: 0.1
      , from_sel_scale: 0.2 // scale that is applied when spreading attention from new selectors to objects
      , attr_boost: { // only apply at time "start"
          moves: 0.3
        // , top_most: 0.1 // this & below: often will get boosted via sel.single, too
        // , single: 0.1
        // , left_most: 0.1
        // , right_most: 0.1
        }
      , rel_boost: { // only apply at time "start"
          hits: [0.2, 0]
        , collides: [0.1, 0.1]
        }
      }
    }
  };

  var createWorkspace = function(scenes, loglevel) {
    var ws = new Workspace(scenes, options, loglevel);
    ws.attentionNet.setComplexityPenaltySteepness(options.attention.sel.complexity_penalty_steepness);
    ws.coderack.behaviors.push(new MainBehavior(ws.coderack));
    return ws;
  }

  /// Will create Attr-, NewHypothesis-, RefineHypothesis-, and SolveCodelets. What is created
  /// next will depend on a "mindset" value: 0 is complete explore and 1 complete exploit
  /// behavior. For now it just creates one of the four codelet types with a preset and fixed
  /// probability.
  var MainBehavior = function(coderack, attrs) {
    this.cr = coderack;
    this.ws = coderack.ws;
    this.name = 'MainBehavior';
    this.mindset = 0.25;
    this.codelet_infos = [{klass: AttrCodelet, mindset: 0}
                         //,{klass: NewHypothesisCodelet, mindset: 0.5}
                         ,{klass: CheckHypothesisCodelet, mindset: 0.75 }
                         ,{klass: CombineHypothesisCodelet, mindset: 1}];
  }

  MainBehavior.prototype.describe = function() {
    return 'mindset: ' + this.mindset;
  }

  MainBehavior.prototype.run = function() {
    if (this.ws.scene_pair_steps > 50) {
      this.ws.advanceScenePair();
    }
    if (this.cr.length > 0) return;
    var mindset = this.mindset;
    var mindset_fit = function (cinfo) { return 1-Math.abs(cinfo.mindset-mindset) };
    var codelet_info = Random.pick_weighted(this.codelet_infos, mindset_fit);
    this.cr.insert(new codelet_info.klass(this.cr));
  }

  return { createWorkspace: createWorkspace
         , version: version
         };
})();
