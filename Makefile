all: pbp-model.js

#.INTERMEDIATE pbp-model.js: libs/box2dweb/Box2D.js

.INTERMEDIATE pbp-model.js: \
	libs/geom.js/point.js \
	libs/geom.js/circle.js \
	libs/geom.js/polygon.js \
	libs/geom.js/convex_decomposition.js \
	libs/geom.js/vector.js \
	libs/geom.js/matrix.js \
	libs/geom.js/spatial_relation_analyzer.js \
	libs/box2dweb/Box2D.js \
	libs/svg2physics/svg-scene-parser.js \
	libs/svg2physics/box2d-adapter.js \
	libs/svg2physics/box2d-extensions.js \
	libs/svg2physics/physics-scene.js \
	libs/svg2physics/physics-oracle.js \
	src/visualization/box2d-simulator.js \
	src/visualization/scene-visualizer.js \
	src/visualization/scene-interactor.js \
	src/features/stability-attr.js \
	src/features/movable-up-attr.js \
	src/features/shape-attr.js \
	src/features/circle-attr.js \
	src/features/square-attr.js \
	src/features/rectangle-attr.js \
	src/features/triangle-attr.js \
	src/features/moves-attr.js \
	src/features/small-attr.js \
	src/features/large-attr.js \
	src/features/left-attr.js \
	src/features/left-most-attr.js \
	src/features/right-attr.js \
	src/features/right-most-attr.js \
	src/features/bottom-attr.js \
	src/features/single-attr.js \
	src/features/top-attr.js \
	src/features/top-most-attr.js \
	src/features/on-ground-attr.js \
	src/features/left-rel.js \
	src/features/right-rel.js \
	src/features/beside-rel.js \
	src/features/below-rel.js \
	src/features/above-rel.js \
	src/features/touch-rel.js \
	src/features/ontop-rel.js \
	src/features/far-rel.js \
	src/features/far-attr.js \
	src/features/close-rel.js \
	src/features/close-attr.js \
	src/features/hits-rel.js \
	src/features/gets-hit-rel.js \
	src/features/collides-rel.js \
	src/features/supports-rel.js \
	src/features/count-attr.js \
	src/features/touch-attr.js \
	src/settings.js \
	src/events.js \
	src/interpreter/object-node.js \
	src/interpreter/group-node.js \
	src/interpreter/selector.js \
	src/interpreter/solution.js \
	src/interpreter/attention-net.js \
	src/interpreter/scene-node.js \
	src/interpreter/random.js \
	src/interpreter/workspace.js \
	src/interpreter/coderack.js \
	src/interpreter/codelets/attr-codelet.js \
	src/interpreter/codelets/check-hypothesis-codelet.js \
	src/interpreter/codelets/combine-hypothesis-codelet.js \
	src/interpreter/codelets/new-hypothesis-codelet.js \
	src/interpreter/physics-interpreter.js \
	src/interpreter/pi-tester.js \
	src/interpreter/pi-test-suite.js \
	sites/test-suite/main.js

pbp-model.js: Makefile
	@rm -f $@
	@echo "var d3 = require('d3')" > $@;
	@echo 'module.exports = (function() {' >> $@
	cat $(filter %.js,$^) >> $@
	@echo "\n return init; })();" >> $@
	@chmod a-w $@

clean:
	rm -f pbp-model.js

.PHONY: all clean
