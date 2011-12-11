Backbone.MappedModel = Backbone.Model.extend({

   "constructor": function(attributes, options) {
      if (this.mapping != null) {
         this.mapping = {
            "definition": this.mapping,
            "properties": {}
         }
         // instantiate mapped models
         var self = this;
         _.each(_.keys(this.mapping.definition), function(key) {
            var instance = self.mapping.properties[key] = new self.mapping.definition[key]();
            // enable event bubbling - both child models and collections trigger
            // a "change" event (collections do whenever one of their models are changed)
            instance.bind("change", function() {
               self.change();
            });
            if (instance instanceof Backbone.Collection) {
               // trigger "change" event on the parent model if one of the
               // child collections changes
               instance.bind("add", function() {
                  self.change();
               });
               instance.bind("remove", function() {
                  self.change();
               });
            }
         });
      }
      // call the backbone model constructor in the context of this one
      Backbone.Model.prototype.constructor.apply(this, arguments);
   }
});

Backbone.MappedModel.prototype.get = function(name) {
   return this.mapping.properties[name] ||
            Backbone.Model.prototype.get.call(this, name);
};

Backbone.MappedModel.prototype.set = function(attributes, options) {
   if (!_.isEmpty(attributes)) {
      // loop over all mapping definitions and either instantiate the mapped
      // model/collection or reset it
      for (var key in this.mapping.definition) {
         var ModelConstructor = this.mapping.definition[key];
         if (attributes[key] != null) {
            var instance = this.mapping.properties[key];
            var value = attributes[key];
            if (typeof(instance.reset) === "function") {
               // collection
               instance.reset(value, options);
            } else {
               // model
               instance.set(value, options);
            }
            // remove the attributes key since it's now managed by
            // mapped model/collection
            delete attributes[key];
         } else if (this.mapping.properties[key] == undefined) {
             this.mapping.properties[key] = new ModelConstructor();
         }
      }
   }
   if (!_.isEmpty(attributes)) {
      Backbone.Model.prototype.set.call(this, attributes, options);
   }
   return attributes;
};

Backbone.MappedModel.prototype.toJSON = function() {
   var result = _.clone(this.attributes);
   for (var key in this.mapping.properties) {
      result[key] = this.mapping.properties[key].toJSON();
   }
   return result;
};

Backbone.MappedModel.prototype.clone = function() {
   var clone = new this.constructor();
   clone.set(this.toJSON());
   return clone;
};
