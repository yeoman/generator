
var path    = require('path');
var helpers = require('<%= pkg %>').test;

describe('<%= grunt.util._.classify(name) %> generator test', function() {
  before(helpers.before(path.join(__dirname, './temp')));

  it('runs sucessfully', function(done) {
    helpers.runGenerator('<%= name %>', done);
  });

  it('creates expected files', function() {
  <% if(files) {%> <% files.forEach(function(f) { %>
    helpers.assertFile('<%= f %>');
  <% });%><% } else {%>
    // Use helpers.assertFile() to help you test the output of your generator
    //
    // Example:
    //
    //    // check file exists
    //    helpers.assertFile('app/model/post.js');
    //    // Check content
    //    helpers.assertFile('app/model/post.js', /Backbone\.model/);
    it('should create expected files');
  <% } %>
  });
});
