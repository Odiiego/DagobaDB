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

// parents = (vertices) =>
//   E.reduce(
//     (acc, [parent, child]) =>
//       vertices.includes(child) ? acc.concat(parent) : acc,
//     [],
//   );
// children = (vertices) =>
//   E.reduce(
//     (acc, [parent, child]) =>
//       vertices.includes(parent) ? acc.concat(child) : acc,
//     [],
//   );

// console.log(children(children(children(parents(parents(parents([8])))))));

//BUILD A BETTER GRAPH

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
