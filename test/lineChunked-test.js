/* eslint-disable */
const tape = require('tape');
const transition = require('d3-transition');
const select = require('d3-selection').select;
const jsdom = require('jsdom');
const lineChunked = require('../').lineChunked;

const definedLineClass = '.d3-line-chunked-defined';
const undefinedLineClass = '.d3-line-chunked-undefined';
const definedPointClass = '.d3-line-chunked-defined-point';

function lengthOfPath(path) {
  const d = path.attr('d');
  if (d == null || !d.length) {
    return 0;
  }

  // only count M and L since we are using curveLinear
  return d.split(/(?=[ML])/).length;
}

function rectDimensions(rect) {
  rect = select(rect);
  return {
    x: rect.attr('x'),
    y: rect.attr('y'),
    width: rect.attr('width'),
    height: rect.attr('height')
  };
}

// NOTE: stroke-width 0 is used in the tests to prevent accounting for the stroke-width adjustments
// added in https://github.com/pbeshai/d3-line-chunked/issues/2

tape('lineChunked() getter and setters work', function (t) {
  const chunked = lineChunked();

  t.equal(chunked.x(1).x()(9), 1, 'x makes constant function');
  t.equal(chunked.x(d => 2 * d).x()(2), 4, 'x sets function');
  t.equal(chunked.y(1).y()(9), 1, 'y makes constant function');
  t.equal(chunked.y(d => 2 * d).y()(2), 4, 'y sets function');
  t.equal(chunked.defined(false).defined()(9), false, 'defined makes constant function');
  t.equal(chunked.defined(d => d > 4).defined()(5), true, 'defined sets function');
  t.equal(chunked.isNext(false).isNext()(3), false, 'isNext makes constant function');
  t.equal(chunked.isNext(d => d > 4).isNext()(3), false, 'isNext sets function');
  t.equal(chunked.curve(d => 5).curve()(3), 5, 'curve sets function');
  t.deepEqual(chunked.lineStyles({ fill: 'red' }).lineStyles(), { fill: 'red' }, 'lineStyles sets object');
  t.deepEqual(chunked.lineAttrs({ fill: 'red' }).lineAttrs(), { fill: 'red' }, 'lineAttrs sets object');
  t.deepEqual(chunked.gapStyles({ fill: 'red' }).gapStyles(), { fill: 'red' }, 'gapStyles sets object');
  t.deepEqual(chunked.gapAttrs({ fill: 'red' }).gapAttrs(), { fill: 'red' }, 'gapAttrs sets object');
  t.deepEqual(chunked.pointStyles({ fill: 'red' }).pointStyles(), { fill: 'red' }, 'pointStyles sets object');
  t.deepEqual(chunked.pointAttrs({ fill: 'red' }).pointAttrs(), { fill: 'red' }, 'pointAttrs sets object');
  t.equal(chunked.transitionInitial(false).transitionInitial(), false, 'transitionInitial sets boolean');

  t.end();
});
/*
<path clip-path="url(#my-clip-path)" d="M0,1L0,2" fill="none" stroke="#222" stroke-width="1.5" stroke-opacity="1" class="d3-line-chunked-defined" />
<path d="M0,1L0,2" fill="none" stroke="#222" stroke-width="1.5" stroke-opacity="0.2" stroke-dasharray="2 2" class="d3-line-chunked-undefined" />
<circle ...>
<defs><clippath id="my-clip-path"><rect x="0" width="0" y="1" height="2"></rect></clippath></defs>
*/

tape('lineChunked() with empty data', function (t) {
  const document = jsdom.jsdom();
  const g = select(document.body).append('svg').append('g');

  const chunked = lineChunked();
  const data = [];

  g.datum(data).call(chunked);
  // console.log(g.node().innerHTML);

  t.equal(0, lengthOfPath(g.select(definedLineClass)));
  t.equal(0, lengthOfPath(g.select(undefinedLineClass)));
  t.ok(g.select(definedPointClass).empty());
  t.ok(g.selectAll('clipPath').selectAll('rect').empty());

  t.end();
});


tape('lineChunked() with one data point', function (t) {
  const document = jsdom.jsdom();
  const g = select(document.body).append('svg').append('g');

  const chunked = lineChunked();
  const data = [[0, 1]];

  g.datum(data).call(chunked);
  // console.log(g.node().innerHTML);

  t.equal(1, lengthOfPath(g.select(definedLineClass)));
  t.equal(1, lengthOfPath(g.select(undefinedLineClass)));
  t.equal(1, g.select(definedPointClass).size());
  t.equal(1, g.selectAll('clipPath').selectAll('rect').size());

  t.end();
});

tape('lineChunked() with many data points', function (t) {
  const document = jsdom.jsdom();
  const g = select(document.body).append('svg').append('g');

  const chunked = lineChunked().lineAttrs({ 'stroke-width': 0 });
  const data = [[0, 1], [1, 2], [2, 1]];

  g.datum(data).call(chunked);
  // console.log(g.node().innerHTML);

  t.equal(3, lengthOfPath(g.select(definedLineClass)));
  t.equal(3, lengthOfPath(g.select(undefinedLineClass)));
  t.equal(0, g.select(definedPointClass).size());
  const rects = g.selectAll('clipPath').selectAll('rect');
  t.equal(1, rects.size());
  t.deepEqual({ x: '0', width: '2', y: '1', height: '1' }, rectDimensions(rects.nodes()[0]));

  t.end();
});

