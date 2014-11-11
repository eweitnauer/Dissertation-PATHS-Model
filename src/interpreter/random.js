/// Untility functions connected with random drawing of elements.
var Random = {};

/// Pass an array of N probabilities and the function will return
/// a random index in 0...N-1, picked according to the probabilities.
/// Pass normalized as true if the probs add up to 1. The default is false.
Random.weighted = function(probs, normalized) {
	var r = Math.random();
	if (!normalized) r *= probs.reduce(function(a,b){return a+b});
	var sum = 0;
	var idx = -1;
	while (r>sum) { idx++; sum+=probs[idx] }
	return idx;
}

/// Like Random.weighted(), but will return the element of the array
/// instead of the index. Pass an accessor functions that returns the
/// weight when passed the element.
/// If you know that the sum of all weights is 1, you can pass normalized
/// as true to make things more efficient.
Random.pick_weighted = function(xs, accessor, normalized) {
	if (xs.length == 0) throw "empty list";
	var idx = Random.weighted(xs.map(accessor), normalized);
	if (idx == -1) throw "sum of probabilities must be bigger than 1";
	return xs[idx];
}

/// Returns a random integer in 0...upper-1.
Random.int = function(upper) {
	return Math.floor(Math.random()*upper)
}

/// Returns a random element from the passed array.
Random.pick = function(vals) {
	if (vals.length == 0) throw "empty list";
	return vals[Random.int(vals.length)];
}

/// Picks N random elements from the passed array without
/// repetition and returns them as an array.
Random.pickN = function(n, vals) {
	if (n == 0) return [];
	if (n > vals.length) throw "N bigger than number of elements";
	var perm = Random.permutation(vals.length).slice(0,n);
	return perm.map(function (val, i) { return vals[perm[i]] });
}

/// Returns a random permuation of the numbers 0...N-1 in an array.
Random.permutation = function(N) {
  var a = [];
  for (var n=0; n<N; n++) {
    var i = Math.round(Math.random()*n);
    var v = a[i];
    a[i] = n;
    if (i != n) a[n] = v;
  }
  return a;
}

/// Creates a function uid() that returns a random hex number with 16 digets as string.
;(function() {
  var b32 = 0x100000000, f = 0xf, b = []
      str = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'];
  function uid() {
    var i = 0;
    var r = Math.random()*b32;
    b[i++] = str[r & f];
    b[i++] = str[r>>>4 & f];
    b[i++] = str[r>>>8 & f];
    b[i++] = str[r>>>12 & f];
    b[i++] = str[r>>>16 & f];
    b[i++] = str[r>>>20 & f];
    b[i++] = str[r>>>24 & f];
    b[i++] = str[r>>>28 & f];
    r = Math.random()*b32;
    b[i++] = str[r & f];
    b[i++] = str[r>>>4 & f];
    b[i++] = str[r>>>8 & f];
    b[i++] = str[r>>>12 & f];
    b[i++] = str[r>>>16 & f];
    b[i++] = str[r>>>20 & f];
    b[i++] = str[r>>>24 & f];
    b[i++] = str[r>>>28 & f];
    return "_" + b.join("");
  };
  Random.uid = uid;
})();
