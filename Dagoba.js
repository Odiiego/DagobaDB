// V = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
// E = [
//   [1, 2],
//   [1, 3],
//   [2, 4],
//   [2, 5],
//   [3, 6],
//   [3, 7],
//   [4, 8],
//   [4, 9],
//   [5, 10],
//   [5, 11],
//   [6, 12],
//   [6, 13],
//   [7, 14],
//   [7, 15],
// ];

Dagoba.G = {};

Dagoba.graph = function (V, E) {
  const graph = Object.create(Dagoba.G);

  graph.edges = [];
  graph.vertices = [];
  graph.vertexIndex = {};

  graph.autoid = 1;

  if (Array.isArray(V)) graph.addVertices(V);
  if (Array.isArray(E)) graph.addEdges(E);

  return graph;
};

Dagoba.G.addVertices = function (vs) {
  vs.forEach(this.addVertex.bind(this));
};

Dagoba.G.addEdges = function (es) {
  es.forEach(this.addEdge.bind(this));
};

Dagoba.G.addVertex = function (vertex) {
  if (!vertex._id) vertex._id = this.autoid++;
  else if (this.findVertexById(vertex._id))
    return Dagoba.error('A vertex with that ID already exists');

  this.vertices.push(vertex);
  this.vertexIndex[vertex._id] = vertex;
  vertex._out = [];
  vertex._in = [];
  return vertex._id;
};

Dagoba.G.addEdge = function (edge) {
  edge._in = this.findVertexById(edge._in);
  edge._out = this.findVertexById(edge._out);

  if (!(edge._in && edge._out))
    return Dagoba.error(
      `Thats edge's ${edge._in ? 'out' : 'in'} vertex wasn't found`,
    );

  edge._out._out.push(edge);
  edge._in._in.push(edge);

  this.edges.push(edge);
};

Dagoba.error = function (msg) {
  console.log(msg);
  return false;
};

Dagoba.Q = {};

Dagoba.query = function (graph) {
  const query = Object.create(Dagoba.Q);

  query.graph = graph;
  query.state = [];
  query.program = [];
  query.gremlins = [];

  return query;
};

Dagoba.Q.add = function (pipetype, args) {
  const step = [pipetype, args];
  this.program.push(step);
  return this;
};

Dagoba.G.v = function () {
  const query = Dagoba.query(this);
  query.add('vertex', [].slice.call(arguments));
  return query;
};

Dagoba.Pipetypes = {};

Dagoba.addPipetype = function (name, fun) {
  Dagoba.Pipetypes[name] = fun;
  Dagoba.Q[name] = function () {
    return this.add(name, [].slice.apply(arguments));
  };
};

Dagoba.getPipetype = function (name) {
  const pipetype = Dagoba.Pipetypes[name];
  if (!pipetype) Dagoba.error(`Unreconized pipetype: ${name}`);

  return pipetype || Dagoba.fauxPipetype;
};

Dagoba.fauxPipetype = function (_, _, maybe_gremlin) {
  return maybe_gremlin || 'pull';
};
