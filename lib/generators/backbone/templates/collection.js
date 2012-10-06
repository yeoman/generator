<%= _.camelize(appname) %>.Collections.<%= _.classify(name) %>Collection = Backbone.Collection.extend({

  model: <%= _.camelize(appname) %>.Models.<%= _.classify(name) %>Model

});
