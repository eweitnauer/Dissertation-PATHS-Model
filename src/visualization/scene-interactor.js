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
	this.vis_scaling = 1;
	this.selected = [];
	this.value_getter = null;
	this.group_getter = null;
	this.metric_color_scale = d3.scale.pow().exponent(1.5).domain([0, 100]).range(['white', '#888']);
	this.ordinal_color_scale = d3.scale.category10();
	this.highlight_mode = 'values'; // 'values' or 'groups' or 'none'

	this.step_interval = 1000/30;        // frequency of stepping the scene when playing in ms
  this.interaction_interval = 1000/30; // frequency of updating the mouse interaction in ms
  this.show_time = true;               // displays current time
  this.show_pos = false;               // displays mouse pos. in world coordinates
  this.playing = false;
  this.drawing = true;
  this.auto_pause = false;
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
	this.updatePlayButton();
}

SceneInteractor.prototype.play = function() {
  if (this.playing) return;
  var self = this;
  self.was_autopaused = false;
  this.step_timer = setInterval(function() {
    self.pscene.step();
    if (self.auto_pause && self.pscene.countAwake() === 0) {
      self.pause();
      self.was_autopaused = true;
    }
  }, this.step_interval);
  this.playing = true;
  this.updatePlayButton();
}

SceneInteractor.prototype.toggle = function() {
	console.log('toggling');
  if (this.playing) this.pause();
  else this.play();
  console.log(this.playing);
}

SceneInteractor.prototype.reset = function() {
  this.pscene.reset();
}

SceneInteractor.prototype.init = function() {
  var self = this;
  this.pscene.onWorldChange.addListener(function() { self.draw.apply(self) });

  this.addControls();

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
  this.svg.on("mouseover", this.showControls.bind(this));
  this.svg.on("mouseout", this.hideControls.bind(this));
  // this.svg.on("mousemove", function() {
  //   self.handleMouseMove.apply(self, arguments);
  // }, true);
  // this.svg.on("mousedown", function() {
  //   self.mouseDown = true;
  // }, true);
  // this.svg.on("mouseup", function() {
  //   // if we didn't move a body, it was a normal click and we toggle the playing state
  //   //if (!self.mouseJoint) self.toggle.apply(self);
  //   self.handleMouseUp.apply(self, arguments);
  // }, true);
  // this.svg.on("dblclick", function() {
  //   self.pause();
  //   self.reset();
  // }, true);

  // setup timers
  this.interaction_timer = setInterval(function() {
    self.updateInteraction.apply(self);
  }, this.interaction_interval);

  // get position of canvas on screen and update on scrolling to get the mouse position relative to the canvas.
  this.svgg_position = this.getElementPosition(this.svgg.node());
  window.addEventListener("scroll", function() { self.svgg_position = self.getElementPosition(self.svgg.node()) });
};

SceneInteractor.prototype.addControls = function() {
	var thiz = this;
	this.play_btn = this.svg.append('g').attr('transform', 'translate(15,15)')
	  .attr('visibility', 'hidden')
	  .on('click', this.toggle.bind(this));
	this.play_btn.append('circle')
	    .attr({fill: '#85A1C8', r: 10});
	this.play_btn.append('path')
	    .attr({d: 'M-3,-4 L5,0 L-3,4 Z', fill: 'white'});
	this.play_btn.append('rect')
	    .attr({x: -4, y: -4, width: 3, height: 8, fill: 'white', visibility: 'hidden'});
	this.play_btn.append('rect')
	    .attr({x: 1, y: -4, width: 3, height: 8, fill: 'white', visibility: 'hidden'});
	this.reset_btn = this.svg.append('g').attr('transform', 'translate(40,15)')
	  .on('click', function() { thiz.pause(); thiz.reset() })
	  .attr('visibility', 'hidden');
	this.reset_btn.append('circle')
	    .attr({fill: '#85A1C8', r: 10});
	this.reset_btn.append('rect')
		  .attr({ x: -3.5, y: -3.5, width: 7, height: 7, fill: 'white'});
}

SceneInteractor.prototype.showControls = function() {
	this.play_btn.attr('visibility', 'visible');
	this.reset_btn.attr('visibility', 'visible');
}

SceneInteractor.prototype.hideControls = function() {
	this.play_btn.attr('visibility', 'hidden');
	this.reset_btn.attr('visibility', 'hidden');
}

SceneInteractor.prototype.updatePlayButton = function() {
	this.play_btn.select('path')
	    .attr('visibility', this.playing ? 'hidden' : 'visible');
	this.play_btn.selectAll('rect')
	    .attr('visibility', this.playing ? 'visible' : 'hidden');
}

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

