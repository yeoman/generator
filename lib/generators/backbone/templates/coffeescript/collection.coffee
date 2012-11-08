class <%= _.camelize(appname) %>.Collections.<%= _.classify(name) %>Collection extends Backbone.Collection
  model: <%= _.camelize(appname) %>.Models.<%= _.classify(name) %>Model
