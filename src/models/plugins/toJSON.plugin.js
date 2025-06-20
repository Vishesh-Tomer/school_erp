const toJSON = (schema) => {
  let transform;
  if (schema.options.toJSON && schema.options.toJSON.transform) {
    transform = schema.options.toJSON.transform;
  }

  schema.options.toJSON = Object.assign(schema.options.toJSON || {}, {
    transform(doc, ret, options) {
      Object.keys(schema.paths).forEach((path) => {
        if (schema.paths[path].options && schema.paths[path].options.private) {
          const pathArray = path.split('.');
          let current = ret;
          for (let i = 0; i < pathArray.length - 1; i++) {
            if (!current[pathArray[i]]) {
              return;
            }
            current = current[pathArray[i]];
          }
          delete current[pathArray[pathArray.length - 1]];
        }
      });

      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;
      if (transform) {
        return transform(doc, ret, options);
      }
    }
  });
};

module.exports = toJSON;