tape('lineChunked() with many data points and some undefined', function (t) {
  const document = jsdom.jsdom();
  const g = select(document.body).append('svg').append('g');

  const chunked = lineChunked()
    .lineAttrs({ 'stroke-width': 0 })
    .defined(d => d[1] !== null);

  const data = [[0, 1], [1, 2], [2, null], [3, null], [4, 1], [5, null], [6, 2], [7, 3]];

  g.datum(data).call(chunked);
  // console.log(g.node().innerHTML);

  t.equal(5, lengthOfPath(g.select(definedLineClass)), 5);
  t.equal(5, lengthOfPath(g.select(undefinedLineClass)), 5);
  t.equal(1, g.select(definedPointClass).size());

  const rects = g.selectAll('clipPath').selectAll('rect');
  t.equal(3, rects.size(), 3);
  t.deepEqual({ x: '0', width: '1', y: '1', height: '2' }, rectDimensions(rects.nodes()[0]));
  t.deepEqual({ x: '4', width: '0', y: '1', height: '2' }, rectDimensions(rects.nodes()[1]));
  t.deepEqual({ x: '6', width: '1', y: '1', height: '2' }, rectDimensions(rects.nodes()[2]));

  t.end();
});



tape('lineChunked() stroke width clipping adjustments', function (t) {
  const document = jsdom.jsdom();
  const g = select(document.body).append('svg').append('g');

  const chunked = lineChunked()
    .lineAttrs({ 'stroke-width': 2 })
    .defined(d => d[1] !== null);

  const data = [[0, 1], [1, 2], [2, null], [3, null], [4, 1], [5, null], [6, 2], [7, 3]];

  g.datum(data).call(chunked);
  // console.log(g.node().innerHTML);

  t.equal(5, lengthOfPath(g.select(definedLineClass)), 5);
  t.equal(5, lengthOfPath(g.select(undefinedLineClass)), 5);
  t.equal(1, g.select(definedPointClass).size());

  const rects = g.selectAll('clipPath').selectAll('rect');
  t.equal(3, rects.size(), 3);
  t.deepEqual({ x: '-2', width: '3', y: '-1', height: '6' }, rectDimensions(rects.nodes()[0]));
  t.deepEqual({ x: '4', width: '0', y: '-1', height: '6' }, rectDimensions(rects.nodes()[1]));
  t.deepEqual({ x: '6', width: '3', y: '-1', height: '6' }, rectDimensions(rects.nodes()[2]));

  t.end();
});


tape('lineChunked() when context is a transition', function (t) {
  const document = jsdom.jsdom();
  const g = select(document.body).append('svg').append('g');

  const chunked = lineChunked()
    .lineAttrs({ 'stroke-width': 0 })
    .defined(d => d[1] !== null);

  const data = [[0, 1], [1, 2], [2, null], [3, null], [4, 1], [5, null], [6, 2], [7, 3]];

  g.datum(data).transition().duration(0).call(chunked);
  // console.log(g.node().innerHTML);

  t.equal(5, lengthOfPath(g.select(definedLineClass)), 5);
  t.equal(5, lengthOfPath(g.select(undefinedLineClass)), 5);
  t.equal(1, g.select(definedPointClass).size());

  const rects = g.selectAll('clipPath').selectAll('rect');
  t.equal(3, rects.size(), 3);
  t.deepEqual({ x: '0', width: '1', y: '1', height: '2' }, rectDimensions(rects.nodes()[0]));
  t.deepEqual({ x: '4', width: '0', y: '1', height: '2' }, rectDimensions(rects.nodes()[1]));
  t.deepEqual({ x: '6', width: '1', y: '1', height: '2' }, rectDimensions(rects.nodes()[2]));

  t.end();
});


tape('lineChunked() - defined and isNext can set gaps in data', function (t) {
  const document = jsdom.jsdom();
  const gDefined = select(document.body).append('svg').append('g');

  const chunkedDefined = lineChunked()
    .lineAttrs({ 'stroke-width': 0 })
    .defined(d => d[1] !== null);

  const dataDefined = [[0, 1], [1, 2], [2, null], [3, null], [4, 1], [5, null], [6, 2], [7, 3]];
  gDefined.datum(dataDefined).call(chunkedDefined);

  const gIsNext = select(document.body).append('svg').append('g');

  const chunkedIsNext = lineChunked()
    .lineAttrs({ 'stroke-width': 0 })
    .isNext((prev, curr) => curr[0] === prev[0] + 1);

  const dataIsNext = [[0, 1], [1, 2], [4, 1], [6, 2], [7, 3]];
  gIsNext.datum(dataIsNext).call(chunkedIsNext);

  // should produce the same clip paths
  const rectsDefined = gDefined.selectAll('clipPath').node().innerHTML;
  const rectsIsNext = gIsNext.selectAll('clipPath').node().innerHTML;
  t.equal(rectsDefined, rectsIsNext);

  t.end();
});