SceneInteractor.prototype.addShape = function(container, shape) {
	var el = d3.select(container);
	var self = this;
	var se;
	if (shape instanceof Circle) {
		se = el.append('svg:circle')
		       .attr('cx', 0)
		       .attr('cy', 0)
		       .attr('r', shape.r);
	} else if (shape instanceof Polygon) {
		se = shape.closed ? el.append('svg:polygon') : el.append('svg:polyline');
		se.attr('points', shape.pts.map(function (pt) { return pt.x+','+pt.y }).join(' '));
	}
	se.classed('shape', true)
	  .classed('static', function (d) { return !d.movable })
	  .classed('dynamic', function (d) { return d.movable })
	  .attr('stroke-width', function (d) { return d.style['stroke-width'] })
	  .on('click', function(d) {
	  	d3.event.stopPropagation();
	  	if (d3.event.shiftKey) self.toggleSelection(d);
	  	else self.selectShapes([d]);
	  	if (self.value_getter) console.log(self.value_getter(d.object_node));
	  	console.log("obj=", d.object_node.describe());
	  	obj = d.object_node;
	  });
}

SceneInteractor.prototype.addText = function(container) {
	container
		.filter(function (d) { return d.movable })
		.append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .text(function (d) { return d.id });
}

SceneInteractor.prototype.updateScales = function() {
	if (this.value_getter && this.highlight_mode == 'values') {
		var ext = d3.extent(this.sn.objs, this.value_getter);
  	this.metric_color_scale.domain([ext[0]/2, (100+ext[1])/2]);
	}
}

SceneInteractor.prototype.updateScene = function() {
	if (!this.drawing) return;
  this.updateScales();
	var thiz = this;

	// select
	//this.svg.attr('pointer-events', 'visible').on('click', function () { thiz.selectShapes([]) });
	var no_border = function(shape) { return shape.id !== '|' };
	var gs = this.svgg.attr('pointer-events', 'visiblePainted')
		  .selectAll('.shape-container-pos')
		 	.data( this.scene.shapes.filter(no_border)
		 		   , function(shape) { return shape.id });

	// enter
	var g_pos = gs.enter()
	  .append('g')
		.classed('shape-container-pos', true);
	g_pos
		.append('g')
		.classed('shape-container-rot', true)
		.each(function(shape) { thiz.addShape(this, shape) });
	g_pos.call(this.addText);

	// update
	gs.attr('transform', function (d) { return "translate(" + d.x + "," +  d.y + ")" });
	gs.select('.shape-container-rot').attr('transform', function (d) { return "rotate(" + d.rot*180/Math.PI + ")" });
	gs.select('.shape')
	  .classed('unseen', function (d) { return d.object_node === undefined });
	if (this.highlight_mode == 'values' && this.value_getter) {
		gs.select('.shape')
		  .filter(function(d) {return d.movable})
			.style('fill', function (d) { return thiz.metric_color_scale(thiz.value_getter(d.object_node)) })
	} else if (this.highlight_mode == 'groups' && this.group_getter) {
		gs.select('.shape')
			.filter(function(d) {return d.movable})
		  .style('fill', function (d) { return thiz.ordinal_color_scale(thiz.group_getter(d)) })
	} else {
		gs.select('.shape')
			.filter(function(d) {return d.movable})
		  .style('fill', '#aaa');
	}

	// remove
	gs.exit().remove();

	this.svg.classed('active', this.sn.active);
	this.svg.style('background-color', null);

}

SceneInteractor.prototype.draw = function() {
  if (!this.drawing) return;
  this.updateScene();
  if (this.show_time || this.show_pos) {
    var text = '';
    if (this.show_pos && this.mousePoint) text += ' x='+this.mousePoint.x.toFixed(2) + " y=" + this.mousePoint.y.toFixed(2);
    if (this.show_time) text += ' t=' + this.pscene.getTime().toFixed(2);
    this.text_el.text(text);
  }
}

SceneInteractor.prototype.scaling = function(val) {
	if (arguments.length === 0) return this.val;
	this.vis_scaling = val;
	this.svgg.attr('transform', 'scale(' + this.vis_scaling + ')');
	return this;
}

SceneInteractor.prototype.applySelector = function(sel) {
	var gn = sel.applyToScene(this.sn);
	this.selectShapes(gn.objs);
}

SceneInteractor.prototype.applySolution = function(sol) {
	var res = sol.check_scene(this.sn);
	this.selectShapes(res.group.objs);
	//if (sol.isPotentialSolution()) {
		var color = res.match ? '#efe' : '#fee';
		this.svg.style('background-color', color);
	//}
}

SceneInteractor.prototype.colorize_values = function(value_getter) {
	this.highlight_mode = 'values';
	if (value_getter) this.value_getter = value_getter;
	this.draw();
}

SceneInteractor.prototype.colorize_groups = function(group_getter) {
	this.highlight_mode = 'groups';
	this.group_getter = group_getter;
	this.draw();
}

SceneInteractor.prototype.toggleSelection = function(node) {
	var new_sel;
	if (this.selected.indexOf(node) != -1) {
		new_sel = this.selected.filter(function (n) { return n!==node });
	} else {
		new_sel = this.selected.slice();
		new_sel.push(node);
	}
	this.selectShapes(new_sel);
}

SceneInteractor.prototype.selectShapes = function(shapes) {
	for (var i=0; i<this.selected.length; i++) this.selected[i].selected = false;
	this.selected = shapes;
	for (var i=0; i<this.selected.length; i++) this.selected[i].selected = true;
	this.svgg.selectAll('.shape')
	    .classed('selected', function (d) { return d.selected });
}
