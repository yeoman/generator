<%= _.camelize(appname) %>.Collections.<%= _.classify(name) %>Collection = Backbone.Collection.extend({

  model: <%= _.camelize(appname) %>.<%= _.classify(name) %>Model

});
