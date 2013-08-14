/// Untility functions connected with random drawing of elements.
var Random = {};

/// Pass an array of N probabilities and the function will return
/// a random index in 0...N-1, picked according to the probabilities.
/// Pass normalized as true if the probs add up to 1. The default is false.
Random.weighted = function(probs, normalized) {
	var r = Math.random();
	if (!normalized) r *= probs.reduce(function(a,b){return a+b});
	var sum=probs[0];
	var idx = 0;
	while (r>sum) { idx++; sum+=probs[idx] }
	return idx;
}

/// Like Random.weighted(), but will return the element of the array
/// instead of the index. Pass an accessor functions that returns the
/// weight when passed the element.
Random.pick_weighted = function(xs, accessor, normalized) {
	return xs[Random.weighted(xs.map(accessor), normalized)];
}

/// Returns a random integer in 0...upper-1.
Random.int = function(upper) {
	return Math.floor(Math.random()*upper)
}

/// Returns a random element from the passed array.
Random.pick = function(vals) {
	return vals[Random.int(vals.length)];
}