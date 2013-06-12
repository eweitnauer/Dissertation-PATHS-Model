/// Copyright by Erik Weitnauer, 2013.

/// Visualize a scene as svg and augment it with information of a SceneNode.
var SceneVisualizer = function(scene, scene_node, svg, scaling) {
	this.scene = scene;
	this.sn = scene_node;
	this.svg = svg;
	this.svgg = d3.select(svg).append('g').attr("transform", "scale(" + scaling + ")");
	this.scaling = scaling || 1;
	this.selected = [];
	this.value_getter = null;
	this.group_getter = null;
	//this.color_scale = d3.scale.linear().domain([0, 50, 100]).range(['steelblue', 'white', 'pink']);
	this.metric_color_scale = d3.scale.pow().exponent(1.5).domain([0, 100]).range(['white', 'red']);
	this.ordinal_color_scale = d3.scale.category10();
	this.highlight_mode = 'values'; // 'values' or 'groups' or 'none'
}

SceneVisualizer.prototype.colorize_values = function(value_getter) {
	this.highlight_mode = 'values';
	if (value_getter) this.value_getter = value_getter;
	this.draw_scene();
}

SceneVisualizer.prototype.colorize_groups = function(group_getter) {
	this.highlight_mode = 'groups';
	this.group_getter = group_getter;
	this.draw_scene();
}

SceneVisualizer.prototype.toggleSelection = function(node) {
	var new_sel;
	if (this.selected.indexOf(node) != -1) {
		new_sel = this.selected.filter(function (n) { return n!==node });
	} else {
		new_sel = this.selected.slice();
		new_sel.push(node);
	}
	this.selectShapes(new_sel);
}

SceneVisualizer.prototype.selectShapes = function(shapes) {
	for (var i=0; i<this.selected.length; i++) this.selected[i].selected = false;
	this.selected = shapes;
	for (var i=0; i<this.selected.length; i++) this.selected[i].selected = true;
	this.svgg.selectAll('.shape')
	    .classed('selected', function (d) { return d.selected });
}

SceneVisualizer.prototype.draw_scene = function() {
	var thiz = this;
	var add_shape = function(shape) {
		var el = d3.select(this);
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
		  	if (d3.event.shiftKey) thiz.toggleSelection(d);
		  	else thiz.selectShapes([d]);
		  	if (thiz.value_getter) console.log(thiz.value_getter(d));
		  	console.log(d.object_node.describe());
		  });
	}
	var add_text = function(container) {
		container
		.filter(function (d) { return d.movable })
		.append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .text(function (d) { return d.id });
	}

	// select
	d3.select(this.svg).attr('pointer-events', 'visible').on('click', function () { thiz.selectShapes([]) });
	var gs = this.svgg.attr('pointer-events', 'visiblePainted')
		  .selectAll('.shape-container-pos')
		 	.data(this.scene.shapes, function(shape) { return shape.id });
	// enter
	var g_pos = gs.enter()
	  .append('g')
		.classed('shape-container-pos', true);
	g_pos
		.append('g')
		.classed('shape-container-rot', true)
		.each(add_shape);
	g_pos.call(add_text);

	// update
	gs.attr('transform', function (d) { return "translate(" + d.x + "," +  d.y + ")" });
	gs.select('.shape-container-rot').attr('transform', function (d) { return "rotate(" + d.rot*180/Math.PI + ")" });
	gs.select('.shape')
	  .classed('unseen', function (d) { return d.obj_node == undefined });
	if (this.highlight_mode == 'values' && this.value_getter) {
		gs.select('.shape')
		  .filter(function(d) {return d.movable})
			.style('fill', function (d) { return thiz.metric_color_scale(thiz.value_getter(d)) })
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

	// color scene background according to 'fits_solution' attribute
	var color = 'none';
	if (this.sn.fits_solution === true) color = '#efe';
	else if (this.sn.fits_solution === false) color = '#fee';
	d3.select(this.svg).style('background-color', color);//typeof(this.sn.fits_solution) === 'undefined' ? 'none'
		                                  //: this.sn.fits_solution ? 'green' : 'rgba(255,0,0,0.2)');
}

// SVGScene.prototype.renderInSvg = function(doc, parent, x, y, scale, show_numbers) {
//   var g = doc.createElementNS('http://www.w3.org/2000/svg','g');
//   g.setAttribute('transform', 'translate('+(x)+','+(y)+') scale('+scale+')');
//   parent.appendChild(g);
//   var rect = doc.createElementNS('http://www.w3.org/2000/svg','rect');
//   // rect.setAttribute('x',0);
//   // rect.setAttribute('y',0);
//   // rect.setAttribute('width', this.height);
//   // rect.setAttribute('height', this.width);
//   // rect.setAttribute('style','fill:none; stroke:black; stroke-width:1px');
//   // g.appendChild(rect);
//   for (var i = 0; i < this.shapes.length; i++) {
//     var shape = this.shapes[i];
//     var svg_obj = shape.renderInSvg(document, g);
//     for (var s in shape.style) svg_obj.style.setProperty(s, shape.style[s]);
//     if (show_numbers && this.shapes[i].movable) {
//       d3.select(parent).append('text').style('fill', 'black')
//         .attr('x', shape.x*scale).attr('y', shape.y*scale)
//         .attr('text-anchor', 'middle')
//         .attr('dominant-baseline', 'central').text(i);
//     }
//   };
// }