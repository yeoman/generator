window.<%= grunt.util._.camelize(appname) %> =
  Models: {}
  Collections: {}
  Views: {}
  Routers: {}
  init: ->
    console.log 'Hello from Backbone!'



$ ->
  <%= grunt.util._.camelize(appname) %>.init();
