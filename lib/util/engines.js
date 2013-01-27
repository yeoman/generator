var _ = require('lodash');

// TODO(mklabs):
// - handle cache
// - implement adpaters for others engines (but do not add hard deps on them,
// should require manual install for anything that is not an underscore
// template)

// engines
var engines = module.exports;

engines.underscore = function underscore(source, data) {
  return _.template(source)(data);
};

engines.underscore.detect = function detect(body) {
  return (/<%=?\s*[^\s]+\s*%>/).test(body);
};
