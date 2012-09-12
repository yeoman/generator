<%= grunt.util._.classify(appname) %>.<%= grunt.util._.classify(name) %>View = Ember.View.extend({
  templateName: '<%= grunt.util._.underscored(name) %>'
});
