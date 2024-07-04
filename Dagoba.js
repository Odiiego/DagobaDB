V = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
E = [
  [1, 2],
  [1, 3],
  [2, 4],
  [2, 5],
  [3, 6],
  [3, 7],
  [4, 8],
  [4, 9],
  [5, 10],
  [5, 11],
  [6, 12],
  [6, 13],
  [7, 14],
  [7, 15],
];

parents = (vertices) =>
  E.reduce(
    (acc, [parent, child]) =>
      vertices.includes(child) ? acc.concat(parent) : acc,
    [],
  );
children = (vertices) =>
  E.reduce(
    (acc, [parent, child]) =>
      vertices.includes(parent) ? acc.concat(child) : acc,
    [],
  );

console.log(children(children(children(parents(parents(parents([8])))))));
