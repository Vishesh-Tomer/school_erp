const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const schoolSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

schoolSchema.plugin(toJSON);

const SchoolModel = mongoose.model('School', schoolSchema);

module.exports = SchoolModel;