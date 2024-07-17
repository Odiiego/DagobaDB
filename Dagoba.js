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

Dagoba.addPipetype('vertex', function (graph, args, gremlin, state) {
  if (!state.vertices) state.vertices = graph.findVertices(args);
  if (!state.vertices.length) return 'done';

  const vertex = state.vertices.pop();
  return Dagoba.makeGremlin(vertex, gremlin.state);
});

Dagoba.addPipetype('out', Dagoba.simpleTraversal('out'));
Dagoba.addPipetype('in', Dagoba.simpleTraversal('in'));

Dagoba.simpleTraversal = function (dir) {
  const find_method = dir == 'out' ? 'findOutEdges' : 'findInEdges';
  const edge_list = dir == 'out' ? '_in' : '_out';

  return function (graph, args, gremlin, state) {
    if (!gremlin && (!state.edges || !state.edges.length)) return 'pull';
    if (!state.edges || !state.edges.length) {
      state.gremlin = gremlin;
      state.edges = graph[find_method](gremlin.vertex).filter(
        Dagoba.filterEdges(args[0]),
      );
    }
    if (!state.edges.length) return 'pull';

    const vertex = state.edges.pop()[edge_list];
    return Dagoba.gotoVertex(state.gremlin, vertex);
  };
};

Dagoba.addPipetype('property', function (graph, args, gremlin, state) {
  if (!gremlin) return 'pull';
  gremlin.result = gremlin.vertex[args[0]];
  return gremlin.result == null ? false : gremlin;
});

Dagoba.addPipetype('unique', function (graph, args, gremlin, state) {
  if (!gremlin) return 'pull';
  if (state[gremlin.vertex._id]) return 'pull';

  state[gremlin.vertex._id] = true;
  return gremlin;
});

Dagoba.addPipetype('filter', function (graph, args, gremlin, state) {
  if (!gremlin) return 'pull';

  if (typeof args[0] == 'object')
    return Dagoba.objectFilter(gremlin.vertex, args[0]) ? gremlin : pull;

  if (typeof args[0] != 'function') {
    Dagoba.error(`Filter is not a function: ${args[0]}`);
    return gremlin;
  }

  if (!args[0](gremlin.vertex, gremlin)) return 'pull';
  return gremlin;
});

Dagoba.addPipetype('take', function (graph, args, gremlin, state) {
  state.taken = state.taken || 0;

  if (state.taken == args[0]) {
    state.taken = 0;
    return 'done';
  }

  if (!gremlin) return 'pull';
  state.taken++;
  return gremlin;
});

Dagoba.addPipetype('as', function (graph, args, gremlin, state) {
  if (!gremlin) return 'pull';

  gremlin.state.as = gremlin.state.as || {};
  gremlin.state.as[args[0]] = gremlin.vertex;
  return gremlin;
});

Dagoba.addPipetype('merge', function (graph, args, gremlin, state) {
  if (!state.vertices && !gremlin) return 'pull';

  if (!state.vertices || !state.vertices.length) {
    const obj = (gremlin.state || {}).as || {};
    state.vertices = args
      .map(function (id) {
        return obj[id];
      })
      .filter(Boolean);
  }

  if (!state.vertices.length) return 'pull';

  const vertex = state.vertices.pop();
  return Dagoba.makeGremlin(vertex, gremlin.state);
});

Dagoba.addPipetype('except', function (graph, args, gremlin, state) {
  if (!gremlin) return 'pull';
  if (gremlin.vertex == gremlin.state.as[args[0]]) return 'pull';
  return gremlin;
});

Dagoba.addPipetype('back', function (graph, args, gremlin, state) {
  if (!gremlin) return 'pull';
  return Dagoba.gotoVertex(gremlin, gremlin.state.as[args[0]]);
});

Dagoba.makeGremlin = function (vertex, state) {
  return { vertex: vertex, state: state || [] };
};

Dagoba.gotoVertex = function (gremlin, vertex) {
  return Dagoba.makeGremlin(vertex, gremlin.state);
};

Dagoba.G.findVertices = function (args) {
  if (typeof args[0] == 'object') return this.searchVertices(args[0]);
  else if (args.length == 0) return this.vertices.slice();
  else return this.findVertexByIds(args);
};

Dagoba.G.findVertexByIds = function (ids) {
  if (ids.length == 1) {
    const maybe_vertex = this.findVertexById(ids[0]);
    return maybe_vertex ? [maybe_vertex] : [];
  }

  return ids.map(this.findVertexById.bind(this)).filter(Boolean);
};

Dagoba.G.findVertexById = function (vertex_id) {
  return this.vertexIndex[vertex_id];
};

Dagoba.G.searchVertices = function (filter) {
  return this.vertices.filter(function (vertex) {
    return Dagoba.objectFilter(vertex, filter);
  });
};

Dagoba.filterEdges = function (filter) {
  return function (edge) {
    if (!filter) return true;
    if (typeof filter == 'string') return edge._label == filter;
    if (Array.isArray(filter)) return !!~filter.indexOf(edge._label);
  };
};

Dagoba.objectFilter = function (thing, filter) {
  for (const key in filter) if (thing[key] !== filter[key]) return false;
  return true;
};

Dagoba.Q.run = function () {
  this.program = Dagoba.transform(this.program);
  const max = this.program.length - 1;
  let results = [];
  let maybe_gremlin = false;
  let done = -1;
  let pc = max;

  let step, state, pipetype;

  while (done < max) {
    const ts = this.state;
    step = this.program[pc];
    state = ts[pc] = ts[pc] || {};
    pipetype = Dagoba.getPipetype(step[0]);
    maybe_gremlin = pipetype(this.graph, step[1], maybe_gremlin, state);

    if (maybe_gremlin == 'pull') {
      maybe_gremlin = false;
      if (pc - 1 > done) {
        pc--;
        continue;
      } else {
        done = pc;
      }
    }
    if (maybe_gremlin == 'done') {
      maybe_gremlin = false;
      done = pc;
    }

    pc++;
    if (pc > max) {
      if (maybe_gremlin) {
        results.push(maybe_gremlin);
        maybe_gremlin = false;
        pc--;
      }
    }
  }
  results = results.map(function (gremlin) {
    return gremlin.result != null ? gremlin.result : gremlin.vertex;
  });

  return results;
};

Dagoba.T = [];

Dagoba.addTransformer = function (fun, priority) {
  if (typeof fun != 'function')
    return Dagoba.error('Invalid transformer function');

  for (const i = 0; i < Dagoba.T.length; i++) {
    if (priority > Dagoba.T[i].priority) break;
  }

  Dagoba.T.splice(i, 0, { priority: priority, fun: fun });
};

Dagoba.transform = function (program) {
  return Dagoba.T.reduce(function (acc, transformer) {
    return transformer.fun(acc);
  }, program);
};
