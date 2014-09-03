/// Copyright by Erik Weitnauer, 2014.

/** Visualizes a scene as svg and augments it with information of a SceneNode.
 * It allows highlighting objects by tapping them and interacting with objects
 * by dragging them. It shows the current simulation time in the upper right
 * and shows controls for resetting, playing and pausing the simulation on
 * mouseover */
var SceneInteractor = function(physics_scene, scene_node, svg) {
	this.pscene = physics_scene;
	this.sn = scene_node;
	this.scene = scene_node.scene;
	this.svg = d3.select(svg);
	this.svgg = this.svg.append('g');
	this.width = 145;
	this.scaling = 1;
	this.selected = [];
	this.value_getter = null;
	this.group_getter = null;
	this.metric_color_scale = d3.scale.pow().exponent(1.5).domain([0, 100]).range(['white', 'red']);
	this.ordinal_color_scale = d3.scale.category10();
	this.highlight_mode = 'values'; // 'values' or 'groups' or 'none'

	this.step_interval = 1000/30;        // frequency of stepping the scene when playing in ms
  this.interaction_interval = 1000/30; // frequency of updating the mouse interaction in ms
  this.show_time = true;               // displays current time
  this.show_pos = false;               // displays mouse pos. in world coordinates
  this.playing = false;
  this.drawing = true;
  this.auto_pause = true;
  this.init();
  this.draw();
}

/// Reset all intervals.
SceneInteractor.prototype.release = function() {
  if (this.step_timer) clearInterval(this.step_timer);
  if (this.interaction_timer) clearInterval(this.interaction_timer);
  this.pscene.onWorldChange.removeListener(this.draw);
}

SceneInteractor.prototype.pause = function() {
  this.was_autopaused = false;
  if (!this.playing) return;
  clearInterval(this.step_timer);
  this.step_time = null;
  this.playing = false;
}

SceneInteractor.prototype.play = function() {
  if (this.playing) return;
  var self = this;
  self.was_autopaused = false;
  this.step_timer = setInterval(function() {
    self.pscene.step();
    if (self.auto_pause && self.pscene.countAwake() == 0) {
      self.pause();
      self.was_autopaused = true;
    }
  }, this.step_interval);
  this.playing = true;
}

SceneInteractor.prototype.toggle = function() {
  if (this.playing) this.pause();
  else this.play();
}

SceneInteractor.prototype.reset = function() {
  this.pscene.reset();
}

SceneInteractor.prototype.init = function() {
  var self = this;
  this.pscene.onWorldChange.addListener(function() { self.draw.apply(self) });

  // create text element for time
  this.text_el = this.svg.append('text')
                     .style('text-anchor', 'end')
                     .style('dominant-baseline', 'hanging')
                     .style('font-family', 'Lato')
                     .style('font-size', 10)
                     .style('fill', '#85A1C8')
                     .attr({x: this.width-5, y: 5});

	// setup mouse interaction
  this.mouseDown = false;
  this.mousePoint = new b2Vec2(0,0);
  this.svg.style('pointer-events', 'all');
  this.svg.on("mousemove", function() {
    self.handleMouseMove.apply(self, arguments);
  }, true);
  this.svg.on("mousedown", function() {
    self.mouseDown = true;
  }, true);
  this.svg.on("mouseup", function() {
    // if we didn't move a body, it was a normal click and we toggle the playing state
    if (!self.mouseJoint) self.toggle.apply(self);
    self.handleMouseUp.apply(self, arguments);
  }, true);
  this.svg.on("dblclick", function() {
    self.pause();
    self.reset();
  }, true);

  // setup timers
  this.interaction_timer = setInterval(function() {
    self.updateInteraction.apply(self);
  }, this.interaction_interval);

  // get position of canvas on screen and update on scrolling to get the mouse position relative to the canvas.
  this.svgg_position = this.getElementPosition(this.svgg.node());
  window.addEventListener("scroll", function() { self.svgg_position = self.getElementPosition(self.svgg.node()) });
};

SceneInteractor.prototype.getElementPosition = function(el) {
  var x = el.offsetLeft - document.documentElement.scrollLeft,
      y = el.offsetTop - document.documentElement.scrollTop;
  while (el.offsetParent) {
  	el = el.offsetParent;
    x += el.offsetLeft - el.scrollLeft;
    y += el.offsetTop - el.scrollTop;
  }
  return {x: x, y: y};
}

SceneInteractor.prototype.handleMouseUp = function(evt) {
  this.mouseDown = false;
  if (this.mouseJoint) {
    this.pscene.world.DestroyJoint(this.mouseJoint);
	  this.mouseJoint = null;
	}
}

SceneInteractor.prototype.handleMouseMove = function(evt) {
  this.mousePoint.x = (evt.clientX - this.svgg_position.x) / this.draw_scale;
  this.mousePoint.y = (evt.clientY - this.svgg_position.y) / this.draw_scale;
  if (this.mouseDown && !this.playing) {
    if (this.was_autopaused) this.play();
    else this.pscene.step();
  }
  // draw new mouse position if we would not redraw otherwise
  if (this.draw_pos && !this.mouseDown && !this.playing) this.draw();
}

/** Checks which object is at the passed position, a b2Vec2. Returns the selected body. */
SceneInteractor.prototype.getBodyAtMouse = function() {
  var aabb = new b2AABB();
  var p = this.mousePoint;
	aabb.lowerBound.Set(p.x - 0.001, p.y - 0.001);
	aabb.upperBound.Set(p.x + 0.001, p.y + 0.001);

	var body = null;
  // first search for body
	var filter = function(fixture) {
	  var b = fixture.GetBody();
  	if (b.GetType() != b2Body.b2_staticBody && fixture.GetShape().TestPoint(b.GetTransform(), p)) {
      body = b;
      return false;
    }
    return true;
  }
  this.pscene.world.QueryAABB(filter, aabb);

  return body;
}

/// Updates mouse joint target and creates it if neccessary.
/// If mouse button is not down, it will destroy the joint.
SceneInteractor.prototype.updateInteraction = function() {
  if (this.mouseDown && !this.mouseJoint) {
    var body = this.getBodyAtMouse();
    if (body) {
      var md = new b2MouseJointDef();
      md.bodyA = this.pscene.world.GetGroundBody();
      md.bodyB = body;
      md.target = this.mousePoint;
      md.collideConnected = true;
      md.maxForce = 300.0 * body.GetMass();
      this.mouseJoint = this.pscene.world.CreateJoint(md);
      body.SetAwake(true);
    }
  }
  if (this.mouseJoint) {
    if (this.mouseDown) {
      this.mouseJoint.SetTarget(this.mousePoint);
    } else {
      this.pscene.world.DestroyJoint(this.mouseJoint);
      this.mouseJoint = null;
    }
  }
}

SceneInteractor.prototype.draw = function() {
  if (!this.drawing) return;

  if (this.show_time || this.show_pos) {
    var text = '';
    if (this.show_pos && this.mousePoint) text += ' x='+this.mousePoint.x.toFixed(2) + " y=" + this.mousePoint.y.toFixed(2);
    if (this.show_time) text += ' t=' + this.pscene.getTime().toFixed(2);
    this.text_el.text(text);
  }
}

SceneInteractor.prototype.scaling = function(val) {
	if (arguments.length === 0) return this.val;
	this.scaling = val;
	this.svgg.attr('transform', 'scale(' + this.scaling + ')');
	return this;
}


